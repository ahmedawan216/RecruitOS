import type { PlanKey } from "@/lib/recruitos/commercial";

export const PADDLE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due", "paused", "canceled"] as const;
export type PaddleSubscriptionStatus = (typeof PADDLE_SUBSCRIPTION_STATUSES)[number];
export type PaidPlanKey = Extract<PlanKey, "standard" | "pro">;

export type PaddlePriceConfig = Readonly<{
  standard: string;
  pro: string;
}>;

export function isPaidPlanKey(value: unknown): value is PaidPlanKey {
  return value === "standard" || value === "pro";
}

export function isPaddleSubscriptionStatus(value: unknown): value is PaddleSubscriptionStatus {
  return typeof value === "string" && (PADDLE_SUBSCRIPTION_STATUSES as readonly string[]).includes(value);
}

export function getConfiguredPaddlePrices(env: NodeJS.ProcessEnv = process.env): PaddlePriceConfig {
  return {
    standard: env.PADDLE_STANDARD_PRICE_ID?.trim() ?? "",
    pro: env.PADDLE_PRO_PRICE_ID?.trim() ?? "",
  };
}

export function getPaddlePriceIdForPlan(plan: unknown, env: NodeJS.ProcessEnv = process.env): string | null {
  if (!isPaidPlanKey(plan)) return null;
  const prices = getConfiguredPaddlePrices(env);
  return prices[plan] || null;
}

export function getPlanForPaddlePriceId(priceId: unknown, env: NodeJS.ProcessEnv = process.env): PaidPlanKey | null {
  if (typeof priceId !== "string" || !priceId) return null;
  const prices = getConfiguredPaddlePrices(env);
  if (prices.standard && priceId === prices.standard) return "standard";
  if (prices.pro && priceId === prices.pro) return "pro";
  return null;
}

/**
 * Paddle recommends retaining access for trialing, active, and past_due
 * subscriptions. RecruitOS does not configure trials, but trialing remains an
 * entitling defensive state if Paddle ever emits it for a verified known price.
 */
export function isEntitlingPaddleStatus(status: unknown): status is Extract<PaddleSubscriptionStatus, "active" | "trialing" | "past_due"> {
  return status === "active" || status === "trialing" || status === "past_due";
}

export type BillingSubscriptionRecord = Readonly<{
  plan: string | null;
  status: string;
  paddle_price_id: string;
}>;

export function resolvePlanFromBillingRecords(
  records: readonly BillingSubscriptionRecord[],
  env: NodeJS.ProcessEnv = process.env,
): PlanKey {
  let resolved: PlanKey = "free";

  for (const record of records) {
    if (!isEntitlingPaddleStatus(record.status)) continue;
    const mappedPlan = getPlanForPaddlePriceId(record.paddle_price_id, env);
    if (!mappedPlan || record.plan !== mappedPlan) continue;
    if (mappedPlan === "pro") return "pro";
    resolved = "standard";
  }

  return resolved;
}
