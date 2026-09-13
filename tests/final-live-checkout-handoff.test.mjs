import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const checkoutPage = read("../app/checkout/page.tsx");
const checkoutClient = read("../components/recruitos/billing/checkout-handoff.tsx");
const checkoutApi = read("../app/api/recruitos/billing/checkout/route.ts");
const auth = read("../lib/supabase/auth.ts");
const authActions = read("../app/auth/actions.ts");
const authCallback = read("../app/auth/callback/route.ts");
const signup = read("../app/sign-up/page.tsx");
const signin = read("../app/sign-in/page.tsx");
const authForm = read("../components/auth/auth-form.tsx");
const resolver = read("../lib/recruitos/effective-plan-server.ts");
const webhook = read("../app/api/paddle/webhook/route.ts");
const paddleClient = read("../lib/recruitos/paddle-client.ts");
const paddleServer = read("../lib/recruitos/paddle-server.ts");

test("only Standard and Pro enter the paid handoff", () => {
  assert.ok(checkoutPage.includes("isPaidPlanKey(plan)"));
  assert.ok(checkoutPage.includes("Only Standard and Pro can start paid checkout."));
  assert.ok(checkoutApi.includes("isPaidPlanKey(plan)"));
});

test("browser cannot inject a Paddle price or authoritative user id", () => {
  assert.ok(checkoutApi.includes("getPaddlePriceIdForPlan(plan)"));
  assert.equal(checkoutApi.includes("body.priceId"), false);
  assert.equal(checkoutApi.includes("body.userId"), false);
  assert.equal(checkoutClient.includes("URLSearchParams"), false);
});

test("unauthenticated checkout preserves an allowlisted plan through auth", () => {
  assert.ok(checkoutPage.includes("getAuthenticatedUser()"));
  assert.ok(checkoutPage.includes("/sign-up?next="));
  assert.ok(auth.includes('parsed.pathname === "/checkout"'));
  assert.ok(auth.includes("isPaidPlanKey(plan)"));
  assert.ok(auth.includes("parsed.searchParams.size === 1"));
  assert.ok(signup.includes("getSafeRedirectPath(params.next)"));
  assert.ok(signin.includes("getSafeRedirectPath(params.next)"));
  assert.ok(authForm.includes('name="next" value={next}'));
  assert.ok(authActions.includes('callbackUrl.searchParams.set("next", next)'));
  assert.ok(authCallback.includes('getSafeRedirectPath(url.searchParams.get("next"))'));
});

test("open redirects fall back to the dashboard", () => {
  assert.ok(auth.includes('value.startsWith("//")'));
  assert.ok(auth.includes('parsed.origin !== "https://recruitos.internal"'));
  assert.ok(auth.includes('return "/dashboard"'));
});

test("authenticated Free users reach the existing checkout endpoint", () => {
  assert.ok(checkoutPage.includes('effectivePlan === "free"'));
  assert.ok(checkoutPage.includes("<CheckoutHandoff"));
  assert.ok(checkoutClient.includes('fetch("/api/recruitos/billing/checkout"'));
  assert.ok(checkoutClient.includes("JSON.stringify({ plan })"));
});

test("checkout completion never grants entitlement in browser state", () => {
  assert.equal(checkoutClient.includes("setEffectivePlan"), false);
  assert.equal(checkoutClient.includes("localStorage"), false);
  assert.ok(checkoutClient.includes("/checkout/success?plan=${plan}"));
  assert.ok(checkoutClient.includes("activated only after the verified billing webhook confirms your subscription"));
});

test("verified paid subscribers bypass fresh checkout and use Paddle subscription management", () => {
  assert.ok(checkoutPage.includes('effectivePlan === "free"'));
  assert.ok(checkoutPage.includes("<CheckoutHandoff"));
  assert.ok(checkoutPage.includes("<ExistingPaidPlanHandoff"));
  assert.ok(checkoutClient.includes('fetch("/api/recruitos/billing/portal"'));
  assert.ok(checkoutClient.includes("const samePlan = currentPlan === selectedPlan"));
  assert.ok(checkoutClient.includes("already verified on your account"));
  assert.ok(checkoutClient.includes("without creating a second subscription"));
});

test("effective-plan and webhook authority remain intact", () => {
  assert.ok(resolver.includes("resolvePlanFromBillingRecords"));
  assert.ok(resolver.includes("recruitos_paddle_subscriptions"));
  assert.ok(webhook.includes("webhooks.unmarshal"));
  assert.ok(webhook.includes("sync_recruitos_paddle_subscription_event"));
});

test("Paddle clients support configured Live and Sandbox environments with no embedded prices", () => {
  assert.ok(paddleClient.includes('value === "production" || value === "live"'));
  assert.ok(paddleClient.includes('environment === "sandbox"'));
  assert.ok(paddleServer.includes("Environment.production"));
  assert.ok(paddleServer.includes("Environment.sandbox"));
  assert.equal(/pri_[a-zA-Z0-9]/.test(paddleClient + paddleServer), false);
});