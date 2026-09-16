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

const link = ({ href, children, ...props }) => createElement("a", { href, ...props }, children);
const BatchUpload = load("app/dashboard/agents/recruitos/jobs/[jobId]/batch-upload.tsx", {
  "next/link": link,
  "@/app/actions/batch-upload-resumes": {},
  "@/app/actions/batch-analyze-resumes": {},
  "@/components/recruitos/usage/plan-limit-notice": { PlanLimitNotice: () => null },
}).default;
const CandidatePipeline = load("app/dashboard/agents/recruitos/jobs/[jobId]/candidate-pipeline.tsx", {
  "next/link": link,
  "@/app/actions/analyze-resume": {},
  "@/app/actions/update-recruiter-status": {},
  "./delete-analysis-button": () => null,
}).default;
const candidate = (id, analyzed = true) => ({ id, candidate_id: id, resume_id: `resume-${id}`, latest_analysis_id: analyzed ? `analysis-${id}` : null, recruiter_status: "new", match_score: analyzed ? 80 : null });

async function renderJob(candidates, error = null) {
  const responses = [{ data: { ...job, created_at: "2026-09-01", lifecycle_status: "open", description: "Requirements" }, error: null }, { data: candidates, error }];
  const db = { from: () => { const response = responses.shift(); const query = { select: () => query, eq: () => query, single: async () => response, order: async () => response }; return query; } };
  const Page = load("app/dashboard/agents/recruitos/jobs/[jobId]/page.tsx", {
    "next/link": link,
    "@/lib/supabase/auth": { requireAuthenticatedUser: async () => ({ id: "owner" }) },
    "@/lib/supabase/admin": { supabaseAdmin: db },
    "./batch-upload": BatchUpload,
    "./candidate-pipeline": CandidatePipeline,
    "./job-controls": () => createElement("div", null, "Job management"),
  }).default;
  return renderToStaticMarkup(await Page({ params: Promise.resolve({ jobId: job.id }) }));
}

test("zero-candidate job places one upload flow before management and omits empty pipeline choices", async () => {
  const html = await renderJob([]);
  assert.match(html, /Next, add candidates to this role/);
  assert.equal((html.match(/type="file"/g) ?? []).length, 1);
  assert.ok(html.indexOf('id="upload-resumes"') < html.indexOf("Job management"));
  assert.doesNotMatch(html, /Filter candidate pipeline|Ready to compare|BATCH INGESTION/);
  assert.match(html, /PDFs one at a time/);
  assert.match(html, /Analyze a single resume/);
});

test("populated job preserves pipeline and upload without first-candidate guidance", async () => {
  const html = await renderJob([candidate("a")]);
  assert.doesNotMatch(html, /Next, add candidates|Ready to compare/);
  assert.match(html, /Filter candidate pipeline/);
  assert.equal((html.match(/type="file"/g) ?? []).length, 1);
});

test("pipeline lookup failure does not imply an empty job", async () => {
  const html = await renderJob(null, { message: "unavailable" });
  assert.match(html, /Candidate pipeline data could not be loaded/);
  assert.doesNotMatch(html, /Next, add candidates|No candidates in this job/);
});

test("comparison guidance requires two distinct analyzed candidates", () => {
  for (const candidates of [[candidate("a"), candidate("b", false)], [candidate("a"), candidate("a")]]) {
    const html = renderToStaticMarkup(createElement(CandidatePipeline, { jobId: job.id, candidates }));
    assert.doesNotMatch(html, /Ready to compare/);
  }
  const html = renderToStaticMarkup(createElement(CandidatePipeline, { jobId: job.id, candidates: [candidate("a"), candidate("b")] }));
  assert.match(html, /Ready to compare your candidates/);
  assert.match(html, /Select 2–5 candidates/);
  assert.match(html, /<details/);
  assert.match(html, /select this job/);
  assert.match(html, /not the checkboxes on this page/);
  assert.match(html, /id="candidates"/);
});

test("analysis offers continuation to the same role candidate set after the evidence", async () => {
  const responses = [{ data: { id: "analysis", recommendation: "maybe" } }, { data: { ...job, description: "Requirements" } }, { data: { candidate_id: "a" } }];
  const db = { from: () => { const response = responses.shift(); const query = { select: () => query, eq: () => query, order: () => query, limit: () => query, maybeSingle: async () => response, single: async () => response }; return query; } };
  const Page = load("app/dashboard/agents/recruitos/analyze/[resumeId]/page.tsx", {
    "next/link": link,
    "@/lib/supabase/auth": { requireAuthenticatedUser: async () => ({ id: "owner" }) },
    "@/lib/supabase/admin": { supabaseAdmin: db },
    "./analysis-workspace": () => createElement("section", null, "Candidate evidence fixture"),
  }).default;
  const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ resumeId: "resume-a" }), searchParams: Promise.resolve({ jobId: job.id }) }));
  assert.match(html, /Back to candidates/);
  assert.match(html, new RegExp(`href="/dashboard/agents/recruitos/jobs/${job.id}#candidates"`));
  assert.ok(html.indexOf("Review or compare candidates") > html.indexOf("Candidate evidence fixture"));
});

test("empty workspace guidance stays focused on creating the role", async () => {
  const html = await renderWorkspace(0);
  assert.match(html, /requirements you’d normally use when reviewing candidates/);
  assert.doesNotMatch(html, /commands for speed|You approve candidate status changes/);
});

test("job creation uses recruiter language and success points directly to uploads", () => {
  for (const state of [{}, { success: true, jobId: job.id }]) {
    const Page = load("app/dashboard/agents/recruitos/jobs/new/page.tsx", {
      react: { ...require("react"), useActionState: () => [state, () => {}, false] },
      "next/link": link,
      "@/app/actions/create-job": { createJob: () => {} },
      "@/components/recruitos/usage/plan-limit-notice": { PlanLimitNotice: () => null },
    }).default;
    const html = renderToStaticMarkup(createElement(Page));
    assert.match(html, /Start with the role you’re hiring for/);
    assert.match(html, /Include responsibilities, required skills, experience, qualifications/);
    if (state.success) {
      assert.match(html, /Next, add candidates to this role/);
      assert.match(html, new RegExp(`href="/dashboard/agents/recruitos/jobs/${job.id}#upload-resumes"`));
      assert.match(html, />Add candidates</);
    }
  }
});
