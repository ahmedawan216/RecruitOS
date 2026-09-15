import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";

const nodeRequire = createRequire(import.meta.url);

function transpile(relativePath, requireMap = {}) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const loadedModule = { exports: {} };
  const localRequire = (id) => id in requireMap ? requireMap[id] : nodeRequire(id);
  new Function("exports", "module", "require", compiled.outputText)(loadedModule.exports, loadedModule, localRequire);
  return loadedModule.exports;
}

const resultModule = transpile("../lib/recruitos/result.ts");
const commandModule = transpile("../lib/recruitos/command.ts", { "@/lib/recruitos/result": resultModule });
const {
  canCancelExecution,
  commandSubmissionSchema,
  executionResultSchema,
  isTerminalExecutionStatus,
  parseRecruitingCommand,
  progressEventSchema,
  resolveJobReference,
  reviewAndRankIntentSchema,
} = commandModule;

const seniorAccountant = { id: "11111111-1111-4111-8111-111111111111", title: "Senior Accountant" };
const staffAccountant = { id: "22222222-2222-4222-8222-222222222222", title: "Staff Accountant" };

test("first-session contextual commands resolve through the selected owned job", () => {
  const examples = [
    "Compare the candidates for this role and show me the strongest matches, key strengths, and any important gaps.",
    "Review candidates for this job.",
    "Rank candidates for the current role.",
    "Find the strongest candidates for the selected position.",
    "Review these candidates.",
    "Review the strongest candidates.",
  ];
  for (const text of examples) {
    const parsed = parseRecruitingCommand(text);
    assert.equal(parsed.ok, true, text);
    assert.deepEqual(resolveJobReference([seniorAccountant, staffAccountant], parsed.value.requestedJobText, seniorAccountant.id), { status: "resolved", job: seniorAccountant }, text);
  }
});

test("contextual roles require a valid owned selection, never a guessed role", () => {
  for (const reference of ["this role", "THIS JOB", "the current role", "selected position"]) {
    assert.equal(resolveJobReference([seniorAccountant], reference).status, "not_found");
    assert.equal(resolveJobReference([seniorAccountant], reference, staffAccountant.id).status, "not_found");
    assert.equal(resolveJobReference([], reference, seniorAccountant.id).status, "not_found");
  }
});

test("context recognition does not swallow explicit titles or mixed role references", () => {
  for (const reference of ["Staff Accountant", "this role at Acme", "this role or Staff Accountant"]) {
    assert.equal(resolveJobReference([seniorAccountant, staffAccountant], reference, seniorAccountant.id).status, "scope_conflict");
  }
  assert.deepEqual(resolveJobReference([seniorAccountant, staffAccountant], "Staff Accountant"), { status: "resolved", job: staffAccountant });
  assert.equal(resolveJobReference([seniorAccountant, { ...staffAccountant, title: seniorAccountant.title }], seniorAccountant.title).status, "ambiguous");
  const blocked = parseRecruitingCommand("Compare these candidates for this role and hire the strongest candidate.");
  assert.equal(blocked.code, "CONSEQUENTIAL_ACTION");
});

test("comparison intent wins over requested gaps and uses the known candidate set", () => {
  for (const text of ["Compare these candidates", "Compare the candidates for this role and show me the strongest matches, key strengths, and any important gaps.", "Compare current candidates"]) {
    assert.deepEqual(commandModule.parseFollowUpCommand(text, 4), { ok: true, value: { intent: "compare_candidates", count: 4 }, requiresSemanticAnalysis: false });
  }
  assert.equal(commandModule.parseFollowUpCommand("Show only the gaps", 4).value.intent, "show_concerns");
  assert.equal(commandModule.parseFollowUpCommand("Compare the top 2 and show gaps", 4).value.count, 2);
  assert.equal(commandModule.parseFollowUpCommand("Compare the strongest candidates", 4).value.count, 3);
});

test("contextual comparisons preserve count bounds and consequential-action blocking", () => {
  for (const count of [undefined, 0, 1, 9, 25, 2.5, NaN]) {
    assert.equal(commandModule.parseFollowUpCommand("Compare these candidates", count).code, "AMBIGUOUS_COMPARISON");
  }
  for (const count of [2, 8]) assert.equal(commandModule.parseFollowUpCommand("Compare these candidates", count).value.count, count);
  assert.equal(commandModule.parseFollowUpCommand("Compare the top 9", 4).code, "AMBIGUOUS_COMPARISON");
  assert.equal(commandModule.parseFollowUpCommand("Compare these candidates for Staff Accountant", 4).code, "AMBIGUOUS_COMPARISON");
  assert.equal(commandModule.parseFollowUpCommand("Compare these candidates and reject the weakest", 4).code, "CONSEQUENTIAL_ACTION");
});

test("supported review commands resolve to the allowlisted intent and job", () => {
  const examples = [
    "Review applicants for Senior Accountant and prepare the strongest 8.",
    "Find the best 8 candidates for Senior Accountant.",
    "Review Senior Accountant applicants and give me the strongest 8.",
    "Prepare a shortlist of 8 for Senior Accountant.",
  ];
  for (const example of examples) {
    const parsed = parseRecruitingCommand(example);
    assert.equal(parsed.ok, true, example);
    assert.equal(parsed.value.intent, "review_and_rank_candidates");
    assert.equal(parsed.value.requestedCount, 8);
    assert.equal(parsed.value.requestedJobText, "Senior Accountant");
  }
});

test("commands without a count default to eight and invalid counts are rejected", () => {
  const defaulted = parseRecruitingCommand("Review candidates for Senior Accountant");
  assert.equal(defaulted.ok, true);
  assert.equal(defaulted.value.requestedCount, 8);

  const invalid = parseRecruitingCommand("Find the best 99 candidates for Senior Accountant");
  assert.equal(invalid.ok, false);
  assert.equal(invalid.code, "INVALID_RESULT_COUNT");
});

test("unsupported and consequential commands fail before any operation is allowlisted", () => {
  assert.equal(parseRecruitingCommand("Write a funny recruiting poem").ok, false);
  const consequential = parseRecruitingCommand("Review candidates for Senior Accountant and reject the weakest 3");
  assert.equal(consequential.ok, false);
  assert.equal(consequential.code, "CONSEQUENTIAL_ACTION");
});

test("submission and intent schemas reject malformed or authority-expanding input", () => {
  assert.equal(commandSubmissionSchema.safeParse({ commandText: "Review candidates for Senior Accountant", jobId: null, idempotencyKey: "not-a-uuid" }).success, false);
  assert.equal(reviewAndRankIntentSchema.safeParse({ intent: "run_sql", requestedCount: 8, requestedJobText: "Senior Accountant" }).success, false);
  assert.equal(reviewAndRankIntentSchema.safeParse({ intent: "review_and_rank_candidates", requestedCount: 500, requestedJobText: "Senior Accountant" }).success, false);
});

test("job resolution uses explicit owned scope, exact normalized match, and safe ambiguity", () => {
  assert.deepEqual(resolveJobReference([seniorAccountant], null, seniorAccountant.id), { status: "resolved", job: seniorAccountant });
  assert.deepEqual(resolveJobReference([seniorAccountant], "senior-accountant"), { status: "resolved", job: seniorAccountant });
  assert.equal(resolveJobReference([seniorAccountant, staffAccountant], "Accountant").status, "ambiguous");
  assert.equal(resolveJobReference([seniorAccountant], "Product Designer").status, "not_found");
});

test("a conflicting selected scope is surfaced instead of silently switching jobs", () => {
  const result = resolveJobReference([seniorAccountant, staffAccountant], "Staff Accountant", seniorAccountant.id);
  assert.equal(result.status, "scope_conflict");
});

test("execution terminal and cancellation boundaries are explicit", () => {
  for (const status of ["completed", "failed", "cancelled", "clarification_required"]) assert.equal(isTerminalExecutionStatus(status), true);
  for (const status of ["queued", "running"]) {
    assert.equal(isTerminalExecutionStatus(status), false);
    assert.equal(canCancelExecution(status), true);
  }
  assert.equal(canCancelExecution("completed"), false);
});

test("progress events allow operational status only, not hidden reasoning event kinds", () => {
  const operational = progressEventSchema.safeParse({
    id: 7,
    kind: "progress",
    message: "Using 31 existing assessments",
    data: { count: 31 },
    createdAt: new Date().toISOString(),
  });
  assert.equal(operational.success, true);
  assert.equal(progressEventSchema.safeParse({
    id: 8,
    kind: "chain_of_thought",
    message: "private reasoning",
    data: {},
    createdAt: new Date().toISOString(),
  }).success, false);
});

test("structured shortlist validation rejects malformed result shape", () => {
  const valid = executionResultSchema.safeParse({
    kind: "candidate_shortlist",
    job: seniorAccountant,
    requestedCount: 8,
    consideredCount: 1,
    rankedCount: 1,
    reusedAnalysisCount: 1,
    generatedAnalysisCount: 0,
    analysisFailureCount: 0,
    partial: false,
    candidates: [{
      rank: 1,
      candidateId: "33333333-3333-4333-8333-333333333333",
      name: "Candidate One",
      email: "candidate@example.com",
      matchScore: 88,
      recommendation: "interview",
      summary: "Evidence-backed summary",
      evidence: ["5 years of accounting experience"],
      strengths: ["Financial reporting"],
      concerns: [],
      missingSkills: [],
      yearsRelevantExperience: 5,
      recruiterStatus: "new",
      candidateHref: "/dashboard/agents/recruitos/candidates/33333333-3333-4333-8333-333333333333?jobId=11111111-1111-4111-8111-111111111111",
    }],
  });
  assert.equal(valid.success, true);
  assert.equal(executionResultSchema.safeParse({ ...valid.data, candidates: [{ rank: 1 }] }).success, false);
});
