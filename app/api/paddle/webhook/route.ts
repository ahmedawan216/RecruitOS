import { EventName } from "@paddle/paddle-node-sdk";
import { NextResponse } from "next/server";

import { resolveVerifiedPlanFromPaddleSubscriptionItems } from "@/lib/recruitos/billing-server";
import { getPaddleServerClient, getPaddleWebhookSecret } from "@/lib/recruitos/paddle-server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("paddle-signature");
  if (!signature) return NextResponse.json({ error: "Missing webhook signature." }, { status: 400 });

  const rawBody = await request.text();
  let event;
  try {
    event = await getPaddleServerClient().webhooks.unmarshal(rawBody, getPaddleWebhookSecret(), signature);
  } catch (error) {
    console.warn("Rejected invalid Paddle webhook signature.", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  if (event.eventType !== EventName.SubscriptionCreated && event.eventType !== EventName.SubscriptionUpdated) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const subscription = event.data;
  const plan = resolveVerifiedPlanFromPaddleSubscriptionItems(subscription.items);
  const primaryPriceId = subscription.items.length === 1 ? subscription.items[0]?.price?.id ?? null : null;
  const primaryProductId = subscription.items.length === 1 ? subscription.items[0]?.price?.productId ?? null : null;

  if (!primaryPriceId) {
    console.warn("Paddle subscription webhook had an unsupported item shape.", { eventId: event.eventId, subscriptionId: subscription.id });
  }

  const { data, error } = await supabaseAdmin.rpc("sync_recruitos_paddle_subscription_event", {
    p_event_id: event.eventId,
    p_notification_id: event.notificationId,
    p_event_type: event.eventType,
    p_occurred_at: event.occurredAt,
    p_paddle_subscription_id: subscription.id,
    p_paddle_customer_id: subscription.customerId,
    p_paddle_price_id: primaryPriceId ?? "unknown",
    p_paddle_product_id: primaryProductId,
    p_plan: plan,
    p_status: subscription.status,
    p_current_period_starts_at: subscription.currentBillingPeriod?.startsAt ?? null,
    p_current_period_ends_at: subscription.currentBillingPeriod?.endsAt ?? null,
    p_next_billed_at: subscription.nextBilledAt ?? null,
    p_scheduled_change_action: subscription.scheduledChange?.action ?? null,
    p_scheduled_change_effective_at: subscription.scheduledChange?.effectiveAt ?? null,
    p_canceled_at: subscription.canceledAt ?? null,
  });

  if (error) {
    console.error("Verified Paddle webhook could not be synchronized:", { eventId: event.eventId, code: error.code, message: error.message });
    return NextResponse.json({ error: "Webhook synchronization failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true, result: data });
}
