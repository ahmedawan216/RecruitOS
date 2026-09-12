import "server-only";

import { getEffectiveUserPlan } from "@/lib/recruitos/effective-plan-server";
import { getPlanCapacity } from "@/lib/recruitos/commercial";
import { createPlanLimitReached, getUtcUsageWindow, type PlanLimitReached } from "@/lib/recruitos/plan-limits";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RpcLimitResult = {
  allowed?: boolean;
  duplicate?: boolean;
  found?: boolean;
  jobId?: string;
  reason?: string;
};

export type PlanLimitedResult<T extends object = Record<string, never>> =
  | ({ allowed: true } & T)
  | { allowed: false; limit: PlanLimitReached };

function requireRpcResult(data: unknown): RpcLimitResult {
  if (!data || typeof data !== "object") throw new Error("PLAN_LIMIT_RPC_INVALID");
  return data as RpcLimitResult;
}

export async function createJobWithinPlanLimit(
  userId: string,
  title: string,
  description: string,
): Promise<PlanLimitedResult<{ jobId: string }>> {
  const plan = await getEffectiveUserPlan();
  const capacity = getPlanCapacity(plan);
  if (!capacity) throw new Error("PLAN_LIMIT_CONFIG_MISSING");

  const { data, error } = await supabaseAdmin.rpc("recruitos_create_job_with_limit", {
    p_user_id: userId,
    p_title: title,
    p_description: description,
    p_active_job_limit: capacity.activeJobs.amount,
  });
  if (error) throw new Error(`ACTIVE_JOB_LIMIT_RPC_FAILED:${error.message}`);

  const result = requireRpcResult(data);
  if (!result.allowed) return { allowed: false, limit: createPlanLimitReached("active_jobs", plan) };
  if (!result.jobId) throw new Error("ACTIVE_JOB_LIMIT_RPC_MISSING_JOB");
  return { allowed: true, jobId: result.jobId };
}

export async function openJobWithinPlanLimit(
  userId: string,
  jobId: string,
): Promise<PlanLimitedResult<{ found: boolean }>> {
  const plan = await getEffectiveUserPlan();
  const capacity = getPlanCapacity(plan);
  if (!capacity) throw new Error("PLAN_LIMIT_CONFIG_MISSING");

  const { data, error } = await supabaseAdmin.rpc("recruitos_open_job_with_limit", {
    p_user_id: userId,
    p_job_id: jobId,
    p_active_job_limit: capacity.activeJobs.amount,
  });
  if (error) throw new Error(`ACTIVE_JOB_LIMIT_RPC_FAILED:${error.message}`);

  const result = requireRpcResult(data);
  if (!result.allowed) return { allowed: false, limit: createPlanLimitReached("active_jobs", plan) };
  return { allowed: true, found: result.found !== false };
}

export async function reserveResumeAnalysisWithinPlanLimit(
  userId: string,
  resumeId: string,
  jobId: string,
): Promise<PlanLimitedResult<{ duplicate: boolean }>> {
  const plan = await getEffectiveUserPlan();
  const capacity = getPlanCapacity(plan);
  if (!capacity) throw new Error("PLAN_LIMIT_CONFIG_MISSING");

  const { amount, period } = capacity.resumeAnalyses;
  const window = getUtcUsageWindow(period);

  const { data, error } = await supabaseAdmin.rpc("recruitos_reserve_resume_analysis_usage", {
    p_user_id: userId,
    p_resume_id: resumeId,
    p_job_id: jobId,
    p_window_start: window.start,
    p_window_end: window.end,
    p_period: period,
    p_resume_analysis_limit: amount,
  });
  if (error) throw new Error(`RESUME_ANALYSIS_LIMIT_RPC_FAILED:${error.message}`);

  const result = requireRpcResult(data);
  if (result.reason === "not_found") throw new Error("RESUME_ANALYSIS_USAGE_RESOURCE_NOT_FOUND");
  if (!result.allowed) return { allowed: false, limit: createPlanLimitReached("resume_analyses", plan) };
  return { allowed: true, duplicate: Boolean(result.duplicate) };
}
