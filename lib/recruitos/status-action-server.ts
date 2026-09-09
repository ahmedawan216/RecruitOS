import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";

import {
  parseCandidateStatusActionCommand,
  type CandidateStatusActionIntent,
} from "@/lib/recruitos/command";
import {
  candidateStatusAppliedResultSchema,
  candidateStatusProposalResultSchema,
  executionResultSchema,
  recruiterStatusSchema,
  shortlistResultSchema,
  type CandidateStatusProposalResult,
  type ExecutionResult,
  type RankedCandidate,
  type ShortlistResult,
} from "@/lib/recruitos/result";
import { isWorkspaceExecutionDismissed } from "@/lib/recruitos/workspace-recovery";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const proposalApprovalSchema = z.object({ proposalId: z.string().uuid() });
const MAX_ACTION_CANDIDATES = 8;
const ALLOWED_INTERVIEW_ORIGINS = new Set(["new", "reviewing", "shortlisted"]);

type DbRow = Record<string, unknown>;
type ActionWorkState = DbRow & {
  phase2dBaseResult?: unknown;
  phase2ePriorResult?: unknown;
  phase2eProposal?: unknown;
  phase2eLastProposalKey?: unknown;
  workspaceDismissedAt?: unknown;
};

type Snapshot = {
  id: string;
  status: string;
  stage: string;
  commandText: string;
  requestedCount: number;
  requestedJobText: string | null;
  resolvedJobId: string | null;
  result: ExecutionResult | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

function asObject(value: unknown): ActionWorkState {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ActionWorkState : {};
}

function snapshot(row: DbRow): Snapshot {
  const parsedResult = row.result ? executionResultSchema.safeParse(row.result) : null;
  return {
    id: String(row.id),
    status: String(row.status),
    stage: String(row.stage),
    commandText: String(row.command_text),
    requestedCount: Number(row.requested_count),
    requestedJobText: typeof row.requested_job_text === "string" ? row.requested_job_text : null,
    resolvedJobId: typeof row.resolved_job_id === "string" ? row.resolved_job_id : null,
    result: parsedResult?.success ? parsedResult.data : null,
    errorCode: typeof row.error_code === "string" ? row.error_code : null,
    errorMessage: typeof row.error_message === "string" ? row.error_message : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function getOwnedExecution(userId: string, executionId: string) {
  const { data, error } = await supabaseAdmin
    .from("recruitos_command_executions")
    .select("*")
    .eq("id", executionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("STATUS_ACTION_EXECUTION_READ_FAILED");
  return data ? data as DbRow : null;
}

async function updateOwnedExecution(userId: string, executionId: string, values: DbRow) {
  const { data, error } = await supabaseAdmin
    .from("recruitos_command_executions")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", executionId)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error || !data) throw new Error("STATUS_ACTION_EXECUTION_UPDATE_FAILED");
  return data as DbRow;
}

async function appendEvent(userId: string, executionId: string, kind: string, message: string, data: DbRow = {}) {
  const { error } = await supabaseAdmin.from("recruitos_command_events").insert({
    user_id: userId,
    execution_id: executionId,
    kind,
    message,
    data,
  });
  if (error) throw new Error("STATUS_ACTION_EVENT_WRITE_FAILED");
}

function getBaseResult(row: DbRow): ShortlistResult | null {
  const state = asObject(row.work_state);
  const storedBase = shortlistResultSchema.safeParse(state.phase2dBaseResult);
  if (storedBase.success) return storedBase.data;
  const current = shortlistResultSchema.safeParse(row.result);
  return current.success ? current.data : null;
}

function getCurrentResult(row: DbRow): ExecutionResult | null {
  const parsed = executionResultSchema.safeParse(row.result);
  return parsed.success ? parsed.data : null;
}

function normalizeName(value: string | null) {
  return (value ?? "").toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function candidateOrder(current: ExecutionResult, base: ShortlistResult) {
  if (current.kind === "candidate_status_proposal" || current.kind === "candidate_status_action_result") return [];
  const allowed = new Set(base.candidates.map((candidate) => candidate.candidateId));
  const ordered = current.candidates.map((candidate) => candidate.candidateId).filter((id) => allowed.has(id));
  for (const candidate of base.candidates) if (!ordered.includes(candidate.candidateId)) ordered.push(candidate.candidateId);
  return ordered;
}

function resolveActionCandidates(intent: CandidateStatusActionIntent, current: ExecutionResult, base: ShortlistResult) {
  const byId = new Map(base.candidates.map((candidate) => [candidate.candidateId, candidate]));
  if (intent.selector.kind === "strongest") {
    return {
      status: "resolved" as const,
      candidates: candidateOrder(current, base)
        .slice(0, intent.selector.count)
        .map((id) => byId.get(id))
        .filter((candidate): candidate is RankedCandidate => Boolean(candidate)),
    };
  }

  const requested = normalizeName(intent.selector.name);
  const exact = base.candidates.filter((candidate) => normalizeName(candidate.name) === requested);
  if (exact.length === 1) return { status: "resolved" as const, candidates: exact };
  if (exact.length > 1) return { status: "ambiguous" as const, candidates: exact };
  return { status: "not_found" as const, candidates: [] as RankedCandidate[] };
}

async function verifyJobAndScope(userId: string, base: ShortlistResult) {
  const { data: job, error: jobError } = await supabaseAdmin
    .from("jobs")
    .select("id, title")
    .eq("id", base.job.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (jobError || !job) return false;

  const ids = base.candidates.map((candidate) => candidate.candidateId);
  if (!ids.length) return true;
  const { data: matches, error } = await supabaseAdmin
    .from("candidate_job_matches")
    .select("candidate_id")
    .eq("user_id", userId)
    .eq("job_id", base.job.id)
    .in("candidate_id", ids);
  if (error) return false;
  return new Set((matches ?? []).map((match) => match.candidate_id)).size === new Set(ids).size;
}

async function readAuthoritativeStatuses(userId: string, jobId: string, candidates: RankedCandidate[]) {
  const ids = candidates.map((candidate) => candidate.candidateId);
  if (!ids.length) return new Map<string, string>();
  const { data, error } = await supabaseAdmin
    .from("candidate_job_matches")
    .select("candidate_id, recruiter_status")
    .eq("user_id", userId)
    .eq("job_id", jobId)
    .in("candidate_id", ids);
  if (error) throw new Error("STATUS_ACTION_MATCH_READ_FAILED");
  return new Map((data ?? []).map((match) => [String(match.candidate_id), String(match.recruiter_status)]));
}

function invalidTransitionReason(status: string) {
  if (status === "interview") return "Already in Interview; no change is needed.";
  if (status === "offer" || status === "hired") return "This candidate is already beyond the Interview stage.";
  if (status === "rejected") return "Rejected candidates are not advanced by this Phase 2E workflow.";
  return "This status cannot be moved to Interview through the current reviewed action.";
}

export async function beginCandidateStatusProposal(executionId: string, commandText: string, idempotencyKey: string) {
  const user = await requireAuthenticatedUser();
  const row = await getOwnedExecution(user.id, executionId);
  if (!row) return { ok: false as const, status: 404, code: "NO_ACTIVE_TASK", error: "Start or select a recruiting task before requesting a candidate action." };
  if (isWorkspaceExecutionDismissed(row.work_state)) return { ok: false as const, status: 409, code: "NO_ACTIVE_TASK", error: "This task is no longer active. Start or select a recruiting task first." };
  if (String(row.status) !== "completed") return { ok: false as const, status: 409, code: "TASK_NOT_READY", error: "Wait for the current recruiting analysis to finish before preparing candidate changes." };

  const state = asObject(row.work_state);
  const current = getCurrentResult(row);
  const base = getBaseResult(row);
  if (!current || !base) return { ok: false as const, status: 409, code: "NO_ACTIVE_TASK", error: "This task does not contain a valid candidate shortlist for a reviewed action." };
  if (current.kind === "candidate_status_proposal") return { ok: false as const, status: 409, code: "PROPOSAL_PENDING", error: "Review or cancel the current proposal before preparing another action." };
  if (current.kind === "candidate_status_action_result") return { ok: false as const, status: 409, code: "ACTION_ALREADY_APPLIED", error: "This task already contains an applied candidate action. Start a new task for another consequential change." };
  if (!(await verifyJobAndScope(user.id, base))) return { ok: false as const, status: 409, code: "STALE_TASK_SCOPE", error: "The active candidate scope changed. Start a new recruiting task before preparing a candidate action." };

  if (state.phase2eLastProposalKey === idempotencyKey) return { ok: true as const, duplicate: true, execution: snapshot(row) };

  const parsed = parseCandidateStatusActionCommand(commandText);
  if (!parsed.ok) return { ok: false as const, status: 422, code: parsed.code, error: parsed.message || "RecruitOS could not safely interpret that candidate action." };

  const resolved = resolveActionCandidates(parsed.value, current, base);
  if (resolved.status === "ambiguous") return { ok: false as const, status: 422, code: "AMBIGUOUS_CANDIDATE", error: `More than one candidate in the current task matches “${parsed.value.selector.kind === "candidate_name" ? parsed.value.selector.name : "that name"}”. Use a unique exact candidate name.` };
  if (resolved.status === "not_found" || !resolved.candidates.length) return { ok: false as const, status: 422, code: "CANDIDATE_NOT_IN_SCOPE", error: "That candidate is not uniquely available in the active recruiting task." };
  if (resolved.candidates.length > MAX_ACTION_CANDIDATES) return { ok: false as const, status: 422, code: "ACTION_SCOPE_TOO_LARGE", error: `Phase 2E can prepare at most ${MAX_ACTION_CANDIDATES} candidate changes at once.` };

  const statuses = await readAuthoritativeStatuses(user.id, base.job.id, resolved.candidates);
  const candidates: CandidateStatusProposalResult["candidates"] = [];
  const skipped: CandidateStatusProposalResult["skipped"] = [];

  for (const candidate of resolved.candidates) {
    const rawStatus = statuses.get(candidate.candidateId);
    const parsedStatus = recruiterStatusSchema.safeParse(rawStatus);
    if (!parsedStatus.success) return { ok: false as const, status: 409, code: "STALE_CANDIDATE", error: `${candidate.name ?? "A selected candidate"} is no longer available with a valid recruiting status for this job.` };

    if (!ALLOWED_INTERVIEW_ORIGINS.has(parsedStatus.data)) {
      skipped.push({
        candidateId: candidate.candidateId,
        name: candidate.name,
        email: candidate.email,
        candidateHref: candidate.candidateHref,
        currentStatus: parsedStatus.data,
        reason: invalidTransitionReason(parsedStatus.data),
      });
      continue;
    }

    candidates.push({
      candidateId: candidate.candidateId,
      name: candidate.name,
      email: candidate.email,
      candidateHref: candidate.candidateHref,
      matchScore: candidate.matchScore,
      sourceRank: candidate.rank,
      expectedStatus: parsedStatus.data,
      proposedStatus: "interview",
      currentStatus: parsedStatus.data,
      state: "pending",
      conflictReason: null,
    });
  }

  if (!candidates.length) {
    return { ok: false as const, status: 422, code: "INVALID_STATUS_TRANSITION", error: skipped[0]?.reason ?? "None of the selected candidates can be moved to Interview from their current status." };
  }

  const proposalId = randomUUID();
  const createdAt = new Date().toISOString();
  const proposal = candidateStatusProposalResultSchema.parse({
    kind: "candidate_status_proposal",
    job: base.job,
    proposalId,
    proposalStatus: "pending",
    requestedCommand: commandText,
    proposedStatus: "interview",
    createdAt,
    changeCount: candidates.length,
    candidates,
    skipped,
  });

  const nextState = {
    ...state,
    phase2dBaseResult: state.phase2dBaseResult ?? base,
    phase2ePriorResult: current,
    phase2eLastProposalKey: idempotencyKey,
    phase2eProposal: { proposalId, status: "pending", createdAt, requestedCommand: commandText },
  };

  const updated = await updateOwnedExecution(user.id, executionId, {
    result: proposal,
    stage: "action_review_required",
    work_state: nextState,
    error_code: null,
    error_message: null,
  });
  await appendEvent(user.id, executionId, "status", `${candidates.length} candidate status change${candidates.length === 1 ? "" : "s"} prepared for human review`, {
    action: "candidate_status_change",
    targetStatus: "interview",
    count: candidates.length,
    proposalId,
  });

  return { ok: true as const, duplicate: false, execution: snapshot(updated) };
}

function mapProposalConflict(proposal: CandidateStatusProposalResult, conflicts: unknown) {
  const conflictSchema = z.array(z.object({
    candidateId: z.string().uuid(),
    currentStatus: z.string().nullable(),
    reason: z.string().min(1).max(500),
  }));
  const parsed = conflictSchema.safeParse(conflicts);
  const byId = new Map(parsed.success ? parsed.data.map((item) => [item.candidateId, item]) : []);
  return candidateStatusProposalResultSchema.parse({
    ...proposal,
    proposalStatus: "stale",
    candidates: proposal.candidates.map((candidate) => {
      const conflict = byId.get(candidate.candidateId);
      if (!conflict) return candidate;
      const current = recruiterStatusSchema.safeParse(conflict.currentStatus);
      return {
        ...candidate,
        currentStatus: current.success ? current.data : null,
        state: "stale" as const,
        conflictReason: conflict.reason.slice(0, 300),
      };
    }),
  });
}

export async function applyCandidateStatusProposal(executionId: string, input: unknown) {
  const user = await requireAuthenticatedUser();
  const validated = proposalApprovalSchema.safeParse(input);
  if (!validated.success) return { ok: false as const, status: 400, code: "INVALID_APPROVAL", error: "The proposal approval request was malformed." };

  const row = await getOwnedExecution(user.id, executionId);
  if (!row) return { ok: false as const, status: 404, code: "PROPOSAL_NOT_FOUND", error: "This reviewed proposal is not available." };
  if (isWorkspaceExecutionDismissed(row.work_state)) return { ok: false as const, status: 409, code: "NO_ACTIVE_TASK", error: "This task is no longer active." };

  const proposal = candidateStatusProposalResultSchema.safeParse(row.result);
  const alreadyApplied = candidateStatusAppliedResultSchema.safeParse(row.result);
  if (alreadyApplied.success && alreadyApplied.data.proposalId === validated.data.proposalId) {
    return { ok: true as const, duplicate: true, execution: snapshot(row) };
  }
  if (!proposal.success || proposal.data.proposalId !== validated.data.proposalId) return { ok: false as const, status: 409, code: "PROPOSAL_NOT_PENDING", error: "This proposal is no longer pending review." };

  const { data, error } = await supabaseAdmin.rpc("apply_recruitos_candidate_status_proposal", {
    p_user_id: user.id,
    p_execution_id: executionId,
    p_proposal_id: validated.data.proposalId,
  });
  if (error) {
    console.error("Reviewed candidate status apply failed:", error);
    return { ok: false as const, status: 500, code: "ACTION_APPLY_FAILED", error: "RecruitOS could not apply the approved changes. No partial success is reported." };
  }

  const rpc = data && typeof data === "object" && !Array.isArray(data) ? data as DbRow : {};
  if (rpc.ok === true) {
    const refreshed = await getOwnedExecution(user.id, executionId);
    if (!refreshed) return { ok: false as const, status: 500, code: "ACTION_RESULT_MISSING", error: "The approved change completed but RecruitOS could not reload its result." };
    await appendEvent(user.id, executionId, "completed", `${proposal.data.changeCount} recruiter-approved candidate status change${proposal.data.changeCount === 1 ? "" : "s"} applied`, {
      action: "candidate_status_change",
      targetStatus: "interview",
      proposalId: validated.data.proposalId,
      duplicate: rpc.duplicate === true,
    }).catch(() => undefined);
    return { ok: true as const, duplicate: rpc.duplicate === true, execution: snapshot(refreshed) };
  }

  if (rpc.code === "STALE_PROPOSAL") {
    const staleProposal = mapProposalConflict(proposal.data, rpc.conflicts);
    const state = asObject(row.work_state);
    const updated = await updateOwnedExecution(user.id, executionId, {
      result: staleProposal,
      stage: "action_review_stale",
      work_state: { ...state, phase2eProposal: { proposalId: proposal.data.proposalId, status: "stale", checkedAt: new Date().toISOString() } },
      error_code: "STALE_PROPOSAL",
      error_message: "Candidate state changed after this proposal was prepared. Review the conflicts before preparing a fresh action.",
    });
    await appendEvent(user.id, executionId, "warning", "Approved changes were not applied because candidate state changed", { proposalId: proposal.data.proposalId });
    return { ok: false as const, status: 409, code: "STALE_PROPOSAL", error: "Candidate state changed after this proposal was prepared. No changes were applied.", execution: snapshot(updated) };
  }

  const code = typeof rpc.code === "string" ? rpc.code : "ACTION_NOT_APPLIED";
  return { ok: false as const, status: 409, code, error: code === "STALE_JOB" ? "The job is no longer available. No changes were applied." : "This proposal is no longer eligible to be applied." };
}

export async function cancelCandidateStatusProposal(executionId: string, input: unknown) {
  const user = await requireAuthenticatedUser();
  const validated = proposalApprovalSchema.safeParse(input);
  if (!validated.success) return { ok: false as const, status: 400, code: "INVALID_CANCELLATION", error: "The proposal cancellation request was malformed." };

  const row = await getOwnedExecution(user.id, executionId);
  if (!row) return { ok: false as const, status: 404, code: "PROPOSAL_NOT_FOUND", error: "This reviewed proposal is not available." };

  const { data, error } = await supabaseAdmin.rpc("cancel_recruitos_candidate_status_proposal", {
    p_user_id: user.id,
    p_execution_id: executionId,
    p_proposal_id: validated.data.proposalId,
  });
  if (error) {
    console.error("Reviewed candidate status cancellation failed:", error);
    return { ok: false as const, status: 500, code: "ACTION_CANCEL_FAILED", error: "RecruitOS could not cancel this proposal." };
  }
  const rpc = data && typeof data === "object" && !Array.isArray(data) ? data as DbRow : {};
  if (rpc.ok !== true) {
    const code = typeof rpc.code === "string" ? rpc.code : "PROPOSAL_NOT_PENDING";
    return { ok: false as const, status: 409, code, error: code === "ALREADY_APPLIED" ? "These approved changes were already applied and cannot be cancelled." : "This proposal is no longer pending." };
  }

  const refreshed = await getOwnedExecution(user.id, executionId);
  if (!refreshed) return { ok: false as const, status: 500, code: "ACTION_RESULT_MISSING", error: "The proposal was cancelled but RecruitOS could not reload the task." };
  await appendEvent(user.id, executionId, "cancelled", "Candidate status proposal cancelled without applying changes", {
    action: "candidate_status_change",
    proposalId: validated.data.proposalId,
  }).catch(() => undefined);
  return { ok: true as const, duplicate: rpc.duplicate === true, execution: snapshot(refreshed) };
}
