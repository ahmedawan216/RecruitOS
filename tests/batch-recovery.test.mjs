import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../app/dashboard/agents/recruitos/jobs/[jobId]/batch-upload.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
const resume = (id, extra = {}) => ({ name: `${id}.pdf`, success: true, resumeId: id, ...extra });
function harness({ results = [resume("a"), resume("b")], selected = ["a", "b"], analyze = async () => [], hydrated = true, file = null } = {}) {
  const state = [file, results, selected, hydrated, false, false, null, null];
  const calls = [];
  let cursor = 0;
  const mocks = {
    react: { ...require("react"), useState(initial) { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], (next) => { state[index] = typeof next === "function" ? next(state[index]) : next; }]; }, useEffect() {}, useRef: () => ({ current: null }) },
    "next/link": ({ href, children, ...props }) => createElement("a", { href, ...props }, children),
    "@/app/actions/batch-upload-resumes": { batchUploadResumes: async () => [] },
    "@/app/actions/batch-analyze-resumes": { batchAnalyzeResumes: async (jobId, ids) => { calls.push({ jobId, ids }); return analyze(ids, calls.length); } },
    "@/components/recruitos/usage/plan-limit-notice": { PlanLimitNotice: ({ limit }) => createElement("p", null, limit.message) },
  };
  const loadedModule = { exports: {} };
  new Function("module", "exports", "require", compiled)(loadedModule, loadedModule.exports, (id) => id in mocks ? mocks[id] : require(id));
  function render() { cursor = 0; return loadedModule.exports.default({ jobId: "owned-job" }); }
  function nodes(node) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(nodes); return [node, ...nodes(node.props?.children)]; }
  function text(node) { if (typeof node === "string" || typeof node === "number") return String(node); if (!node) return ""; if (Array.isArray(node)) return node.map(text).join(""); return text(node.props?.children); }
  return { state, calls, render, html: () => renderToStaticMarkup(render()), button: (label) => nodes(render()).find((node) => node.type === "button" && text(node) === label), input: () => nodes(render()).find((node) => node.type === "input" && node.props.type === "file") };
}

test("partial analysis failure stays visible and retry sends only uncompleted resumes", async () => {
  const h = harness({ analyze: async (ids, attempt) => attempt === 1 ? [{ resumeId: "a", success: true }, { resumeId: "b", success: false, error: "Analysis provider unavailable." }] : ids.map((resumeId) => ({ resumeId, success: true })) });
  await h.button("Analyze selected candidates").props.onClick();
  assert.deepEqual(h.state[2], ["b"]);
  assert.match(h.html(), /Analysis provider unavailable/);
  assert.match(h.html(), /role="alert"/);
  assert.match(h.html(), /Analyzed · View analysis/);
  await h.button("Retry selected analyses").props.onClick();
  assert.deepEqual(h.calls.map((call) => call.ids), [["a", "b"], ["b"]]);
  assert.ok(h.calls.every((call) => call.jobId === "owned-job"));
  assert.deepEqual(h.state[2], []);
  assert.doesNotMatch(h.html(), /provider unavailable|Retry selected/);
});

test("request exception retains resume selections and durable uncertainty feedback", async () => {
  const h = harness({ analyze: async () => { throw new Error("Network lost"); } });
  await h.button("Analyze selected candidates").props.onClick();
  assert.deepEqual(h.state[2], ["a", "b"]);
  assert.match(h.html(), /results could not be confirmed/);
  assert.equal(h.button("Retry selected analyses").props.disabled, false);
  const restored = harness({ results: JSON.parse(JSON.stringify(h.state[1])), selected: h.state[2] });
  assert.match(restored.html(), /results could not be confirmed/);
  assert.ok(restored.button("Retry selected analyses"));
});

test("plan-limit interruption retains failed and unattempted resumes without retrying successes", async () => {
  const limit = { code: "PLAN_LIMIT_REACHED", message: "Monthly analysis limit reached." };
  const h = harness({ results: [resume("a"), resume("b"), resume("c")], selected: ["a", "b", "c"], analyze: async () => [{ resumeId: "a", success: true }, { resumeId: "b", success: false, error: limit.message, limit }] });
  await h.button("Analyze selected candidates").props.onClick();
  assert.deepEqual(h.state[2], ["b", "c"]);
  assert.match(h.html(), /Monthly analysis limit reached/);
  assert.match(h.html(), /batch stopped at the plan limit/);
});

test("missing results are recoverable and stale saved selections never rerun analyzed resumes", async () => {
  const h = harness({ results: [resume("a", { analyzed: true }), resume("b")], selected: ["a", "b", "b", "missing"] });
  await h.button("Analyze selected candidates").props.onClick();
  assert.deepEqual(h.calls[0].ids, ["b"]);
  assert.deepEqual(h.state[2], ["b"]);
  assert.match(h.html(), /No completed analysis was returned/);
});

test("failed uploads do not exhaust the batch allowance; 25 successful uploads still do", () => {
  const failures = Array.from({ length: 25 }, (_, i) => ({ name: `${i}.pdf`, success: false, error: "Empty PDF" }));
  const h = harness({ results: failures, selected: [], file: { name: "retry.pdf" } });
  assert.equal(h.input().props.disabled, false);
  assert.equal(h.button("Upload and process resume").props.disabled, false);
  assert.match(h.html(), /0 \/ 25 resumes processed/);
  const full = harness({ results: Array.from({ length: 25 }, (_, i) => resume(String(i))), selected: [] });
  assert.equal(full.input().props.disabled, true);
  assert.match(full.html(), /25-resume batch limit reached/);
});

test("batch controls prevent competing uploads and selection edits while analysis is working", async () => {
  let finish;
  const h = harness({ analyze: () => new Promise((resolve) => { finish = resolve; }) });
  const request = h.button("Analyze selected candidates").props.onClick();
  assert.equal(h.input().props.disabled, true);
  assert.equal(h.button("Clear selection").props.disabled, true);
  assert.equal(h.button("Analyzing candidates...").props.disabled, true);
  finish([{ resumeId: "a", success: true }, { resumeId: "b", success: true }]);
  await request;
  assert.equal(h.input().props.disabled, false);
});

test("saved legacy error messages remain visible and resume checkboxes have stable labels", () => {
  const h = harness({ results: [resume("a", { error: "Candidate processing needs attention." })], selected: ["a"] });
  assert.match(h.html(), /Candidate processing needs attention/);
  assert.doesNotMatch(h.html(), /Processed · Ready to analyze/);
  assert.ok(h.button("Retry selected analyses"));
  assert.match(h.html(), /aria-label="Select a.pdf for analysis"/);
  const loading = harness({ hydrated: false });
  assert.equal(loading.input().props.disabled, true);
});
