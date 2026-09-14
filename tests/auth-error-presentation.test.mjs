import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const helperSource = readFileSync(new URL("../lib/supabase/auth-errors.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(helperSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const helperModule = { exports: {} };
new Function("exports", "module", compiled.outputText)(helperModule.exports, helperModule);

const { getUserFacingAuthErrorMessage, SIGN_UP_ERROR_FALLBACK } = helperModule.exports;
const authActions = readFileSync(new URL("../app/auth/actions.ts", import.meta.url), "utf8");

test("signup replaces serialized empty auth errors with a useful fallback", () => {
  assert.equal(getUserFacingAuthErrorMessage({ message: "{}" }, SIGN_UP_ERROR_FALLBACK), SIGN_UP_ERROR_FALLBACK);
  assert.equal(getUserFacingAuthErrorMessage({ message: " { } " }, SIGN_UP_ERROR_FALLBACK), SIGN_UP_ERROR_FALLBACK);
  assert.equal(getUserFacingAuthErrorMessage({}, SIGN_UP_ERROR_FALLBACK), SIGN_UP_ERROR_FALLBACK);
  assert.match(authActions, /getUserFacingAuthErrorMessage\(error, SIGN_UP_ERROR_FALLBACK\)/);
});

test("signup preserves legitimate Supabase and validation error messages", () => {
  assert.equal(
    getUserFacingAuthErrorMessage({ message: "User already registered" }, SIGN_UP_ERROR_FALLBACK),
    "User already registered",
  );
  assert.match(authActions, /Complete all required fields\./);
  assert.match(authActions, /Password must be at least 8 characters\./);
  assert.match(authActions, /Passwords do not match\./);
});
