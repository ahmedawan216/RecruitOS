import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
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
const command = transpile("../lib/recruitos/command.ts", { "@/lib/recruitos/result": resultModule });
const actionServer = readFileSync(new URL("../lib/recruitos/status-action-server.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20260909192000_recruitos_phase2e_human_reviewed_actions.sql", import.meta.url), "utf8");
const followUpRoute = readFileSync(new URL("../app/api/recruitos/executions/[executionId]/follow-up/route.ts", import.meta.url), "utf8");
const applyRoute = readFileSync(new URL("../app/api/recruitos/executions/[executionId]/proposal/apply/route.ts", import.meta.url), "utf8");
const cancelRoute = readFileSync(new URL("../app/api/recruitos/executions/[executionId]/proposal/cancel/route.ts", import.meta.url), "utf8");
const surface = readFileSync(new URL("../components/recruitos/workspace/command-task-surface.tsx", import.meta.url), "utf8");
const proposalView = readFileSync(new URL("../components/recruitos/workspace/reviewed-status-action-view.tsx", import.meta.url), "utf8");
const exportSource = readFileSync(new URL("../lib/recruitos/analysis-export.ts", import.meta.url), "utf8");

function proposalCreationBody() {
  const start = actionServer.indexOf("export async function beginCandidateStatusProposal");
  const end = actionServer.indexOf("function mapProposalConflict", start);
  return actionServer.slice(start, end);
}

test("Phase 2E parser supports only deterministic moves to Interview", () => {
  assert.deepEqual(command.parseCandidateStatusActionCommand("Move the strongest 3 candidates to interview.").value, {
    intent: "propose_candidate_status_change", targetStatus: "interview", selector: { kind: "strongest", count: 3 },
  });
  assert.deepEqual(command.parseCandidateStatusActionCommand("Advance the top 2 to interview.").value.selector, { kind: "strongest", count: 2 });
  assert.deepEqual(command.parseCandidateStatusActionCommand("Advance the strongest candidate.").value.selector, { kind: "strongest", count: 1 });
  assert.deepEqual(command.parseCandidateStatusActionCommand("Move Ahmed Awan to interview.").value.selector, { kind: "candidate_name", name: "Ahmed Awan" });
});

test("unsupported consequential status targets are never silently downgraded", () => {
  for (const text of ["Reject the bottom 3.", "Move the strongest 2 to offer.", "Hire the top candidate."]) {
    const parsed = command.parseCandidateStatusActionCommand(text);
    assert.equal(parsed.ok, false);
    assert.equal(parsed.code, "UNSUPPORTED_ACTION");
  }
  assert.match(command.parseFollowUpCommand("Email these candidates.").message, /proposal flow|unsupported|consequential/i);
});

test("action count is bounded and ambiguous action scope is rejected", () => {
  const tooMany = command.parseCandidateStatusActionCommand("Move the strongest 9 candidates to interview.");
  assert.equal(tooMany.ok, false);
  assert.equal(tooMany.code, "INVALID_ACTION_COUNT");
  const ambiguous = command.parseCandidateStatusActionCommand("Move candidates to interview.");
  assert.equal(ambiguous.ok, false);
  assert.equal(ambiguous.code, "AMBIGUOUS_ACTION");
});

test("proposal creation is authenticated, owner-scoped, bounded to the active task, and performs no candidate mutation", () => {
  const body = proposalCreationBody();
  assert.match(body, /requireAuthenticatedUser\(\)/);
  assert.match(body, /getOwnedExecution\(user\.id, executionId\)/);
  assert.match(body, /verifyJobAndScope\(user\.id, base\)/);
  assert.match(body, /readAuthoritativeStatuses\(user\.id, base\.job\.id, resolved\.candidates\)/);
  assert.match(body, /phase2ePriorResult: current/);
  assert.match(body, /action_review_required/);
  assert.doesNotMatch(body, /candidate_job_matches"\)\s*\.update/);
  assert.doesNotMatch(body, /apply_recruitos_candidate_status_proposal/);
});

test("explicit candidate resolution never trusts client candidate IDs", () => {
  assert.match(actionServer, /normalizeName\(intent\.selector\.name\)/);
  assert.match(actionServer, /base\.candidates\.filter/);
  assert.match(actionServer, /AMBIGUOUS_CANDIDATE/);
  assert.match(actionServer, /CANDIDATE_NOT_IN_SCOPE/);
  assert.doesNotMatch(followUpRoute, /candidateIds/);
  assert.doesNotMatch(followUpRoute, /user_id/);
});

test("only real pre-interview statuses can be proposed for Interview", () => {
  assert.match(actionServer, /ALLOWED_INTERVIEW_ORIGINS = new Set\(\["new", "reviewing", "shortlisted"\]\)/);
  assert.match(actionServer, /Already in Interview/);
  assert.match(actionServer, /already beyond the Interview stage/);
  assert.match(actionServer, /Rejected candidates are not advanced/);
});

test("approval is a separate authenticated request and browser sends only proposalId", () => {
  assert.match(applyRoute, /applyCandidateStatusProposal/);
  assert.match(actionServer, /proposalApprovalSchema = z\.object\(\{ proposalId: z\.string\(\)\.uuid\(\) \}\)/);
  const requestStart = proposalView.indexOf("/proposal/apply");
  const requestEnd = proposalView.indexOf("const payload", requestStart);
  const applyRequest = proposalView.slice(requestStart, requestEnd);
  assert.ok(requestStart >= 0 && requestEnd > requestStart);
  assert.match(applyRequest, /JSON\.stringify\(\{ proposalId: result\.proposalId \}\)/);
  assert.doesNotMatch(applyRequest, /candidateIds|currentStatus|user_id/);
});

test("database approval is atomic, stale-safe, and owner/job/candidate scoped", () => {
  assert.match(migration, /for update/gi);
  assert.match(migration, /candidate_job_matches[\s\S]*user_id = p_user_id[\s\S]*job_id = v_job_id[\s\S]*candidate_id = v_candidate_id/);
  assert.match(migration, /v_current_status <> v_expected_status/);
  assert.match(migration, /STALE_PROPOSAL/);
  assert.match(migration, /All-or-none mutation/);
  assert.match(migration, /raise exception 'PHASE2E_ATOMIC_UPDATE_CONFLICT'/);
});

test("approval is replay-safe and exactly-once at the locked execution boundary", () => {
  assert.match(migration, /from public\.recruitos_command_executions[\s\S]*for update/);
  assert.match(migration, /candidate_status_action_result[\s\S]*duplicate', true/);
  assert.match(actionServer, /alreadyApplied\.data\.proposalId === validated\.data\.proposalId/);
});

test("the mutation RPC is service-role-only and does not weaken RLS", () => {
  assert.match(migration, /revoke all on function public\.apply_recruitos_candidate_status_proposal[\s\S]*from authenticated/);
  assert.match(migration, /grant execute on function public\.apply_recruitos_candidate_status_proposal[\s\S]*to service_role/);
  assert.match(migration, /revoke all on function public\.cancel_recruitos_candidate_status_proposal[\s\S]*from authenticated/);
  assert.doesNotMatch(migration, /disable row level security|alter table[\s\S]*disable/i);
});

test("human-approved status changes preserve useful candidate activity provenance", () => {
  assert.match(migration, /insert into public\.candidate_activity/);
  assert.match(migration, /previous_status/);
  assert.match(migration, /new_status/);
  assert.match(migration, /recruitos_human_reviewed_action/);
  assert.match(migration, /proposal_id/);
  assert.match(migration, /execution_id/);
  assert.match(migration, /actor_user_id/);
});

test("stale proposals apply none and return visible conflict state", () => {
  assert.match(migration, /if jsonb_array_length\(v_conflicts\) > 0 then[\s\S]*return jsonb_build_object\('ok', false, 'code', 'STALE_PROPOSAL'/);
  assert.match(actionServer, /proposalStatus: "stale"/);
  assert.match(actionServer, /action_review_stale/);
  assert.match(proposalView, /Nothing from this stale proposal will be applied/);
});

test("proposal cancellation is durable, atomic with execution recovery, and causes no candidate mutation", () => {
  assert.match(cancelRoute, /cancelCandidateStatusProposal/);
  assert.match(migration, /cancel_recruitos_candidate_status_proposal/);
  assert.match(migration, /v_prior_result := v_work_state->'phase2ePriorResult'/);
  assert.match(migration, /stage = 'action_cancelled'/);
  const cancelFunction = migration.slice(migration.indexOf("create or replace function public.cancel_recruitos_candidate_status_proposal"));
  assert.doesNotMatch(cancelFunction, /update public\.candidate_job_matches/);
});

test("refresh never approves: proposal and applied result are durable execution result variants", () => {
  assert.ok(resultModule.executionResultSchema.safeParse({
    kind: "candidate_status_proposal",
    job: { id: "11111111-1111-4111-8111-111111111111", title: "Junior AI Engineer" },
    proposalId: "22222222-2222-4222-8222-222222222222",
    proposalStatus: "pending",
    requestedCommand: "Move Ahmed Awan to interview.",
    proposedStatus: "interview",
    createdAt: "2026-09-09T14:00:00.000Z",
    changeCount: 1,
    candidates: [{ candidateId: "33333333-3333-4333-8333-333333333333", name: "Ahmed Awan", email: null, candidateHref: "/dashboard/agents/recruitos/candidates/33333333-3333-4333-8333-333333333333", matchScore: 90, sourceRank: 1, expectedStatus: "shortlisted", proposedStatus: "interview", currentStatus: "shortlisted", state: "pending", conflictReason: null }],
    skipped: [],
  }).success);
  assert.match(surface, /initialExecution \?\? null/);
  assert.doesNotMatch(surface, /proposal\/apply[\s\S]*useEffect/);
});

test("human decision boundary is visually explicit and not a chatbot", () => {
  assert.match(proposalView, /Human review required/);
  assert.match(proposalView, /Nothing has been changed yet/);
  assert.match(proposalView, /Apply \$\{result\.changeCount\} change/);
  assert.match(surface, /Prepare proposal/);
  assert.doesNotMatch(surface + proposalView, /chat bubble|assistant message|conversation transcript/i);
});

test("applied result wording truthfully attributes decision to the recruiter", () => {
  assert.match(proposalView, /The recruiter approved this proposal/);
  assert.match(proposalView, /did not independently choose to interview/);
  assert.match(exportSource, /APPLIED_ACTION_DISCLAIMER/);
  assert.match(exportSource, /recruiter explicitly approved it/);
});

test("Phase 2D analytical follow-ups remain routed through the existing path", () => {
  assert.match(followUpRoute, /beginContextualFollowUp\(executionId, body\)/);
  assert.equal(command.parseFollowUpCommand("Show me only the concerns.").ok, true);
  assert.equal(command.parseFollowUpCommand("Compare the strongest candidates.").ok, true);
  assert.equal(command.parseFollowUpCommand("Focus more on production AI experience.").ok, true);
});
