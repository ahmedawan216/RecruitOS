import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const compile = (path) => ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
const source = compile("../lib/recruitos/candidate-extraction.ts");
const skillsModule = { exports: {} };
new Function("module", "exports", "require", compile("../lib/recruitos/skills.ts"))(skillsModule, skillsModule.exports, require);
const empty = () => ({ fullName: null, email: null, phone: null, location: null, headline: null, skills: [], experience: [], education: [], yearsExperience: null });
function harness(content, extra = {}) {
  const requests = [], logs = [];
  const loaded = { exports: {} };
  class Provider { chat = { completions: { create: async (request) => { requests.push(request); return { choices: [{ finish_reason: "stop", message: { content }, ...extra }] }; } } }; }
  new Function("module", "exports", "require", "process", "console", source)(loaded, loaded.exports, (id) => id === "openai" ? Provider : id === "@/lib/recruitos/skills" ? skillsModule.exports : require(id), { env: { GROQ_API_KEY: "test-only" } }, { error: (...args) => logs.push(args) });
  return { extract: () => loaded.exports.extractCandidateProfile("Fictional resume text"), requests, logs };
}

test("extraction requests strict nested objects and returns a validated profile", async () => {
  const profile = { ...empty(), email: " TEST@EXAMPLE.INVALID ", skills: ["Python", "Python"], experience: [{ company: null, title: "Engineer", startDate: null, endDate: null, description: "Built test tools" }], education: [{ institution: "Fictional University", degree: null, field: null, startDate: null, endDate: null }] };
  const h = harness(JSON.stringify(profile));
  const result = await h.extract();
  assert.equal(result.email, "test@example.invalid");
  assert.deepEqual(result.skills, ["Python"]);
  assert.deepEqual(result.experience, profile.experience);
  const request = h.requests[0];
  assert.equal(request.model, "openai/gpt-oss-120b");
  assert.equal(request.response_format.type, "json_schema");
  assert.equal(request.response_format.json_schema.strict, true);
  const schema = request.response_format.json_schema.schema;
  assert.deepEqual(schema.required, Object.keys(empty()));
  assert.equal(schema.additionalProperties, false);
  for (const [field, keys] of Object.entries({ experience: ["company", "title", "startDate", "endDate", "description"], education: ["institution", "degree", "field", "startDate", "endDate"] })) {
    const items = schema.properties[field].items;
    assert.equal(schema.properties[field].type, "array");
    assert.equal(items.type, "object");
    assert.equal(items.additionalProperties, false);
    assert.deepEqual(items.required, keys);
    for (const key of keys) assert.deepEqual(items.properties[key].type, ["string", "null"]);
  }
  assert.deepEqual(schema.properties.skills, { type: "array", items: { type: "string" } });
  assert.deepEqual(schema.properties.yearsExperience.type, ["number", "null"]);
});

test("production regression: experience strings remain rejected with sanitized diagnostics", async () => {
  const h = harness(JSON.stringify({ ...empty(), experience: ["PRIVATE A", "PRIVATE B", "PRIVATE C"] }));
  await assert.rejects(h.extract(), /unexpected candidate profile/);
  assert.deepEqual(h.logs[0][1], [0, 1, 2].map((index) => ({ path: `experience.${index}`, code: "invalid_type", expected: "object", actual: "string" })));
  assert.doesNotMatch(JSON.stringify(h.logs), /PRIVATE/);
});

test("unknown values do not fabricate candidate data", async () => {
  assert.deepEqual(await harness(JSON.stringify(empty())).extract(), empty());
  const result = await harness(JSON.stringify({ skills: [], experience: [{}], education: [{}] })).extract();
  assert.equal(result.fullName, null);
  assert.equal(result.yearsExperience, null);
  assert.ok(Object.values(result.experience[0]).every((value) => value === null));
  assert.ok(Object.values(result.education[0]).every((value) => value === null));
});

test("existing deterministic description normalization remains supported", async () => {
  const result = await harness(JSON.stringify({ ...empty(), experience: [{ description: ["First", "Second"] }] })).extract();
  assert.equal(result.experience[0].description, "First\nSecond");
});

test("equivalent collection and scalar contract violations remain rejected", async () => {
  for (const change of [{ education: ["PRIVATE"] }, { skills: [123] }, { experience: null }, { education: null }, { skills: null }, { yearsExperience: "3" }, { yearsExperience: -1 }, { experience: [{ company: 123 }] }]) {
    await assert.rejects(harness(JSON.stringify({ ...empty(), ...change })).extract(), /unexpected candidate profile/);
  }
});

test("empty, malformed, fenced, and partial JSON fail safely", async () => {
  for (const content of [null, "", "{", "```json\n{}\n```", "{}", "null"]) {
    await assert.rejects(harness(content).extract(), /AI provider returned/);
  }
});

test("truncated or refused responses cannot become profiles even with valid content", async () => {
  for (const finish_reason of ["length", "content_filter", "tool_calls"]) {
    await assert.rejects(harness(JSON.stringify(empty()), { finish_reason }).extract(), /incomplete candidate profile/);
  }
  const h = harness(null, { message: { content: JSON.stringify(empty()), refusal: "PRIVATE refusal" } });
  await assert.rejects(h.extract(), /could not extract/);
  assert.deepEqual(h.logs, []);
});
