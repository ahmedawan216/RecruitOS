import "server-only";

import { getPlanForPaddlePriceId, type PaidPlanKey } from "@/lib/recruitos/paddle-billing";
import { getPaddleServerClient } from "@/lib/recruitos/paddle-server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";

export type BillingCustomer = { user_id: string; paddle_customer_id: string };

export async function getOrCreatePaddleCustomer(user: User): Promise<BillingCustomer> {
  const existing = await supabaseAdmin
    .from("recruitos_paddle_customers")
    .select("user_id,paddle_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing.error) throw new Error(`BILLING_CUSTOMER_LOOKUP_FAILED:${existing.error.message}`);
  if (existing.data) return existing.data;
  if (!user.email) throw new Error("BILLING_EMAIL_REQUIRED");

  const paddleCustomer = await getPaddleServerClient().customers.create({
    email: user.email,
    customData: { recruitos_user_id: user.id },
  });

  const inserted = await supabaseAdmin
    .from("recruitos_paddle_customers")
    .insert({ user_id: user.id, paddle_customer_id: paddleCustomer.id })
    .select("user_id,paddle_customer_id")
    .single();

  if (!inserted.error && inserted.data) return inserted.data;

  // A concurrent checkout may have won the unique user mapping race. Re-read
  // the authoritative mapping instead of trusting the newly-created remote ID.
  const recovered = await supabaseAdmin
    .from("recruitos_paddle_customers")
    .select("user_id,paddle_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (recovered.data) return recovered.data;

  throw new Error(`BILLING_CUSTOMER_CREATE_FAILED:${inserted.error?.message ?? "unknown"}`);
}

export async function getBillingOverview(userId: string) {
  const [customerResult, subscriptionsResult] = await Promise.all([
    supabaseAdmin
      .from("recruitos_paddle_customers")
      .select("paddle_customer_id")
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("recruitos_paddle_subscriptions")
      .select("paddle_subscription_id,paddle_customer_id,paddle_price_id,paddle_product_id,plan,status,current_period_starts_at,current_period_ends_at,next_billed_at,scheduled_change_action,scheduled_change_effective_at,canceled_at,last_event_occurred_at")
      .eq("user_id", userId)
      .order("last_event_occurred_at", { ascending: false }),
  ]);

  if (customerResult.error) throw new Error(`BILLING_CUSTOMER_LOOKUP_FAILED:${customerResult.error.message}`);
  if (subscriptionsResult.error) throw new Error(`BILLING_SUBSCRIPTIONS_LOOKUP_FAILED:${subscriptionsResult.error.message}`);

  return {
    paddleCustomerId: customerResult.data?.paddle_customer_id ?? null,
    subscriptions: subscriptionsResult.data ?? [],
  };
}

export function resolveVerifiedPlanFromPaddleSubscriptionItems(items: Array<{ price?: { id?: string | null } | null }>): PaidPlanKey | null {
  if (items.length !== 1) return null;
  return getPlanForPaddlePriceId(items[0]?.price?.id ?? null);
}
