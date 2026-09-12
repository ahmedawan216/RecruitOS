import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const shell = readFileSync(new URL("../components/layout/dashboard-shell.tsx", import.meta.url), "utf8");
const modal = readFileSync(new URL("../components/recruitos/settings/settings-modal.tsx", import.meta.url), "utf8");
const billingPanel = readFileSync(new URL("../components/recruitos/billing/billing-panel.tsx", import.meta.url), "utf8");
const billingActions = readFileSync(new URL("../components/recruitos/billing/billing-actions.tsx", import.meta.url), "utf8");
const billingPage = readFileSync(new URL("../app/dashboard/agents/recruitos/billing/page.tsx", import.meta.url), "utf8");
const dashboardLayout = readFileSync(new URL("../app/dashboard/layout.tsx", import.meta.url), "utf8");
const resolver = readFileSync(new URL("../lib/recruitos/effective-plan-server.ts", import.meta.url), "utf8");
const checkoutRoute = readFileSync(new URL("../app/api/recruitos/billing/checkout/route.ts", import.meta.url), "utf8");
const webhookRoute = readFileSync(new URL("../app/api/paddle/webhook/route.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20260911133000_recruitos_phase3c_paddle_billing.sql", import.meta.url), "utf8");

test("account control opens a compact account popover with required actions", () => {
  assert.match(shell, /data-recruitos-account-trigger/);
  assert.match(shell, /setOpen\(\(value\) => !value\)/);
  assert.match(shell, /data-recruitos-account-popover/);
  for (const label of ["Personalization", "Profile", "Settings", "Help", "Log out"]) {
    assert.match(shell, new RegExp(`>${label}<|\\n\\s*${label}\\n`));
  }
  assert.match(shell, /billing\.effectivePlan/);
});

test("Settings opens the reusable modal and modal provides keyboard focus handling", () => {
  assert.match(shell, /openSettings\("general"\)/);
  assert.match(shell, /<SettingsModal/);
  assert.match(modal, /data-recruitos-settings-modal/);
  assert.match(modal, /role="dialog"/);
  assert.match(modal, /aria-modal="true"/);
  assert.match(modal, /event\.key === "Escape"/);
  assert.match(modal, /event\.key !== "Tab"/);
  assert.match(modal, /closeButtonRef\.current\?\.focus\(\)/);
});

test("Billing settings navigation renders the shared compact billing panel", () => {
  assert.match(modal, /key: "billing", label: "Billing"/);
  assert.match(modal, /selected === "billing"/);
  assert.match(modal, /<BillingPanel data=\{account\.billing\}/);
  assert.match(billingPage, /<BillingPanel data=\{billing\}/);
});

test("RecruitOS links plan discovery to the public OperationOS pricing page", () => {
  assert.match(billingPanel, /https:\/\/operationos\.org\/pricing/);
  assert.match(shell, /https:\/\/operationos\.org\/pricing/);
});

test("full Free Standard Pro pricing cards are no longer rendered inside RecruitOS Billing", () => {
  assert.doesNotMatch(billingPage, /\["free",\s*"standard",\s*"pro"\]\.map/);
  assert.doesNotMatch(billingPanel, /\["free",\s*"standard",\s*"pro"\]\.map/);
  assert.doesNotMatch(billingPanel, /Choose a RecruitOS plan/);
});

test("current plan remains server-authoritative in the dashboard account experience", () => {
  assert.match(dashboardLayout, /getEffectiveUserPlan\(\)/);
  assert.match(dashboardLayout, /getBillingOverview\(user\.id\)/);
  assert.match(resolver, /requireAuthenticatedUser\(\)/);
  assert.match(resolver, /supabaseAdmin/);
  assert.match(resolver, /resolvePlanFromBillingRecords/);
  assert.doesNotMatch(shell, /localStorage|searchParams|setEffectivePlan/i);
  assert.doesNotMatch(modal, /localStorage|setEffectivePlan/i);
});

test("Manage subscription continues to use the existing Paddle portal route", () => {
  assert.match(billingActions, /fetch\("\/api\/recruitos\/billing\/portal", \{ method: "POST" \}\)/);
  assert.match(billingActions, /Manage subscription in Paddle/);
});

test("checkout webhook and billing migration authority chain remain unchanged by the UX fix", () => {
  assert.match(checkoutRoute, /getPaddlePriceIdForPlan\(plan\)/);
  assert.match(checkoutRoute, /requireAuthenticatedUser\(\)/);
  assert.match(webhookRoute, /webhooks\.unmarshal\(/);
  assert.match(webhookRoute, /sync_recruitos_paddle_subscription_event/);
  assert.match(migration, /event_id text primary key/);
  assert.match(migration, /grant execute on function[\s\S]*to service_role/i);
});
