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
