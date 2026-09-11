import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const billingSource = readFileSync(new URL("../lib/recruitos/paddle-billing.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(billingSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const mod = { exports: {} };
new Function("exports", "module", "process", compiled.outputText)(mod.exports, mod, process);
const billing = mod.exports;

const env = {
  PADDLE_STANDARD_PRICE_ID: "pri_standard",
  PADDLE_PRO_PRICE_ID: "pri_pro",
};

test("Standard maps only to configured Standard Paddle price", () => {
  assert.equal(billing.getPaddlePriceIdForPlan("standard", env), "pri_standard");
  assert.equal(billing.getPlanForPaddlePriceId("pri_standard", env), "standard");
});

test("Pro maps only to configured Pro Paddle price", () => {
  assert.equal(billing.getPaddlePriceIdForPlan("pro", env), "pri_pro");
  assert.equal(billing.getPlanForPaddlePriceId("pri_pro", env), "pro");
});

test("Free and unknown plans cannot start provider checkout mapping", () => {
  assert.equal(billing.getPaddlePriceIdForPlan("free", env), null);
  assert.equal(billing.getPaddlePriceIdForPlan("enterprise", env), null);
});

test("arbitrary Paddle price IDs cannot map to paid RecruitOS plans", () => {
  assert.equal(billing.getPlanForPaddlePriceId("pri_attacker", env), null);
});

test("no billing record resolves to Free", () => {
  assert.equal(billing.resolvePlanFromBillingRecords([], env), "free");
});

test("valid Standard and Pro subscription states resolve server plan", () => {
  assert.equal(billing.resolvePlanFromBillingRecords([{ plan: "standard", status: "active", paddle_price_id: "pri_standard" }], env), "standard");
  assert.equal(billing.resolvePlanFromBillingRecords([{ plan: "pro", status: "past_due", paddle_price_id: "pri_pro" }], env), "pro");
});

test("unknown or mismatched Paddle prices cannot grant paid access", () => {
  assert.equal(billing.resolvePlanFromBillingRecords([{ plan: "pro", status: "active", paddle_price_id: "pri_unknown" }], env), "free");
  assert.equal(billing.resolvePlanFromBillingRecords([{ plan: "pro", status: "active", paddle_price_id: "pri_standard" }], env), "free");
});

test("paused and canceled subscriptions resolve to Free", () => {
  assert.equal(billing.resolvePlanFromBillingRecords([{ plan: "standard", status: "paused", paddle_price_id: "pri_standard" }], env), "free");
  assert.equal(billing.resolvePlanFromBillingRecords([{ plan: "pro", status: "canceled", paddle_price_id: "pri_pro" }], env), "free");
});

test("Pro wins if multiple valid paid subscriptions exist", () => {
  assert.equal(billing.resolvePlanFromBillingRecords([
    { plan: "standard", status: "active", paddle_price_id: "pri_standard" },
    { plan: "pro", status: "active", paddle_price_id: "pri_pro" },
  ], env), "pro");
});

test("checkout route accepts plan only and never client price or user id authority", () => {
  const source = readFileSync(new URL("../app/api/recruitos/billing/checkout/route.ts", import.meta.url), "utf8");
  assert.match(source, /requireAuthenticatedUser\(\)/);
  assert.match(source, /isPaidPlanKey\(plan\)/);
  assert.match(source, /getPaddlePriceIdForPlan\(plan\)/);
  assert.doesNotMatch(source, /body\.(priceId|user_id|userId)/);
  assert.match(source, /assertSameOriginRequest\(request\)/);
});

test("webhook verifies raw body before subscription synchronization", () => {
  const source = readFileSync(new URL("../app/api/paddle/webhook/route.ts", import.meta.url), "utf8");
  assert.match(source, /request\.text\(\)/);
  assert.match(source, /webhooks\.unmarshal\(/);
  assert.match(source, /paddle-signature/);
  assert.match(source, /sync_recruitos_paddle_subscription_event/);
});

test("invalid webhook signatures are rejected before database synchronization", () => {
  const source = readFileSync(new URL("../app/api/paddle/webhook/route.ts", import.meta.url), "utf8");
  const unmarshalIndex = source.indexOf("webhooks.unmarshal");
  const rpcIndex = source.indexOf(".rpc(\"sync_recruitos_paddle_subscription_event\"");
  assert.ok(unmarshalIndex >= 0 && rpcIndex > unmarshalIndex);
  assert.match(source, /Invalid webhook signature/);
});

test("migration enforces duplicate-event idempotency and service-role-only mutation", () => {
  const source = readFileSync(new URL("../supabase/migrations/20260911133000_recruitos_phase3c_paddle_billing.sql", import.meta.url), "utf8");
  assert.match(source, /event_id text primary key/);
  assert.match(source, /ignored_stale_event/);
  assert.match(source, /security definer/i);
  assert.match(source, /revoke all on function[\s\S]*from public, anon, authenticated/i);
  assert.match(source, /grant execute on function[\s\S]*to service_role/i);
  const policyBlocks = source.match(/create policy[\s\S]*?;/gi) ?? [];
  assert.equal(policyBlocks.length, 2);
  for (const policy of policyBlocks) {
    assert.match(policy, /for select/i);
    assert.doesNotMatch(policy, /for (insert|update|delete)/i);
  }
});

test("client checkout completion is never plan authority", () => {
  const client = readFileSync(new URL("../components/recruitos/billing/billing-actions.tsx", import.meta.url), "utf8");
  const resolver = readFileSync(new URL("../lib/recruitos/effective-plan-server.ts", import.meta.url), "utf8");
  assert.doesNotMatch(client, /localStorage|setEffectivePlan/i);
  assert.match(resolver, /supabaseAdmin/);
  assert.match(resolver, /resolvePlanFromBillingRecords/);
  assert.doesNotMatch(resolver, /searchParams|localStorage|query.*plan/i);
});
