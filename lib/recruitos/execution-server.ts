import "server-only";

import { captureOutcome } from "@/lib/analytics/server";

import { analyzeResume } from "@/app/actions/analyze-resume";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  commandSubmissionSchema,
  executionResultSchema,
  parseRecruitingCommand,
  resolveJobReference,
  type ExecutionResult,
} from "@/lib/recruitos/command";

const TERMINAL = new Set(["completed", "failed", "cancelled", "clarification_required"]);
const ANALYSIS_BATCH_SIZE = 3;
const MAX_APPLICANTS = 1000;

type DbRow = Record<string, unknown>;
type Applicant = { candidateId: string; resumeId: string | null; recruiterStatus: string | null };
type AnalysisRecord = {
  id: string;
  candidate_id: string | null;
  match_score: number | null;
  recommendation: "interview" | "maybe" | "reject" | null;
  summary: string | null;
  why_strong_match: string | null;
  matching_skills: string[] | null;
  missing_skills: string[] | null;
  potential_concerns: string[] | null;
  years_relevant_experience: number | null;
};

export type ExecutionSnapshot = {
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

function asObject(value: unknown): DbRow {
  return value && typeof value === "object" && !Array.isArray(value) ? value as DbRow : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function snapshot(row: DbRow): ExecutionSnapshot {
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

async function getExecutionRow(userId: string, executionId: string) {
  const { data, error } = await supabaseAdmin
    .from("recruitos_command_executions")
    .select("*")
    .eq("id", executionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("EXECUTION_READ_FAILED");
  return data ? data as DbRow : null;
}

async function updateExecution(userId: string, executionId: string, values: DbRow) {
  const { data, error } = await supabaseAdmin
    .from("recruitos_command_executions")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", executionId)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error || !data) throw new Error("EXECUTION_UPDATE_FAILED");
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
  if (error) throw new Error("EXECUTION_EVENT_WRITE_FAILED");
}

export async function createCommandExecution(input: unknown) {
  const user = await requireAuthenticatedUser();
  const validated = commandSubmissionSchema.safeParse(input);
  if (!validated.success) return { ok: false as const, status: 400, error: "The command submission was malformed." };

  const parsed = parseRecruitingCommand(validated.data.commandText);
  if (!parsed.ok) return { ok: false as const, status: 422, code: parsed.code, error: parsed.message };

  if (validated.data.jobId) {
    const { data: job, error } = await supabaseAdmin
      .from("jobs")
      .select("id")
      .eq("id", validated.data.jobId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !job) return { ok: false as const, status: 404, code: "JOB_NOT_FOUND", error: "The selected job is not available in your workspace." };
  }

  const { data, error } = await supabaseAdmin
    .from("recruitos_command_executions")
    .insert({
      user_id: user.id,
      intent: parsed.value.intent,
      command_text: validated.data.commandText,
      requested_count: parsed.value.requestedCount,
      requested_job_text: parsed.value.requestedJobText,
      scope_job_id: validated.data.jobId ?? null,
      status: "queued",
      stage: "resolving_job",
      idempotency_key: validated.data.idempotencyKey,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await supabaseAdmin
        .from("recruitos_command_executions")
        .select("*")
        .eq("user_id", user.id)
        .eq("idempotency_key", validated.data.idempotencyKey)
        .maybeSingle();
      if (existing) return { ok: true as const, duplicate: true, execution: snapshot(existing as DbRow) };
    }
    console.error("RecruitOS execution create error:", { code: error.code });
    return { ok: false as const, status: 500, error: "RecruitOS could not create the task. Please try again." };
  }

  await appendEvent(user.id, data.id, "status", "Understanding request");
  return { ok: true as const, duplicate: false, execution: snapshot(data as DbRow) };
}

async function loadApplicants(userId: string, jobId: string): Promise<Applicant[]> {
  const [{ data: matches, error: matchError }, { data: activities, error: activityError }] = await Promise.all([
    supabaseAdmin
      .from("candidate_job_matches")
      .select("candidate_id, resume_id, recruiter_status, updated_at")
      .eq("user_id", userId)
      .eq("job_id", jobId)
      .order("updated_at", { ascending: false })
      .limit(MAX_APPLICANTS),
    supabaseAdmin
      .from("candidate_activity")
      .select("candidate_id, metadata, created_at")
      .eq("user_id", userId)
      .eq("job_id", jobId)
      .eq("type", "resume_uploaded")
      .order("created_at", { ascending: false })
      .limit(MAX_APPLICANTS),
  ]);
  if (matchError || activityError) throw new Error("APPLICANT_LOAD_FAILED");

  const byCandidate = new Map<string, Applicant>();
  for (const row of matches ?? []) {
    byCandidate.set(row.candidate_id, { candidateId: row.candidate_id, resumeId: row.resume_id, recruiterStatus: row.recruiter_status });
  }
  for (const row of activities ?? []) {
    if (byCandidate.has(row.candidate_id)) continue;
    const metadata = asObject(row.metadata);
    byCandidate.set(row.candidate_id, {
      candidateId: row.candidate_id,
      resumeId: typeof metadata.resumeId === "string" ? metadata.resumeId : null,
      recruiterStatus: null,
    });
  }
  return [...byCandidate.values()];
}

async function loadUsableAnalyses(userId: string, jobId: string, applicants: Applicant[]) {
  if (!applicants.length) return new Map<string, AnalysisRecord>();
  const { data, error } = await supabaseAdmin
    .from("resume_analyses")
    .select("id, candidate_id, match_score, recommendation, summary, why_strong_match, matching_skills, missing_skills, potential_concerns, years_relevant_experience, created_at")
    .eq("user_id", userId)
    .eq("job_id", jobId)
    .eq("status", "success")
    .in("candidate_id", applicants.map((item) => item.candidateId))
    .order("created_at", { ascending: false })
    .limit(MAX_APPLICANTS);
  if (error) throw new Error("ANALYSIS_LOAD_FAILED");

  const map = new Map<string, AnalysisRecord>();
  for (const row of data ?? []) {
    if (!row.candidate_id || map.has(row.candidate_id)) continue;
    if (typeof row.match_score !== "number" || row.match_score < 0 || row.match_score > 100) continue;
    map.set(row.candidate_id, row as AnalysisRecord);
  }
  return map;
}

async function resolveJobStage(userId: string, execution: DbRow) {
  const { data: jobs, error } = await supabaseAdmin.from("jobs").select("id, title").eq("user_id", userId).order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error("JOB_LOAD_FAILED");

  const resolution = resolveJobReference(
    jobs ?? [],
    typeof execution.requested_job_text === "string" ? execution.requested_job_text : null,
    typeof execution.scope_job_id === "string" ? execution.scope_job_id : null,
  );
  const executionId = String(execution.id);

  if (resolution.status === "ambiguous") {
    const options = resolution.jobs.slice(0, 6);
    await updateExecution(userId, executionId, {
      status: "clarification_required",
      stage: "job_clarification",
      work_state: { jobOptions: options },
      error_code: "AMBIGUOUS_JOB",
      error_message: "More than one job matches this request. Choose a job in Scope and run it again.",
      completed_at: new Date().toISOString(),
    });
    await appendEvent(userId, executionId, "clarification", "More than one job matches this request", { jobs: options });
    return;
  }

  if (resolution.status === "not_found") {
    await updateExecution(userId, executionId, {
      status: "failed",
      stage: "job_not_found",
      error_code: "JOB_NOT_FOUND",
      error_message: "RecruitOS could not find that job in your workspace. Choose a job in Scope or use its exact title.",
      completed_at: new Date().toISOString(),
    });
    await appendEvent(userId, executionId, "failed", "Requested job was not found");
    return;
  }

  if (resolution.status === "scope_conflict") {
    await updateExecution(userId, executionId, {
      status: "clarification_required",
      stage: "job_scope_conflict",
      error_code: "JOB_SCOPE_CONFLICT",
      error_message: `The command names a different role from the selected scope (${resolution.job.title}). Align the command and Scope, then run it again.`,
      completed_at: new Date().toISOString(),
    });
    await appendEvent(userId, executionId, "clarification", "Command and selected job scope do not match");
    return;
  }

  await updateExecution(userId, executionId, {
    status: "running",
    stage: "loading_applicants",
    resolved_job_id: resolution.job.id,
    started_at: execution.started_at ?? new Date().toISOString(),
    work_state: { jobTitle: resolution.job.title },
    error_code: null,
    error_message: null,
  });
  await appendEvent(userId, executionId, "progress", `Found ${resolution.job.title}`, { jobId: resolution.job.id });
}

async function loadApplicantStage(userId: string, execution: DbRow) {
  const executionId = String(execution.id);
  const jobId = String(execution.resolved_job_id);
  const applicants = await loadApplicants(userId, jobId);
  if (!applicants.length) {
    await updateExecution(userId, executionId, {
      status: "failed",
      stage: "no_applicants",
      error_code: "NO_APPLICANTS",
      error_message: "No applicants are associated with this job yet. Upload resumes for this role, then run the task again.",
      completed_at: new Date().toISOString(),
    });
    await appendEvent(userId, executionId, "failed", "No applicants found for this job");
    return;
  }

  const analyses = await loadUsableAnalyses(userId, jobId, applicants);
  const state = asObject(execution.work_state);
  const missingCount = applicants.length - analyses.size;
  await updateExecution(userId, executionId, {
    stage: missingCount > 0 ? "analyzing_candidates" : "comparing_candidates",
    work_state: {
      ...state,
      applicantCount: applicants.length,
      initialReusedAnalysisCount: analyses.size,
      generatedAnalysisCount: Number(state.generatedAnalysisCount ?? 0),
      failedCandidateIds: asStringArray(state.failedCandidateIds),
    },
  });
  await appendEvent(userId, executionId, "progress", `Loading ${applicants.length} applicants`, { count: applicants.length });
  if (analyses.size) await appendEvent(userId, executionId, "progress", `Using ${analyses.size} existing assessments`, { count: analyses.size });
  if (missingCount) await appendEvent(userId, executionId, "progress", `${missingCount} applicants need assessment`, { count: missingCount });
}

async function analysisStage(userId: string, execution: DbRow) {
  const executionId = String(execution.id);
  const jobId = String(execution.resolved_job_id);
  const applicants = await loadApplicants(userId, jobId);
  const analyses = await loadUsableAnalyses(userId, jobId, applicants);
  const state = asObject(execution.work_state);
  const failed = new Set(asStringArray(state.failedCandidateIds));
  let generated = Number(state.generatedAnalysisCount ?? 0);
  const missing = applicants.filter((item) => !analyses.has(item.candidateId) && !failed.has(item.candidateId));

  if (!missing.length) {
    await updateExecution(userId, executionId, { stage: "comparing_candidates", work_state: { ...state, failedCandidateIds: [...failed], generatedAnalysisCount: generated } });
    return;
  }

  const batch = missing.slice(0, ANALYSIS_BATCH_SIZE);
  await appendEvent(userId, executionId, "progress", `Analyzing ${batch.length} ${batch.length === 1 ? "candidate" : "candidates"}`, { count: batch.length });

  for (const applicant of batch) {
    const current = await getExecutionRow(userId, executionId);
    if (!current || current.status === "cancelled") return;
    if (!applicant.resumeId) {
      failed.add(applicant.candidateId);
      await appendEvent(userId, executionId, "warning", "One applicant has no usable resume attached", { candidateId: applicant.candidateId });
      continue;
    }

    try {
      const result = await analyzeResume(applicant.resumeId, jobId);
      if (result.success) generated += 1;
      else {
        failed.add(applicant.candidateId);
        await appendEvent(userId, executionId, "warning", "One applicant assessment could not be completed", { candidateId: applicant.candidateId });
      }
    } catch (error) {
      console.error("RecruitOS command candidate analysis failed:", error);
      failed.add(applicant.candidateId);
      await appendEvent(userId, executionId, "warning", "One applicant assessment could not be completed", { candidateId: applicant.candidateId });
    }
  }

  const refreshed = await loadUsableAnalyses(userId, jobId, applicants);
  const remaining = applicants.filter((item) => !refreshed.has(item.candidateId) && !failed.has(item.candidateId));
  await updateExecution(userId, executionId, {
    stage: remaining.length ? "analyzing_candidates" : "comparing_candidates",
    work_state: { ...state, failedCandidateIds: [...failed], generatedAnalysisCount: generated },
  });
}

async function compareStage(userId: string, execution: DbRow) {
  const executionId = String(execution.id);
  const jobId = String(execution.resolved_job_id);
  const state = asObject(execution.work_state);
  const applicants = await loadApplicants(userId, jobId);
  const analyses = await loadUsableAnalyses(userId, jobId, applicants);
  const failed = new Set(asStringArray(state.failedCandidateIds));
  await appendEvent(userId, executionId, "progress", "Comparing strongest candidates", { assessedCount: analyses.size });

  const candidateIds = [...analyses.keys()];
  const candidateQuery = candidateIds.length
    ? await supabaseAdmin.from("candidates").select("id, full_name, email").eq("user_id", userId).in("id", candidateIds)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[], error: null };
  if (candidateQuery.error) throw new Error("CANDIDATE_LOAD_FAILED");

  const candidateMap = new Map((candidateQuery.data ?? []).map((item) => [item.id, item]));
  const applicantMap = new Map(applicants.map((item) => [item.candidateId, item]));
  const requestedCount = Number(execution.requested_count);
  const ranked = [...analyses.entries()]
    .sort(([, a], [, b]) => (b.match_score ?? -1) - (a.match_score ?? -1) || a.id.localeCompare(b.id))
    .slice(0, requestedCount)
    .map(([candidateId, analysis], index) => {
      const candidate = candidateMap.get(candidateId);
      const applicant = applicantMap.get(candidateId);
      const strengths = Array.isArray(analysis.matching_skills) ? analysis.matching_skills.filter(Boolean) : [];
      const evidence = [analysis.why_strong_match, ...strengths.slice(0, 3)].filter((item): item is string => Boolean(item?.trim()));
      return {
        rank: index + 1,
        candidateId,
        name: candidate?.full_name ?? null,
        email: candidate?.email ?? null,
        matchScore: analysis.match_score ?? 0,
        recommendation: analysis.recommendation,
        summary: analysis.summary,
        evidence,
        strengths,
        concerns: Array.isArray(analysis.potential_concerns) ? analysis.potential_concerns.filter(Boolean) : [],
        missingSkills: Array.isArray(analysis.missing_skills) ? analysis.missing_skills.filter(Boolean) : [],
        yearsRelevantExperience: typeof analysis.years_relevant_experience === "number" ? analysis.years_relevant_experience : null,
        recruiterStatus: applicant?.recruiterStatus ?? null,
        candidateHref: `/dashboard/agents/recruitos/candidates/${candidateId}?jobId=${jobId}`,
      };
    });

  const { data: job, error: jobError } = await supabaseAdmin.from("jobs").select("id, title").eq("id", jobId).eq("user_id", userId).single();
  if (jobError || !job) throw new Error("JOB_LOAD_FAILED");

  const generatedAnalysisCount = Number(state.generatedAnalysisCount ?? 0);
  const initialReused = Number(state.initialReusedAnalysisCount ?? Math.max(0, analyses.size - generatedAnalysisCount));
  const resultValidation = executionResultSchema.safeParse({
    kind: "candidate_shortlist",
    job,
    requestedCount,
    consideredCount: applicants.length,
    rankedCount: ranked.length,
    reusedAnalysisCount: initialReused,
    generatedAnalysisCount,
    analysisFailureCount: failed.size,
    partial: failed.size > 0 || ranked.length < Math.min(requestedCount, applicants.length),
    candidates: ranked,
  });
  if (!resultValidation.success) throw new Error("RESULT_VALIDATION_FAILED");

  await appendEvent(userId, executionId, "progress", "Preparing shortlist", { rankedCount: ranked.length });
  await updateExecution(userId, executionId, {
    status: "completed",
    stage: "shortlist_ready",
    result: resultValidation.data,
    completed_at: new Date().toISOString(),
  });
  await captureOutcome(userId, "command_completed", { command_type: "shortlist", candidate_count: ranked.length, partial: failed.size > 0 || ranked.length < Math.min(requestedCount, applicants.length) }, executionId);
  await appendEvent(userId, executionId, "completed", "Shortlist ready", { rankedCount: ranked.length });
}

export async function advanceCommandExecution(executionId: string) {
  const user = await requireAuthenticatedUser();
  const execution = await getExecutionRow(user.id, executionId);
  if (!execution) return { ok: false as const, status: 404, error: "Task not found." };
  if (TERMINAL.has(String(execution.status))) return { ok: true as const, execution: snapshot(execution) };

  try {
    switch (String(execution.stage)) {
      case "resolving_job": await resolveJobStage(user.id, execution); break;
      case "loading_applicants": await loadApplicantStage(user.id, execution); break;
      case "analyzing_candidates": await analysisStage(user.id, execution); break;
      case "comparing_candidates": await compareStage(user.id, execution); break;
      default: throw new Error("UNKNOWN_EXECUTION_STAGE");
    }
  } catch (error) {
    console.error("RecruitOS execution runner error:", error);
    const current = await getExecutionRow(user.id, executionId);
    if (current && !TERMINAL.has(String(current.status))) {
      await updateExecution(user.id, executionId, {
        status: "failed",
        stage: "execution_failed",
        error_code: "EXECUTION_FAILED",
        error_message: "RecruitOS could not finish this task. Your candidate data was not changed; you can retry safely.",
        completed_at: new Date().toISOString(),
      });
      await appendEvent(user.id, executionId, "failed", "Task stopped because an operational step failed");
    }
  }

  const updated = await getExecutionRow(user.id, executionId);
  return updated ? { ok: true as const, execution: snapshot(updated) } : { ok: false as const, status: 404, error: "Task not found." };
}

export async function readCommandExecution(executionId: string, afterEventId = 0) {
  const user = await requireAuthenticatedUser();
  const execution = await getExecutionRow(user.id, executionId);
  if (!execution) return { ok: false as const, status: 404, error: "Task not found." };

  const { data: events, error } = await supabaseAdmin
    .from("recruitos_command_events")
    .select("id, kind, message, data, created_at")
    .eq("execution_id", executionId)
    .eq("user_id", user.id)
    .gt("id", Math.max(0, afterEventId))
    .order("id", { ascending: true })
    .limit(100);
  if (error) return { ok: false as const, status: 500, error: "Task progress could not be loaded." };

  const items = events ?? [];
  return {
    ok: true as const,
    execution: snapshot(execution),
    events: items.map((item) => ({ id: item.id, kind: item.kind, message: item.message, data: item.data ?? {}, createdAt: item.created_at })),
    nextCursor: items.at(-1)?.id ?? afterEventId,
  };
}

export async function cancelCommandExecution(executionId: string) {
  const user = await requireAuthenticatedUser();
  const execution = await getExecutionRow(user.id, executionId);
  if (!execution) return { ok: false as const, status: 404, error: "Task not found." };
  if (String(execution.status) === "completed") return { ok: false as const, status: 409, error: "This task has already completed." };
  if (TERMINAL.has(String(execution.status))) return { ok: true as const, execution: snapshot(execution) };

  const updated = await updateExecution(user.id, executionId, {
    status: "cancelled",
    stage: "cancelled",
    completed_at: new Date().toISOString(),
    error_code: null,
    error_message: null,
  });
  await appendEvent(user.id, executionId, "cancelled", "Task cancelled");
  return { ok: true as const, execution: snapshot(updated) };
}

export async function getLatestRecoverableExecution(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("recruitos_command_executions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return snapshot(data as DbRow);
}
