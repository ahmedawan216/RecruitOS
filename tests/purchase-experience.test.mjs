import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const signup = read("../app/sign-up/page.tsx");
const signin = read("../app/sign-in/page.tsx");
const authForm = read("../components/auth/auth-form.tsx");
const auth = read("../lib/supabase/auth.ts");
const authActions = read("../app/auth/actions.ts");
const authCallback = read("../app/auth/callback/route.ts");
const purchaseContext = read("../lib/recruitos/purchase-context.ts");
const paidAuth = read("../components/auth/paid-auth-context.tsx");
const checkoutPage = read("../app/checkout/page.tsx");
const checkout = read("../components/recruitos/billing/checkout-handoff.tsx");
const activationPage = read("../app/checkout/success/page.tsx");
const activation = read("../components/recruitos/billing/checkout-activation.tsx");
const activationApi = read("../app/api/recruitos/billing/activation/route.ts");
const billingServer = read("../lib/recruitos/billing-server.ts");
const billingPanel = read("../components/recruitos/billing/billing-panel.tsx");
const portal = read("../app/api/recruitos/billing/portal/route.ts");
const resolver = read("../lib/recruitos/effective-plan-server.ts");
const paddleBilling = read("../lib/recruitos/paddle-billing.ts");
const checkoutApi = read("../app/api/recruitos/billing/checkout/route.ts");
const webhook = read("../app/api/paddle/webhook/route.ts");
const usageMigration = read("../supabase/migrations/20260912154500_recruitos_phase3d_usage_limits.sql");

test("normal Free signup has no paid plan context unless a validated checkout intent exists", () => {
  assert.ok(signup.includes("purchaseContext ? <PaidAuthContext"));
  assert.ok(purchaseContext.includes('parsed.pathname !== "/checkout"'));
});

test("Standard and Pro auth context use canonical monthly prices", () => {
  const commercial = read("../lib/recruitos/commercial.ts");
  assert.ok(paidAuth.includes("context.priceLabel"));
  assert.ok(purchaseContext.includes("getPlanDefinition(plan)"));
  assert.ok(commercial.includes("amount: 39"));
  assert.ok(commercial.includes("amount: 69"));
});

test("invalid and Free values cannot generate paid auth context or checkout", () => {
  assert.ok(purchaseContext.includes("isPaidPlanKey(plan)"));
  assert.ok(checkoutPage.includes("isPaidPlanKey(plan)"));
  assert.ok(checkoutApi.includes("isPaidPlanKey(plan)"));
});

test("paid intent survives sign-up and sign-in switching, auth actions, and callback", () => {
  assert.ok(authForm.includes("encodeURIComponent(next)"));
  assert.ok(signup.includes("getSafeRedirectPath(params.next)"));
  assert.ok(signin.includes("getSafeRedirectPath(params.next)"));
  assert.ok(authActions.includes('callbackUrl.searchParams.set("next", next)'));
  assert.ok(authCallback.includes('getSafeRedirectPath(url.searchParams.get("next"))'));
});

test("unsafe and external next destinations remain rejected", () => {
  assert.ok(auth.includes('value.startsWith("//")'));
  assert.ok(auth.includes('parsed.origin !== "https://recruitos.internal"'));
  assert.ok(auth.includes('return "/dashboard"'));
});

test("checkout initialization is guarded and Retry resets only after failure", () => {
  assert.ok(checkout.includes("if (startedRef.current) return"));
  assert.ok(checkout.includes("startedRef.current = true"));
  assert.ok(checkout.includes("startedRef.current = false"));
  assert.ok(checkout.includes("Try again"));
  assert.ok(checkout.includes("useCallback"));
});

test("checkout browser sends only plan and success goes to activation", () => {
  assert.ok(checkout.includes("JSON.stringify({ plan })"));
  assert.ok(checkout.includes("/checkout/success?plan=${plan}"));
  assert.equal(checkout.includes("setEffectivePlan"), false);
  assert.equal(checkout.includes("localStorage"), false);
});

test("post-payment activation waits for server effective plan verification", () => {
  assert.ok(activationApi.includes("getEffectiveUserPlan()"));
  assert.ok(activationApi.includes("verified: effectivePlan === plan"));
  assert.ok(activationPage.includes("initialVerified={effectivePlan === plan}"));
  assert.ok(activation.includes("Payment received. We&apos;re activating RecruitOS."));
  assert.ok(activation.includes("RecruitOS {displayName} is ready."));
});

test("activation polling is bounded and offers manual recovery", () => {
  assert.ok(activation.includes("MAX_AUTOMATIC_CHECKS = 8"));
  assert.ok(activation.includes("CHECK_INTERVAL_MS = 1500"));
  assert.ok(activation.includes('setState("delayed")'));
  assert.ok(activation.includes("Check again"));
});

test("existing paid users cannot trivially create a duplicate checkout", () => {
  assert.ok(checkoutPage.includes('effectivePlan === "free"'));
  assert.ok(checkoutPage.includes("ExistingPaidPlanHandoff"));
  assert.ok(checkout.includes("/api/recruitos/billing/portal"));
});

test("stale mismatched subscription metadata cannot drive current billing or portal access", () => {
  assert.ok(billingServer.includes("isVerifiedCurrentBillingSubscription"));
  assert.ok(billingServer.includes("getPlanForPaddlePriceId(subscription.paddle_price_id)"));
  assert.ok(billingServer.includes("subscription.plan === mappedPlan"));
  assert.ok(billingServer.includes('effectivePlan === "free"'));
  assert.ok(portal.includes("getVerifiedBillingPresentation"));
  assert.ok(billingPanel.includes("isPaid && data.paddleCustomerId && data.currentSubscription"));
});

test("legitimate active scheduled cancellation remains paid and manageable until actual cancel", () => {
  assert.ok(paddleBilling.includes('status === "active" || status === "trialing" || status === "past_due"'));
  assert.equal(paddleBilling.includes("scheduled_change"), false);
  assert.ok(billingPanel.includes("scheduledChangeAction"));
  assert.ok(portal.includes("overview.subscriptions.map"));
});

test("Paddle prices remain server mapped and webhook/effective-plan authority is unchanged", () => {
  assert.ok(checkoutApi.includes("getPaddlePriceIdForPlan(plan)"));
  assert.equal(checkout.includes("pri_"), false);
  assert.ok(webhook.includes("webhooks.unmarshal"));
  assert.ok(webhook.includes("sync_recruitos_paddle_subscription_event"));
  assert.ok(resolver.includes("resolvePlanFromBillingRecords"));
});

test("Phase 3D usage enforcement remains unchanged", () => {
  assert.ok(usageMigration.includes("recruitos_create_job_with_limit"));
  assert.ok(usageMigration.includes("recruitos_reserve_resume_analysis_usage"));
  assert.ok(usageMigration.includes("pg_advisory_xact_lock"));
});