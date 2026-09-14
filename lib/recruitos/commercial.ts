export const PLAN_KEYS = ["free", "standard", "pro"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const FEATURE_KEYS = [
  "jobs",
  "candidates",
  "resumeAnalysis",
  "candidateComparison",
  "commands",
  "contextualFollowUps",
  "humanReviewedActions",
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const LIMIT_KEYS = [
  "activeJobs",
  "candidateVolume",
  "resumeAnalysisVolume",
  "commandExecutions",
  "batchSize",
] as const;
export type LimitKey = (typeof LIMIT_KEYS)[number];

export type BillingInterval = "month";
export type SupportTier = "standard" | "priority";
export type ConfiguredLimit = number | null;
export type UsagePeriod = "day" | "month";

export type PlanCapacity = Readonly<{
  activeJobs: Readonly<{ amount: number; period: null }>;
  resumeAnalyses: Readonly<{ amount: number; period: UsagePeriod }>;
}>;

export type PlanDefinition = Readonly<{
  key: PlanKey;
  displayName: string;
  price: Readonly<{
    amount: number;
    currency: "USD";
    interval: BillingInterval | null;
  }>;
  description: string;
  features: Readonly<Record<FeatureKey, boolean>>;
  limits: Readonly<Record<LimitKey, ConfiguredLimit>>;
  capacity: PlanCapacity;
  supportTier: SupportTier | null;
  recommended: boolean;
}>;

export const DEFAULT_EFFECTIVE_PLAN: PlanKey = "free";
export const RECOMMENDED_COMMERCIAL_PLAN: PlanKey = "standard";

const ALL_CORE_FEATURES: Readonly<Record<FeatureKey, boolean>> = Object.freeze({
  jobs: true,
  candidates: true,
  resumeAnalysis: true,
  candidateComparison: true,
  commands: true,
  contextualFollowUps: true,
  humanReviewedActions: true,
});

const UNCONFIGURED_LIMITS: Readonly<Record<LimitKey, ConfiguredLimit>> = Object.freeze({
  activeJobs: null,
  candidateVolume: null,
  resumeAnalysisVolume: null,
  commandExecutions: null,
  batchSize: null,
});

function makeCapacity(activeJobs: number, resumeAnalyses: number, period: UsagePeriod): PlanCapacity {
  return Object.freeze({
    activeJobs: Object.freeze({ amount: activeJobs, period: null }),
    resumeAnalyses: Object.freeze({ amount: resumeAnalyses, period }),
  });
}

function freezePlan(
  definition: Omit<PlanDefinition, "features" | "limits" | "capacity">,
  capacity: PlanCapacity,
): PlanDefinition {
  return Object.freeze({
    ...definition,
    features: ALL_CORE_FEATURES,
    capacity,
    limits: Object.freeze({
      ...UNCONFIGURED_LIMITS,
      activeJobs: capacity.activeJobs.amount,
      resumeAnalysisVolume: capacity.resumeAnalyses.amount,
    }),
  });
}

export const PLAN_CATALOG: Readonly<Record<PlanKey, PlanDefinition>> = Object.freeze({
  free: freezePlan(
    {
      key: "free",
      displayName: "Free",
      price: Object.freeze({ amount: 0, currency: "USD", interval: null }),
      description: "Free validation plan with no credit card required.",
      supportTier: null,
      recommended: false,
    },
    makeCapacity(3, 25, "month"),
  ),
  standard: freezePlan(
    {
      key: "standard",
      displayName: "Standard",
      price: Object.freeze({ amount: 39, currency: "USD", interval: "month" }),
      description: "Recommended commercial plan for RecruitOS.",
      supportTier: null,
      recommended: true,
    },
    makeCapacity(25, 300, "month"),
  ),
  pro: freezePlan(
    {
      key: "pro",
      displayName: "Pro",
      price: Object.freeze({ amount: 69, currency: "USD", interval: "month" }),
      description: "Higher-volume paid plan for RecruitOS.",
      supportTier: null,
      recommended: false,
    },
    makeCapacity(100, 1000, "month"),
  ),
});

export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === "string" && (PLAN_KEYS as readonly string[]).includes(value);
}

export function isFeatureKey(value: unknown): value is FeatureKey {
  return typeof value === "string" && (FEATURE_KEYS as readonly string[]).includes(value);
}

export function isLimitKey(value: unknown): value is LimitKey {
  return typeof value === "string" && (LIMIT_KEYS as readonly string[]).includes(value);
}

export function getPlanDefinition(planKey: unknown): PlanDefinition | null {
  return isPlanKey(planKey) ? PLAN_CATALOG[planKey] : null;
}

export function getPlanCapacity(planKey: unknown): PlanCapacity | null {
  return getPlanDefinition(planKey)?.capacity ?? null;
}

export function getPlanLimits(planKey: unknown): Readonly<Record<LimitKey, ConfiguredLimit>> | null {
  return getPlanDefinition(planKey)?.limits ?? null;
}

export function canUseFeature(planKey: unknown, feature: unknown): boolean {
  const plan = getPlanDefinition(planKey);
  if (!plan || !isFeatureKey(feature)) return false;
  return plan.features[feature];
}

export function isUsageAtOrAboveLimit(configuredLimit: ConfiguredLimit, currentUsage: number): boolean {
  if (configuredLimit === null) return false;
  if (!Number.isFinite(currentUsage) || currentUsage < 0) return false;
  return currentUsage >= configuredLimit;
}

export function hasReachedLimit(planKey: unknown, limitKey: unknown, currentUsage: number): boolean {
  const limits = getPlanLimits(planKey);
  if (!limits || !isLimitKey(limitKey)) return false;
  return isUsageAtOrAboveLimit(limits[limitKey], currentUsage);
}
