import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Use the repository's existing compiler; no new test dependency or production fixture.
const source = readFileSync(new URL("../lib/recruitos/workspace.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const workspace = { exports: {} };
new Function("exports", "module", compiled.outputText)(workspace.exports, workspace);
const { getWorkspaceHeading, getWorkspaceSuggestions } = workspace.exports;

test("review workload takes priority over a recent role", () => {
  assert.equal(getWorkspaceHeading(1, 2, "Accountant"), "One candidate review to pick up.");
  assert.equal(getWorkspaceHeading(12, 2, "Accountant"), "Ready to review the next candidates?");
});

test("empty and unavailable workspace data are different", () => {
  assert.equal(getWorkspaceHeading(0, 0), "What role are we hiring for?");
  assert.equal(getWorkspaceHeading(null, null), "What are we hiring for today?");
  assert.equal(getWorkspaceHeading(null, 2, "Accountant"), "Continue with Accountant.");
});

test("headings are deterministic", () => {
  assert.equal(getWorkspaceHeading(0, 2, "Accountant"), getWorkspaceHeading(0, 2, "Accountant"));
});

test("suggestions use only the supplied role and stay bounded", () => {
  const suggestions = getWorkspaceSuggestions({ id: "test-role", title: "Senior Accountant" });
  assert.equal(suggestions.length, 2);
  assert.ok(suggestions.every((suggestion) => suggestion.includes("Senior Accountant")));
  assert.equal(getWorkspaceSuggestions().length, 2);
});
