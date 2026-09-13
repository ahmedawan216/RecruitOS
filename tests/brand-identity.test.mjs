import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function sha256(path) {
  return createHash("sha256")
    .update(readFileSync(new URL(`../${path}`, import.meta.url)))
    .digest("hex")
    .toUpperCase();
}

test("official RecruitOS production assets remain byte-for-byte unchanged", () => {
  const expectedHashes = {
    "public/brand/recruitos/recruitos-endorsed-black.svg": "544FD1C42C39BA79EF9C45933D19E8F1223475FBFDEECDF8211CC1CF7F2527AD",
    "public/brand/recruitos/recruitos-horizontal-black.svg": "CD576270A46DB985E9AFB62E749D9D9267510C6890B824DA1FF2D505C02ADF19",
    "public/brand/recruitos/recruitos-horizontal-white.svg": "B7F4FE1788C232D7C1C2D7735919D3E057824069A61EA6AE9B623DFEA067629D",
    "public/brand/recruitos/recruitos-social-preview-1200x630.png": "0174EB21315D28A6B70B694DC6C6B3E739B1689DC40C8CF13BF31D254832D32F",
    "app/favicon.ico": "0E88250C7AC7CF21E5C72F522BD673347D95629B0A68B38A26553B8F29437AD7",
    "app/apple-icon.png": "F6D60C34723A194FEB58FB777A23BB41BA18FD2AC2ABF577F123D66DEC068769",
    "app/icon.svg": "BBE8C9D78F570F82316E7A162313FCE5C4FCEDD6CA009E6D881CF34073686640",
  };

  for (const [path, expectedHash] of Object.entries(expectedHashes)) {
    assert.equal(sha256(path), expectedHash, `${path} must match the approved brand package`);
  }
});

test("primary product shell replaces the temporary R badge with the official reversed lockup", () => {
  const shell = read("components/layout/dashboard-shell.tsx");
  assert.match(shell, /RecruitOSBrand variant="horizontal-white"/);
  assert.doesNotMatch(shell, />R<\/span>/);
  assert.doesNotMatch(shell, /rounded-lg bg-\[#0e6e6e\][^\n]*>R</);
});

test("auth and paid purchase surfaces use the official endorsed RecruitOS identity", () => {
  for (const path of [
    "app/sign-in/page.tsx",
    "app/sign-up/page.tsx",
    "app/checkout/page.tsx",
    "app/checkout/success/page.tsx",
    "components/recruitos/billing/checkout-handoff.tsx",
    "components/recruitos/billing/checkout-activation.tsx",
  ]) {
    assert.match(read(path), /RecruitOSBrand variant="endorsed-black"/, `${path} should use the endorsed lockup`);
  }
});

test("Next.js metadata uses official RecruitOS icon and social assets", () => {
  const layout = read("app/layout.tsx");
  assert.match(layout, /applicationName: siteConfig\.name/);
  assert.match(layout, /\/favicon\.ico/);
  assert.match(layout, /\/icon\.svg/);
  assert.match(layout, /\/apple-icon\.png/);
  assert.match(layout, /recruitos-social-preview-1200x630\.png/);
});

test("RecruitOS identity contains no OperationOS H1 master-mark reference", () => {
  const identitySources = [
    read("components/ui/recruitos-brand.tsx"),
    read("components/ui/logo.tsx"),
    read("components/layout/dashboard-shell.tsx"),
    read("app/icon.svg"),
  ].join("\n");
  assert.doesNotMatch(identitySources, /OperationOSMark|operationos-logo|operationos-h1|H1 master/i);
});

test("billing authority and checkout architecture remain server verified", () => {
  const checkoutClient = read("components/recruitos/billing/checkout-handoff.tsx");
  const checkoutRoute = read("app/api/recruitos/billing/checkout/route.ts");
  const activationRoute = read("app/api/recruitos/billing/activation/route.ts");
  const webhook = read("app/api/paddle/webhook/route.ts");

  assert.match(checkoutClient, /fetch\("\/api\/recruitos\/billing\/checkout"/);
  assert.match(checkoutRoute, /getPaddlePriceIdForPlan\(plan\)/);
  assert.match(activationRoute, /getEffectiveUserPlan/);
  assert.match(webhook, /sync_recruitos_paddle_subscription_event/);
});
