import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(path, mocks = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  const loadedModule = { exports: {} };
  new Function("module", "exports", "require", outputText)(loadedModule, loadedModule.exports, (id) => id in mocks ? mocks[id] : require(id));
  return loadedModule.exports;
}
const result = load("lib/recruitos/result.ts");
const command = load("lib/recruitos/command.ts", { "@/lib/recruitos/result": result });
const workspace = load("lib/recruitos/workspace.ts");
const { CommandComposer } = load("components/recruitos/workspace/command-task-surface.tsx", {
  "@/lib/recruitos/command": command,
  "@/lib/recruitos/workspace": workspace,
  "@/components/recruitos/workspace/structured-result-view": { StructuredResultView: () => null, resultCandidateCount: () => 3, resultHeading: () => "Result" },
});
const job = { id: "11111111-1111-4111-8111-111111111111", title: "Senior Accountant" };

test("initial composer visibly selects the same job used by contextual instructions", () => {
  const html = renderToStaticMarkup(createElement(CommandComposer, { jobs: [job], contextJob: job }));
  assert.match(html, new RegExp(`value="${job.id}" selected=""`));
  assert.match(html, /Commands use Senior Accountant/);
  assert.match(html, /Review candidates for this role/);
});

test("composer without context retains explicit job lookup instead of guessing", () => {
  const html = renderToStaticMarkup(createElement(CommandComposer, { jobs: [job] }));
  assert.match(html, /value="" selected=""/);
  assert.match(html, /Name a job in your command/);
});

test("failed and clarification tasks expose correction while completed tasks retain New task", () => {
  for (const status of ["failed", "clarification_required", "completed"]) {
    const html = renderToStaticMarkup(createElement(CommandComposer, { jobs: [job], contextJob: job, initialExecution: { id: "execution", status, commandText: "Compare candidates for this role", result: null } }));
    assert.match(html, status === "completed" ? /New task/ : /Edit command/);
  }
});

async function renderWorkspace(jobCount, jobError = null) {
  const responses = [{ data: [], count: jobCount, error: jobError }, { data: [], count: 0, error: null }, { data: [], error: null }];
  const db = { from: () => { const response = responses.shift(); const query = { select: () => query, eq: () => query, in: () => query, order: () => query, limit: () => Promise.resolve(response) }; return query; } };
  const passthrough = ({ children }) => createElement("div", null, children);
  const Page = load("app/dashboard/agents/recruitos/page.tsx", {
    "next/link": ({ href, children, ...props }) => createElement("a", { href, ...props }, children),
    "@/lib/supabase/auth": { requireAuthenticatedUser: async () => ({ id: "owner" }) },
    "@/lib/supabase/admin": { supabaseAdmin: db },
    "@/components/ui/workspace": { ErrorState: passthrough },
    "@/components/recruitos/workspace/command-composer": { CommandComposer: () => createElement("textarea", { "aria-label": "Recruiting command" }) },
    "@/components/recruitos/workspace/task-surface": { TaskSurface: passthrough },
    "@/lib/recruitos/workspace": workspace,
    "./recruiter-summary": () => null,
  }).default;
  return renderToStaticMarkup(await Page());
}

test("confirmed empty workspace offers job creation before unusable commands", async () => {
  const html = await renderWorkspace(0);
  assert.match(html, /Create your first job/);
  assert.match(html, /href="\/dashboard\/agents\/recruitos\/jobs\/new"/);
  assert.doesNotMatch(html, /<textarea/);
});

test("failed job lookup does not masquerade as first arrival or hide commands", async () => {
  const html = await renderWorkspace(null, { message: "unavailable" });
  assert.doesNotMatch(html, /Create your first job/);
  assert.match(html, /Some workspace context could not be loaded/);
  assert.match(html, /<textarea/);
});
