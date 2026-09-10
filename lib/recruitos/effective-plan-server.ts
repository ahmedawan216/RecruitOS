import "server-only";

import { DEFAULT_EFFECTIVE_PLAN, type PlanKey } from "@/lib/recruitos/commercial";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

/**
 * Resolves the authoritative effective plan for the current authenticated user.
 *
 * Phase 3A has no paid-plan persistence. Authenticated users therefore resolve
 * to Free. A future billing integration must replace this with a server-side
 * paid-plan source rather than accepting a plan value from the browser.
 */
export async function getEffectiveUserPlan(): Promise<PlanKey> {
  await requireAuthenticatedUser();
  return DEFAULT_EFFECTIVE_PLAN;
}
