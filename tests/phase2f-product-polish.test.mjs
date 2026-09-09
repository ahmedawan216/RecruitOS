import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("public RecruitOS positioning reflects the operational workspace", () => {
  const page = read("app/recruitos/page.tsx");
  assert.match(page, /Run recruiting work without losing control/);
  assert.match(page, /Contextual commands/);
  assert.match(page, /Human review/);
  assert.doesNotMatch(page, /AI RESUME SCREENING|Stop spending hours screening resumes|Get early access/);
  assert.doesNotMatch(page, /—/);
});

test("global RecruitOS product styling uses approved typography and palette", () => {
  const layout = read("app/layout.tsx");
  const css = read("app/globals.css");
  assert.match(layout, /Public_Sans/);
  assert.match(layout, /IBM_Plex_Sans/);
  assert.match(css, /#f4f5f6/i);
  assert.match(css, /#0e6e6e/i);
  assert.match(css, /#0f1620/i);
  assert.match(css, /#b8791b/i);
  assert.match(css, /#c13b34/i);
});

test("RecruitOS identity is typographic and does not borrow an H1 master mark", () => {
  const logo = read("components/ui/logo.tsx");
  assert.match(logo, />RecruitOS</);
  assert.match(logo, /by OperationOS/);
  assert.doesNotMatch(logo, /H1|OperationOSMark|operationos-logo/);
});

test("auth surfaces preserve accessible form behavior and coherent callback errors", () => {
  const form = read("components/auth/auth-form.tsx");
  const signIn = read("app/sign-in/page.tsx");
  assert.match(form, /aria-invalid/);
  assert.match(form, /aria-describedby/);
  assert.match(form, /Show \$\{label\.toLowerCase\(\)\}/);
  assert.match(signIn, /invalid-link/);
  assert.match(signIn, /auth-callback/);
});

test("legacy upload route redirects into the current Resume Analysis surface", () => {
  const upload = read("app/upload/page.tsx");
  assert.match(upload, /redirect\(/);
  assert.match(upload, /dashboard\/agents\/recruitos\/analyze/);
});

test("candidate product surfaces explicitly avoid probability framing", () => {
  const candidates = read("app/dashboard/agents/recruitos/candidates/page.tsx");
  const detail = read("app/dashboard/agents/recruitos/candidates/[candidateId]/page.tsx");
  const compare = read("app/dashboard/agents/recruitos/candidates/compare/page.tsx");
  const pipeline = read("app/dashboard/agents/recruitos/jobs/[jobId]/candidate-pipeline.tsx");
  for (const source of [candidates, detail, compare, pipeline]) assert.match(source, /not (?:a )?hiring probability|not probability/i);
});

test("Phase 2E reviewed-action migration remains intact and service-role only", () => {
  const migration = read("supabase/migrations/20260909192000_recruitos_phase2e_human_reviewed_actions.sql");
  assert.match(migration, /apply_recruitos_candidate_status_proposal/);
  assert.match(migration, /cancel_recruitos_candidate_status_proposal/);
  assert.match(migration, /revoke all on function public\.apply_recruitos_candidate_status_proposal\(uuid, uuid, uuid\) from authenticated/);
  assert.match(migration, /grant execute on function public\.apply_recruitos_candidate_status_proposal\(uuid, uuid, uuid\) to service_role/);
});

test("workspace signature surfaces remain present", () => {
  const task = read("components/recruitos/workspace/command-task-surface.tsx");
  const reviewed = read("components/recruitos/workspace/reviewed-status-action-view.tsx");
  assert.match(task, /Download analysis/);
  assert.match(task, /New task/);
  assert.match(reviewed, /Nothing has been changed yet/);
  assert.match(reviewed, /Apply/);
  assert.match(reviewed, /Cancel/);
});
