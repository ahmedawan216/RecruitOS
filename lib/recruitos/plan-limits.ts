import { getPlanCapacity, getPlanDefinition, type PlanKey, type UsagePeriod } from "@/lib/recruitos/commercial";

export const RECRUITOS_PRICING_URL = "https://operationos.org/pricing";

export type PlanLimitResource = "active_jobs" | "resume_analyses";

export type PlanLimitReached = Readonly<{
  code: "PLAN_LIMIT_REACHED";
  resource: PlanLimitResource;
  plan: PlanKey;
  limit: number;
  period: UsagePeriod | null;
  message: string;
}>;

export function createPlanLimitReached(resource: PlanLimitResource, plan: PlanKey): PlanLimitReached {
  const definition = getPlanDefinition(plan);
  const capacity = getPlanCapacity(plan);
  if (!definition || !capacity) throw new Error("PLAN_LIMIT_CONFIG_MISSING");

  if (resource === "active_jobs") {
    const limit = capacity.activeJobs.amount;
    return {
      code: "PLAN_LIMIT_REACHED",
      resource,
      plan,
      limit,
      period: null,
      message: `You've reached the ${definition.displayName} plan limit of ${limit} active job${limit === 1 ? "" : "s"}.`,
    };
  }

  const { amount: limit, period } = capacity.resumeAnalyses;
  return {
    code: "PLAN_LIMIT_REACHED",
    resource,
    plan,
    limit,
    period,
    message:
      period === "day"
        ? `You've used today's ${limit} resume analyses on the ${definition.displayName} plan.`
        : `You've reached this month's resume analysis limit for ${definition.displayName}.`,
  };
}

export function getUtcUsageWindow(period: UsagePeriod, now = new Date()) {
  if (period === "day") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}
