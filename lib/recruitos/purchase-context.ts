import { getPlanDefinition } from "@/lib/recruitos/commercial";
import { isPaidPlanKey, type PaidPlanKey } from "@/lib/recruitos/paddle-billing";

export type PaidPurchaseContext = Readonly<{
  plan: PaidPlanKey;
  displayName: string;
  priceLabel: string;
}>;

export function getPaidPurchaseContextFromRedirect(next: string): PaidPurchaseContext | null {
  let parsed: URL;
  try {
    parsed = new URL(next, "https://recruitos.internal");
  } catch {
    return null;
  }

  if (parsed.origin !== "https://recruitos.internal" || parsed.pathname !== "/checkout") return null;
  const plan = parsed.searchParams.get("plan");
  if (!isPaidPlanKey(plan) || parsed.searchParams.size !== 1) return null;

  const definition = getPlanDefinition(plan);
  if (!definition) return null;

  return {
    plan,
    displayName: definition.displayName,
    priceLabel: `$${definition.price.amount}/month`,
  };
}
