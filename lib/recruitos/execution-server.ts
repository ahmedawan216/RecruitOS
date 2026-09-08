import "server-only";

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

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled", "clarification_required"]);
const ANALYSIS_BATCH_SIZE = 3;
const MAX_APPLICANTS = 1000;

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

type Applicant = {
  candidateId: string;
  resumeId: string | null;
  recruiterStatus: string | null;
  latestAnalysisId: string | null;
};

type AnalysisRecord = {
  id: string;
  candidate_id: string | null;
  resume_id: string;
  job_id: string | null;
  status: string;
  match_score: number | null;
  recommendation: "interview" | "maybe" | "reject" | null;
  summary: string | null;
  why_strong_match: string | null;
  matching_skills: string[] | null;
  missing_skills: string[] | null;
  potential_concerns: string[] | null;
  years_relevant_experience: number | null;
};

function workState(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function snapshot(row: Record<string, unknown>): ExecutionSnapshot {
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

async function appendEvent(userId: string, executionId: string, kind: string, message: string, data: Record<string, unknown> = {}) {
  const { error } = await supabaseAdmin.from("recruitos_command_events").insert({
    user_id: userId,
    execution_id: executionId,
    kind,
    message,
    data,
  });
  if (error) throw new Error("EXECUTION_EVENT_WRITE_FAILED");
}

async function updateExecution(userId: string, executionId: string, values: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from("recruitos_command_executions")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", executionId)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error || !data) throw new Error("EXECUTION_UPDATE_FAILED");
  return data as Record<string, unknown>;
}

async function getExecutionRow(userId: string, executionId: string) {
  const { data, error } = await supabaseAdmin
    .from("recruitos_command_executions")
    .select("*")
    .eq("id", executionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("EXECUTION_READ_FAILED");
  return data as Record<string, unknown> | null;
}

export async function createCommandExecution(input: unknown) {
  const user = await requireAuthenticatedUser();
  const validated = commandSubmissionSchema.safeParse(input);
  if (!validated.success) {
    return { ok: false as const, status: 400, error: "The command submission was malformed." };
  }

  const parsed = parseRecruitingCommand(validated.data.commandText);
  if (!parsed.ok) {
    return { ok: false as const, status: 422, code: parsed.code, error: parsed.message };
  }

  if (validated.data.jobId) {
    const { data: scopedJob, error: scopeError } = await supabaseAdmin
      .from("jobs")
      .select("id")
      .eq("id", validated.data.jobId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (scopeError || !scopedJob) {
      return { ok: false as const, status: 404, code: "JOB_NOT_FOUND", error: "The selected job is not available in your workspace." };
    }
  }

  const insertValues = {
    user_id: user.id,
    intent: parsed.value.intent,
    command_text: validated.data.commandText,
    requested_count: parsed.value.requestedCount,
    requested_job_text: parsed.value.requestedJobText,
    scope_job_id: validated.data.jobId ?? null,
    status: "queued",
    stage: "resolving_job",
    idempotency_key: validated.data.idempotencyKey,
  };

  const { data, error } = await supabaseAdmin
    .from("recruitos_command_executions")
    .insert(insertValues)
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
      if (existing) return { ok: true as const, duplicate: true, execution: snapshot(existing as Record<string, unknown>) };
    }
    console.error("RecruitOS execution create error:", { code: error.code });
    return { ok: false as const, status: 500, error: "RecruitOS could not create the task. Please try again." };
  }

  await appendEvent(user.id, data.id, "status", "Understanding request");
  return { ok: true as const, duplicate: false, execution: snapshot(data as Record<string, unknown>) };
}

async function loadApplicants(userId: string, jobId: string): Promise<Applicant[]> {
  const [{ data: matches, error: matchError }, { data: activities, error: activityError }] = await Promise.all([
    supabaseAdmin
      .from("candidate_job_matches")
      .select("candidate_id, resume_id, latest_analysis_id, recruiter_status, updated_at")
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
  for (const match of matches ?? []) {
    byCandidate.set(match.candidate_id, {
      candidateId: match.candidate_id,
      resumeId: match.resume_id,
      latestAnalysisId: match.latest_analysis_id,
      recruiterStatus: match.recruiter_status,
    });
  }
  for (const activity of activities ?? []) {
    if (byCandidate.has(activity.candidate_id)) continue;
    const metadata = workState(activity.metadata);
    byCandidate.set(activity.candidate_id, {
      candidateId: activity.candidate_id,
      resumeId: typeof metadata.resumeId === "string" ? metadata.resumeId : null,
      latestAnalysisId: null,
      recruiterStatus: null,
    });
  }
  return [...byCandidate.values()];
}

async function loadUsableAnalyses(userId: string, jobId: string, applicants: Applicant[]) {
  const candidateIds = applicants.map((item) => item.candidateId);
  if (!candidateIds.length) return new Map<string, AnalysisRecord>();

  const { data, error } = await supabaseAdmin
    .from("resume_analyses")
    .select("id, candidate_id, resume_id, job_id, status, match_score, recommendation, summary, why_strong_match, matching_skills, missing_skills, potential_concerns, years_relevant_experience, created_at")
    .eq("user_id", userId)
    .eq("job_id", jobId)
    .eq("status", "success")
    .in("candidate_id", candidateIds)
    .order("created_at", { ascending: false })
    .limit(MAX_APPLICANTS);
  if (error) throw new Error("ANALYSIS_LOAD_FAILED");

  const map = new Map<string, AnalysisRecord>();
  for (const item of data ?? []) {
    if (!item.candidate_id || map.has(item.candidate_id)) continue;
    if (typeof item.match_score !== "number" || item.match_score < 0 || item.match_score > 100) continue;
    map.set(item.candidate_id, item as AnalysisRecord);
  }
  return map;
}

async function resolveJobStage(userId: string, execution: Record<string, unknown>) {
  const { data: jobs, error } = await supabaseAdmin
    .from("jobs")
    .select("id, title")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error("JOB_LOAD_FAILED");

  const resolution = resolveJobReference(
    jobs ?? [],
    typeof execution.requested_job_text === "string" ? execution.requested_job_text : null,
    typeof execution.scope_job_id === "string" ? execution.scope_job_id : null,
  );

  if (resolution.status === "ambiguous") {
    const options = resolution.jobs.slice(0, 6).map((job) => ({ id: job.id, title: job.title }));
    await updateExecution(userId, String(execution.id), {
      status: "clarification_required",
      stage: "job_clarification",
      work_state: { jobOptions: options },
      error_code: "AMBIGUOUS_JOB",
      error_message: "More than one job matches this request. Choose a job in Scope and run it again.",
      completed_at: new Date().toISOString(),
    });
    await appendEvent(userId, String(execution.id), "clarification", "More than one job matches this request", { jobs: options });
    return;
  }

  if (resolution.status === "not_found") {
    await updateExecution(userId, String(execution.id), {
      status: "failed",
      stage: "job_not_found",
      error_code: "JOB_NOT_FOUND",
      error_message: "RecruitOS could not find that job in your workspace. Choose a job in Scope or use its exact title.",
      completed_at: new Date().toISOString(),
    });
    await appendEvent(userId, String(execution.id), "failed", "Requested job was not found");
    return;
  }

  if (resolution.status === "scope_conflict") {
    await updateExecution(userId, String(execution.id), {
      status: "clarification_required",
      stage: "job_scope_conflict",
      error_code: "JOB_SCOPE_CONFLICT",
      error_message: `The command names a different role from the selected scope (${resolution.job.title}). Align the command and Scope, then run it again.`,
      completed_at: new Date().toISOString(),
    });
    await appendEvent(userId, String(execution.id), "clarification", "Command and selected job scope do not match");
    return;
  }

  await updateExecution(userId, String(execution.id), {
    status: "running",
    stage: "loading_applicants",
    resolved_job_id: resolution.job.id,
    started_at: execution.started_at ?? new Date().toISOString(),
    work_state: { jobTitle: resolution.job.title },
    error_code: null,
    error_message: null,
  });
  await appendEvent(userId, String(execution.id), "progress", `Found ${resolution.job.title}`, { jobId: resolution.job.id });
}

async function loadApplicantStage(userId: string, execution: Record<string, unknown>) {
  const jobId = String(execution.resolved_job_id);
  const applicants = await loadApplicants(userId, jobId);
  if (!applicants.length) {
    await updateExecution(userId, String(execution.id), {
      status: "failed",
      stage: "no_applicants",
      error_code: "NO_APPLICANTS",
      error_message: "No applicants are associated with this job yet. Upload resumes for this role, then run the task again.",
      completed_at: new Date().toISOString(),
    });
    await appendEvent(userId, String(execution.id), "failed", "No applicants found for this job");
    return;
  }

  const analyses = await loadUsableAnalyses(userId, jobId, applicants);
  const missingCount = applicants.length - analyses.size;
  const state = workState(execution.work_state);
  await updateExecution(userId, String(execution.id), {
    stage: missingCount > 0 ? "analyzing_candidates" : "comparing_candidates",
    work_state: {
      ...state,
      applicantCount: applicants.length,
      initialReusedAnalysisCount: analyses.size,
      generatedAnalysisCount: Number(state.generatedAnalysisCount ?? 0),
      failedCandidateIds: stringArray(state.failedCandidateIds),
    },
  });
  await appendEvent(userId, String(execution.id), "progress", `Loading ${applicants.length} applicants`, { count: applicants.length });
  if (analyses.size > 0) {
    await appendEvent(userId, String(execution.id), "progress", `Using ${analyses.size} existing assessments`, { count: analyses.size });
  }
  if (missingCount > 0) {
    await appendEvent(userId, String(execution.id), "progress", `${missingCount} applicants need assessment`, { count: missingCount });
  }
}

async function analysisStage(userId: string, execution: Record<string, unknown>) {
  const executionId = String(execution.id);
  const jobId = String(execution.resolved_job_id);
  const applicants = await loadApplicants(userId, jobId);
  const analyses = await loadUsableAnalyses(userId, jobId, applicants);
  const state = workState(execution.work_state);
  const failed = new Set(stringArray(state.failedCandidateIds));
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
      if (result.success) {
        generated += 1;
      } else {
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

async function compareStage(userId: string, execution: Record<string, unknown>) {
  const executionId = String(execution.id);
  const jobId = String(execution.resolved_job_id);
  const state = workState(execution.work_state);
  const applicants = await loadApplicants(userId, jobId);
  const analyses = await loadUsableAnalyses(userId, jobId, applicants);
  const failed = new Set(stringArray(state.failedCandidateIds));

  await appendEvent(userId, executionId, "progress", "Comparing strongest candidates", { assessedCount: analyses.size });

  const candidateIds = [...analyses.keys()];
  const { data: candidates, error: candidateError } = candidateIds.length
    ? await supabaseAdmin
      .from("candidates")
      .select("id, full_name, email")
      .eq("user_id", userId)
      .in("id", candidateIds)
    : { data: [], error: null };
  if (candidateError) throw new Error("CANDIDATE_LOAD_FAILED");
  const candidateMap = new Map((candidates ?? []).map((item) => [item.id, item]));
  const applicantMap = new Map(applicants.map((item) => [item.candidateId, item]));

  const ranked = [...analyses.entries()]
    .sort(([, a], [, b]) => (b.match_score ?? -1) - (a.match_score ?? -1) || a.id.localeCompare(b.id))
    .slice(0, Number(execution.requested_count))
    .map(([candidateId, analysis], index) => {
      const candidate = candidateMap.get(candidateId);
      const applicant = applicantMap.get(candidateId);
      const strengths = Array.isArray(analysis.matching_skills) ? analysis.matching_skills.filter(Boolean) : [];
      const evidence = [analysis.why_strong_match, ...strengths.slice(0, 3)].filter((item): item is string => Boolean(item && item.trim()));
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

  const { data: job, error: jobError } = await supabaseAdmin
    .from("jobs")
    .select("id, title")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();
  if (jobError || !job) throw new Error("JOB_LOAD_FAILED");

  const generatedAnalysisCount = Number(state.generatedAnalysisCount ?? 0);
  const initialReused = Number(state.initialReusedAnalysisCount ?? Math.max(0, analyses.size - generatedAnalysisCount));
  const resultValidation = executionResultSchema.safeParse({
    kind: "candidate_shortlist",
    job,
    requestedCount: Number(execution.requested_count),
    consideredCount: applicants.length,
    rankedCount: ranked.length,
    reusedAnalysisCount: initialReused,
    generatedAnalysisCount,
    analysisFailureCount: failed.size,
    partial: failed.size > 0 || ranked.length < Math.min(Number(execution.requested_count), applicants.length),
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
  await appendEvent(userId, executionId, "completed", "Shortlist ready", { rankedCount: ranked.length });
}

export async function advanceCommandExecution(executionId: string) {
  const user = await requireAuthenticatedUser();
  const execution = await getExecutionRow(user.id, executionId);
  if (!execution) return { ok: false as const, status: 404, error: "Task not found." };
  if (TERMINAL_STATUSES.has(String(execution.status))) return { ok: true as const, execution: snapshot(execution) };

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
    if (current && !TERMINAL_STATUSES.has(String(current.status))) {
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

  return {
    ok: true as const,
    execution: snapshot(execution),
    events: (events ?? []).map((item) => ({ id: item.id, kind: item.kind, message: item.message, data: item.data ?? {}, createdAt: item.created_at })),
    nextCursor: events?.length ? events[events.length - 1].id : afterEventId,
  };
}

export async function cancelCommandExecution(executionId: string) {
  const user = await requireAuthenticatedUser();
  const execution = await getExecutionRow(user.id, executionId);
  if (!execution) return { ok: false as const, status: 404, error: "Task not found." };
  if (String(execution.status) === "completed") {
    return { ok: false as const, status: 409, error: "This task has already completed." };
  }
  if (TERMINAL_STATUSES.has(String(execution.status))) return { ok: true as const, execution: snapshot(execution) };

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
  return snapshot(data as Record<string, unknown>);
}
