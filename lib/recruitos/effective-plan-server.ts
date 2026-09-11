import "server-only";

import type { PlanKey } from "@/lib/recruitos/commercial";
import { resolvePlanFromBillingRecords } from "@/lib/recruitos/paddle-billing";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function getEffectiveUserPlan(): Promise<PlanKey> {
  const user = await requireAuthenticatedUser();
  const { data, error } = await supabaseAdmin
    .from("recruitos_paddle_subscriptions")
    .select("plan,status,paddle_price_id")
    .eq("user_id", user.id);

  if (error) {
    console.error("RecruitOS billing plan lookup failed:", error.message);
    return "free";
  }

  return resolvePlanFromBillingRecords(data ?? []);
}
