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

test("unfinished review work takes priority over every other workspace signal", () => {
  assert.equal(getWorkspaceHeading({ reviewCount: 1, jobCount: 2, activeJobTitle: "Accountant", hasRecentActivity: true }), "One candidate review to pick up.");
  assert.equal(getWorkspaceHeading({ reviewCount: 12, jobCount: 2, activeJobTitle: "Accountant", hasRecentActivity: true }), "12 candidate reviews to pick up.");
});

test("active job context wins when there is no review work", () => {
  assert.equal(getWorkspaceHeading({ reviewCount: 0, jobCount: 2, activeJobTitle: "Junior AI Engineer", hasRecentActivity: true }), "Ready to find the strongest candidates for Junior AI Engineer?");
});

test("returning activity, first run, and neutral states remain distinct", () => {
  assert.equal(getWorkspaceHeading({ reviewCount: 0, jobCount: 0, hasRecentActivity: true }), "Continue where you left off?");
  assert.equal(getWorkspaceHeading({ reviewCount: 0, jobCount: 0 }), "What are we hiring for today?");
  assert.equal(getWorkspaceHeading({ reviewCount: 0, jobCount: 2 }), "Who are we reviewing today?");
  assert.equal(getWorkspaceHeading({ reviewCount: null, jobCount: null }), "What are we hiring for today?");
});

test("headings are deterministic for identical real workspace state", () => {
  const state = { reviewCount: 0, jobCount: 2, activeJobTitle: "Accountant", hasRecentActivity: true };
  assert.equal(getWorkspaceHeading(state), getWorkspaceHeading(state));
});

test("suggestions use only the supplied role and stay bounded", () => {
  const suggestions = getWorkspaceSuggestions({ id: "test-role", title: "Senior Accountant" });
  assert.equal(suggestions.length, 2);
  assert.ok(suggestions.every((suggestion) => suggestion.includes("Senior Accountant")));
  assert.equal(getWorkspaceSuggestions().length, 2);
});
