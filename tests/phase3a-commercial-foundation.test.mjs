import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const commercialSource = readFileSync(new URL("../lib/recruitos/commercial.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(commercialSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const commercialModule = { exports: {} };
new Function("exports", "module", compiled.outputText)(commercialModule.exports, commercialModule);

const {
  PLAN_CATALOG,
  PLAN_KEYS,
  FEATURE_KEYS,
  DEFAULT_EFFECTIVE_PLAN,
  RECOMMENDED_COMMERCIAL_PLAN,
  getPlanDefinition,
  getPlanLimits,
  canUseFeature,
  hasReachedLimit,
  isUsageAtOrAboveLimit,
} = commercialModule.exports;

test("Free, Standard, and Pro are the canonical RecruitOS plans", () => {
  assert.deepEqual(PLAN_KEYS, ["free", "standard", "pro"]);
  assert.equal(getPlanDefinition("free")?.key, "free");
  assert.equal(getPlanDefinition("standard")?.key, "standard");
  assert.equal(getPlanDefinition("pro")?.key, "pro");
});

test("launch price metadata is centralized and correct", () => {
  assert.deepEqual(getPlanDefinition("free")?.price, { amount: 0, currency: "USD", interval: null });
  assert.deepEqual(getPlanDefinition("standard")?.price, { amount: 39, currency: "USD", interval: "month" });
  assert.deepEqual(getPlanDefinition("pro")?.price, { amount: 69, currency: "USD", interval: "month" });
});

test("Standard is recommended commercially while Free is the default entitlement", () => {
  assert.equal(RECOMMENDED_COMMERCIAL_PLAN, "standard");
  assert.equal(getPlanDefinition("standard")?.recommended, true);
  assert.equal(getPlanDefinition("free")?.recommended, false);
  assert.equal(DEFAULT_EFFECTIVE_PLAN, "free");
});

test("all current core RecruitOS capabilities remain available on every plan", () => {
  for (const plan of PLAN_KEYS) {
    for (const feature of FEATURE_KEYS) {
      assert.equal(canUseFeature(plan, feature), true, `${feature} should be available on ${plan}`);
    }
  }
});

test("undefined numeric limits do not block current usage", () => {
  for (const plan of PLAN_KEYS) {
    const limits = getPlanLimits(plan);
    assert.ok(limits);
    for (const value of Object.values(limits)) assert.equal(value, null);
    assert.equal(hasReachedLimit(plan, "activeJobs", 1_000_000), false);
  }
});

test("a future configured numeric limit detects under-limit and reached/over-limit usage", () => {
  assert.equal(isUsageAtOrAboveLimit(10, 9), false);
  assert.equal(isUsageAtOrAboveLimit(10, 10), true);
  assert.equal(isUsageAtOrAboveLimit(10, 11), true);
  assert.equal(isUsageAtOrAboveLimit(null, 11), false);
});

test("unknown plan, feature, and limit inputs fail safely without paid escalation or blocking", () => {
  assert.equal(getPlanDefinition("enterprise"), null);
  assert.equal(getPlanLimits("enterprise"), null);
  assert.equal(canUseFeature("enterprise", "jobs"), false);
  assert.equal(canUseFeature("free", "secretPaidFeature"), false);
  assert.equal(hasReachedLimit("enterprise", "activeJobs", 1), false);
  assert.equal(hasReachedLimit("free", "unknownLimit", 1), false);
});

test("plan catalog and nested commercial metadata are frozen against runtime mutation", () => {
  assert.equal(Object.isFrozen(PLAN_CATALOG), true);
  for (const plan of PLAN_KEYS) {
    const definition = getPlanDefinition(plan);
    assert.ok(definition);
    assert.equal(Object.isFrozen(definition), true);
    assert.equal(Object.isFrozen(definition.price), true);
    assert.equal(Object.isFrozen(definition.features), true);
    assert.equal(Object.isFrozen(definition.limits), true);
  }
});

test("server plan resolver remains authenticated and server-authoritative", () => {
  const resolverSource = readFileSync(new URL("../lib/recruitos/effective-plan-server.ts", import.meta.url), "utf8");
  assert.match(resolverSource, /import "server-only"/);
  assert.match(resolverSource, /requireAuthenticatedUser\(\)/);
  assert.match(resolverSource, /supabaseAdmin/);
  assert.match(resolverSource, /resolvePlanFromBillingRecords/);
  assert.match(resolverSource, /return "free"/);
  assert.doesNotMatch(resolverSource, /localStorage|searchParams|query|cookie.*plan|planKey\s*[:=]/i);
  assert.match(resolverSource, /getEffectiveUserPlan\(\)/);
});
