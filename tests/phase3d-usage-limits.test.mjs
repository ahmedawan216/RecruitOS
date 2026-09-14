import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const commercialSource = readFileSync(new URL("../lib/recruitos/commercial.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(commercialSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const commercialModule = { exports: {} };
new Function("exports", "module", compiled.outputText)(commercialModule.exports, commercialModule);
const commercial = commercialModule.exports;

const usageServer = readFileSync(new URL("../lib/recruitos/usage-server.ts", import.meta.url), "utf8");
const planLimits = readFileSync(new URL("../lib/recruitos/plan-limits.ts", import.meta.url), "utf8");
const compiledPlanLimits = ts.transpileModule(planLimits, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const planLimitsModule = { exports: {} };
new Function("exports", "module", "require", compiledPlanLimits.outputText)(
  planLimitsModule.exports,
  planLimitsModule,
  (specifier) => {
    if (specifier === "@/lib/recruitos/commercial") return commercial;
    throw new Error(`Unexpected test import: ${specifier}`);
  },
);
const { getUtcUsageWindow } = planLimitsModule.exports;
const createJob = readFileSync(new URL("../app/actions/create-job.ts", import.meta.url), "utf8");
const updateJob = readFileSync(new URL("../app/actions/update-job.ts", import.meta.url), "utf8");
const analyzeResume = readFileSync(new URL("../app/actions/analyze-resume.ts", import.meta.url), "utf8");
const batchAnalyze = readFileSync(new URL("../app/actions/batch-analyze-resumes.ts", import.meta.url), "utf8");
const newJobPage = readFileSync(new URL("../app/dashboard/agents/recruitos/jobs/new/page.tsx", import.meta.url), "utf8");
const jobControls = readFileSync(new URL("../app/dashboard/agents/recruitos/jobs/[jobId]/job-controls.tsx", import.meta.url), "utf8");
const analyzePage = readFileSync(new URL("../app/dashboard/agents/recruitos/analyze/AnalyzePage.tsx", import.meta.url), "utf8");
const batchUpload = readFileSync(new URL("../app/dashboard/agents/recruitos/jobs/[jobId]/batch-upload.tsx", import.meta.url), "utf8");
const notice = readFileSync(new URL("../components/recruitos/usage/plan-limit-notice.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20260912154500_recruitos_phase3d_usage_limits.sql", import.meta.url), "utf8");
const resolver = readFileSync(new URL("../lib/recruitos/effective-plan-server.ts", import.meta.url), "utf8");
const paddleBilling = readFileSync(new URL("../lib/recruitos/paddle-billing.ts", import.meta.url), "utf8");

test("Phase 3D plan capacity is centralized with the approved limits", () => {
  assert.deepEqual(commercial.getPlanCapacity("free"), {
    activeJobs: { amount: 3, period: null },
    resumeAnalyses: { amount: 25, period: "month" },
  });
  assert.deepEqual(commercial.getPlanCapacity("standard"), {
    activeJobs: { amount: 25, period: null },
    resumeAnalyses: { amount: 300, period: "month" },
  });
  assert.deepEqual(commercial.getPlanCapacity("pro"), {
    activeJobs: { amount: 100, period: null },
    resumeAnalyses: { amount: 1000, period: "month" },
  });
  assert.equal((commercialSource.match(/makeCapacity\(/g) ?? []).length, 4);
});

test("configured limits block exactly at the approved boundaries", () => {
  for (let jobNumber = 1; jobNumber <= 3; jobNumber += 1) {
    assert.equal(commercial.hasReachedLimit("free", "activeJobs", jobNumber - 1), false, `Free job ${jobNumber} should be allowed`);
  }
  assert.equal(commercial.hasReachedLimit("free", "activeJobs", 3), true, "Free job 4 should be blocked");
  assert.equal(commercial.hasReachedLimit("standard", "activeJobs", 24), false);
  assert.equal(commercial.hasReachedLimit("standard", "activeJobs", 25), true);
  assert.equal(commercial.hasReachedLimit("pro", "activeJobs", 99), false);
  assert.equal(commercial.hasReachedLimit("pro", "activeJobs", 100), true);

  for (let analysisNumber = 1; analysisNumber <= 25; analysisNumber += 1) {
    assert.equal(commercial.hasReachedLimit("free", "resumeAnalysisVolume", analysisNumber - 1), false, `Free analysis ${analysisNumber} should be allowed`);
  }
  assert.equal(commercial.hasReachedLimit("free", "resumeAnalysisVolume", 25), true, "Free analysis 26 should be blocked");
  assert.equal(commercial.hasReachedLimit("standard", "resumeAnalysisVolume", 299), false);
  assert.equal(commercial.hasReachedLimit("standard", "resumeAnalysisVolume", 300), true);
  assert.equal(commercial.hasReachedLimit("pro", "resumeAnalysisVolume", 999), false);
  assert.equal(commercial.hasReachedLimit("pro", "resumeAnalysisVolume", 1000), true);
});

test("resume usage uses UTC calendar months and resets at the month boundary", () => {
  const january = getUtcUsageWindow("month", new Date("2027-01-31T23:59:59.999Z"));
  const february = getUtcUsageWindow("month", new Date("2027-02-01T00:00:00.000Z"));

  assert.deepEqual(january, {
    start: "2027-01-01T00:00:00.000Z",
    end: "2027-02-01T00:00:00.000Z",
  });
  assert.deepEqual(february, {
    start: "2027-02-01T00:00:00.000Z",
    end: "2027-03-01T00:00:00.000Z",
  });
  assert.equal(january.end, february.start);
  assert.notEqual(january.start, february.start);
});

test("all core RecruitOS capabilities remain enabled across every plan", () => {
  for (const plan of commercial.PLAN_KEYS) {
    for (const feature of commercial.FEATURE_KEYS) {
      assert.equal(commercial.canUseFeature(plan, feature), true);
    }
  }
});

test("browser cannot spoof plan usage count or owner for active-job enforcement", () => {
  assert.match(createJob, /requireAuthenticatedUser\(\)/);
  assert.match(createJob, /createJobWithinPlanLimit\(user\.id/);
  assert.match(updateJob, /openJobWithinPlanLimit\(user\.id, jobId\)/);
  assert.doesNotMatch(createJob, /formData\.get\(["'](?:plan|usage|userId|user_id|activeJobs)["']\)/);
  assert.doesNotMatch(updateJob, /input\.(?:plan|usage|userId|user_id|activeJobs)/);
  assert.match(usageServer, /getEffectiveUserPlan\(\)/);
});

test("active-job creation and reopening are atomically protected before mutation", () => {
  assert.match(usageServer, /recruitos_create_job_with_limit/);
  assert.match(usageServer, /recruitos_open_job_with_limit/);
  assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\('recruitos-usage:' \|\| p_user_id::text, 0\)\)/);
  assert.match(migration, /where user_id = p_user_id\s+and lifecycle_status = 'open'/);
  assert.match(migration, /if v_active_jobs >= p_active_job_limit then/);
  assert.match(migration, /insert into public\.jobs[\s\S]*after|insert into public\.jobs/i);
  assert.match(migration, /update public\.jobs[\s\S]*lifecycle_status = 'open'/);
});

test("active-job counting is owner-scoped and ignores closed archived and draft jobs", () => {
  const countClauses = migration.match(/from public\.jobs[\s\S]{0,180}?lifecycle_status = 'open'/g) ?? [];
  assert.ok(countClauses.length >= 2);
  for (const clause of countClauses) assert.match(clause, /user_id = p_user_id/);
  assert.doesNotMatch(countClauses.join("\n"), /lifecycle_status in/);
});

test("resume analysis reserves usage after request ownership and input validation but before AI work", () => {
  const resumeValidation = analyzeResume.indexOf('resume.status !== "success"');
  const jobValidation = analyzeResume.indexOf('if (jobError || !job)');
  const reservation = analyzeResume.indexOf("const usageReservation = await reserveResumeAnalysisWithinPlanLimit");
  const aiWork = analyzeResume.indexOf("groq.chat.completions.create");
  assert.ok(resumeValidation >= 0 && jobValidation > resumeValidation);
  assert.ok(reservation > jobValidation && aiWork > reservation);
});

test("resume analysis windows and limits are concurrency-safe and old-window usage does not count", () => {
  assert.match(usageServer, /getUtcUsageWindow\(period\)/);
  assert.match(migration, /accepted_at >= p_window_start/);
  assert.match(migration, /accepted_at < p_window_end/);
  assert.match(migration, /if v_usage >= p_resume_analysis_limit then/);
  assert.match(migration, /recruitos_resume_analysis_usage_retry_unique/);
  assert.match(migration, /duplicate', true/);
  assert.match(migration, /pg_advisory_xact_lock/);
});

test("rejected or unauthorized resume-analysis requests do not consume usage", () => {
  const reservation = analyzeResume.indexOf("const usageReservation = await reserveResumeAnalysisWithinPlanLimit");
  assert.ok(analyzeResume.indexOf("requireAuthenticatedUser()") < reservation);
  assert.ok(analyzeResume.indexOf("Resume not found.") < reservation);
  assert.ok(analyzeResume.indexOf("This resume has no extracted text to analyze.") < reservation);
  assert.ok(analyzeResume.indexOf("Job not found.") < reservation);
});

test("batch analysis reuses the same server-enforced single-analysis path", () => {
  assert.match(batchAnalyze, /analyzeResume\(resumeId, jobId\)/);
  assert.match(batchAnalyze, /limit: analysisResult\.limit/);
  assert.doesNotMatch(batchAnalyze, /getEffectiveUserPlan|p_resume_analysis_limit/);
});

test("structured plan-limit response contains only RecruitOS capacity context", () => {
  assert.match(planLimits, /code: "PLAN_LIMIT_REACHED"/);
  assert.match(planLimits, /resource: PlanLimitResource/);
  assert.match(planLimits, /plan: PlanKey/);
  assert.match(planLimits, /limit: number/);
  assert.match(planLimits, /period: UsagePeriod \| null/);
  assert.doesNotMatch(planLimits, /paddle|subscription|customer/i);
});

test("upgrade UX is contextual and never invents Enterprise", () => {
  assert.match(notice, /Upgrade plan/);
  assert.match(notice, /View Pro/);
  assert.match(planLimits, /https:\/\/operationos\.org\/pricing/);
  assert.match(notice, /Limit reached for this billing period\./);
  assert.doesNotMatch(notice, /Enterprise/i);
  assert.match(newJobPage, /PlanLimitNotice/);
  assert.match(jobControls, /PlanLimitNotice/);
  assert.match(analyzePage, /PlanLimitNotice/);
  assert.match(batchUpload, /PlanLimitNotice/);
  assert.doesNotMatch(notice, /\d+\s*\/\s*\d+/);
});

test("scheduled cancellation keeps paid access until actual canceled status", () => {
  const env = { PADDLE_STANDARD_PRICE_ID: "pri_standard", PADDLE_PRO_PRICE_ID: "pri_pro" };
  const source = ts.transpileModule(paddleBilling, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const mod = { exports: {} };
  new Function("exports", "module", "process", source)(mod.exports, mod, process);
  assert.equal(mod.exports.resolvePlanFromBillingRecords([{ plan: "standard", status: "active", paddle_price_id: "pri_standard" }], env), "standard");
  assert.equal(mod.exports.resolvePlanFromBillingRecords([{ plan: "standard", status: "canceled", paddle_price_id: "pri_standard" }], env), "free");
  assert.doesNotMatch(resolver, /scheduled_change/);
});

test("Phase 3D does not add browser access to the usage ledger or weaken service-role-only RPC access", () => {
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table public\.recruitos_resume_analysis_usage from public, anon, authenticated/);
  assert.match(migration, /grant all on table public\.recruitos_resume_analysis_usage to service_role/);
  assert.equal((migration.match(/revoke all on function/g) ?? []).length, 3);
  assert.equal((migration.match(/grant execute on function/g) ?? []).length, 3);
  assert.doesNotMatch(migration, /create policy/i);
});
