import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function loadPureModule(relativePath) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const module = { exports: {} };
  new Function("exports", "module", "require", compiled.outputText)(module.exports, module, () => ({}));
  return module.exports;
}

const recovery = loadPureModule("../lib/recruitos/workspace-recovery.ts");
const exportModule = loadPureModule("../lib/recruitos/analysis-export.ts");
const recoveryServer = readFileSync(new URL("../lib/recruitos/workspace-recovery-server.ts", import.meta.url), "utf8");
const exportServer = readFileSync(new URL("../lib/recruitos/analysis-export-server.ts", import.meta.url), "utf8");
const surface = readFileSync(new URL("../components/recruitos/workspace/command-task-surface.tsx", import.meta.url), "utf8");
const wrapper = readFileSync(new URL("../components/recruitos/workspace/command-composer.tsx", import.meta.url), "utf8");

const result = {
  kind: "candidate_shortlist",
  job: { id: "11111111-1111-4111-8111-111111111111", title: "Senior Accountant" },
  requestedCount: 8,
  consideredCount: 12,
  rankedCount: 1,
  reusedAnalysisCount: 10,
  generatedAnalysisCount: 2,
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
    concerns: ["Limited ERP evidence"],
    missingSkills: ["SAP"],
    yearsRelevantExperience: 5,
    recruiterStatus: "new",
    candidateHref: "/dashboard/agents/recruitos/candidates/33333333-3333-4333-8333-333333333333?jobId=11111111-1111-4111-8111-111111111111",
  }],
};

test("terminal-state recovery mapping restores durable completed and truthful terminal states", () => {
  for (const status of ["completed", "failed", "cancelled", "clarification_required"]) {
    assert.equal(recovery.getExecutionRecoveryMode(status), "restore");
  }
  assert.equal(recovery.getExecutionRecoveryMode("queued"), "resume");
  assert.equal(recovery.getExecutionRecoveryMode("running"), "resume");
  assert.equal(recovery.getExecutionRecoveryMode("unknown"), "none");
});

test("New task dismissal marker suppresses restoration without deleting durable history", () => {
  assert.equal(recovery.isWorkspaceExecutionDismissed({}), false);
  assert.equal(recovery.isWorkspaceExecutionDismissed({ workspaceDismissedAt: "2026-09-09T10:00:00.000Z" }), true);
  assert.match(recoveryServer, /workspaceDismissedAt/);
  assert.doesNotMatch(recoveryServer, /\.delete\(/);
  assert.match(surface, /\/dismiss/);
});

test("latest execution restoration is newest-first and strictly owner scoped", () => {
  assert.match(recoveryServer, /\.eq\("user_id", userId\)/);
  assert.match(recoveryServer, /\.order\("created_at", \{ ascending: false \}\)/);
  assert.match(recoveryServer, /\.limit\(1\)/);
  assert.match(wrapper, /getLatestWorkspaceExecution\(user\.id\)/);
});

test("completed result is hydrated from the server and running execution keeps the existing resume loop", () => {
  assert.match(surface, /useState<ExecutionSnapshot \| null>\(initialExecution \?\? null\)/);
  assert.match(surface, /isTerminalExecutionStatus\(execution\.status\)/);
  assert.match(surface, /\/advance/);
  assert.match(surface, /refreshExecution\(execution\.id\)/);
});

test("analysis export is built from the real structured result and recruiter-facing fields", () => {
  const html = exportModule.renderAnalysisHtml({
    commandText: "Review applicants for Senior Accountant and prepare the strongest 8.",
    completedAt: "2026-09-09T10:00:00.000Z",
    result,
  });
  for (const expected of [
    "RecruitOS",
    "Senior Accountant",
    "Review applicants for Senior Accountant",
    "Applicants considered",
    "Existing assessments",
    "New assessments",
    "Prepared candidates",
    "Candidate One",
    "88/100",
    "Stored match score · not a hiring probability",
    "Evidence-backed summary",
    "5 years of accounting experience",
    "Financial reporting",
    "Limited ERP evidence",
    "SAP",
    "Recruiter status: new",
    "Decision support only",
  ]) assert.match(html, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("analysis export excludes unsafe provider, prompt, reasoning, and database internals", () => {
  const html = exportModule.renderAnalysisHtml({ commandText: "Review candidates", completedAt: "2026-09-09T10:00:00.000Z", result });
  for (const privateField of ["raw_model_response", "provider_metadata", "system_prompt", "chain_of_thought", "idempotency_key", "work_state", "user_id"]) {
    assert.equal(html.includes(privateField), false, privateField);
  }
});

test("analysis download rechecks authenticated ownership and only exports completed validated results", () => {
  assert.match(exportServer, /requireAuthenticatedUser\(\)/);
  assert.match(exportServer, /\.eq\("id", executionId\)/);
  assert.match(exportServer, /\.eq\("user_id", user\.id\)/);
  assert.match(exportServer, /data\.status !== "completed"/);
  assert.match(exportServer, /executionResultSchema\.safeParse\(data\.result\)/);
  assert.match(surface, /Download analysis/);
});
