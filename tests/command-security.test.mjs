import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/20260908153000_recruitos_phase2c_command_executions.sql", import.meta.url), "utf8");
const runner = readFileSync(new URL("../lib/recruitos/execution-server.ts", import.meta.url), "utf8");
const admin = readFileSync(new URL("../lib/supabase/admin.ts", import.meta.url), "utf8");
const client = readFileSync(new URL("../components/recruitos/workspace/command-task-surface.tsx", import.meta.url), "utf8");

test("Phase 2C execution tables retain explicit ownership, RLS, and duplicate protection", () => {
  assert.match(migration, /user_id uuid not null references auth\.users\(id\) on delete cascade/);
  assert.match(migration, /alter table public\.recruitos_command_executions enable row level security/);
  assert.match(migration, /alter table public\.recruitos_command_events enable row level security/);
  assert.match(migration, /unique \(user_id, idempotency_key\)/);
  assert.match(migration, /using \(user_id = auth\.uid\(\)\)/);
  assert.match(migration, /e\.id = execution_id and e\.user_id = auth\.uid\(\)/);
});

test("authenticated clients cannot forge server-owned execution or event writes", () => {
  assert.doesNotMatch(migration, /create policy "Users can create their own RecruitOS command executions"/);
  assert.doesNotMatch(migration, /create policy "Users can update their own RecruitOS command executions"/);
  assert.doesNotMatch(migration, /create policy "Users can create their own RecruitOS command events"/);
  assert.match(migration, /No authenticated INSERT\/UPDATE policy is created for executions/);
  assert.match(migration, /No authenticated INSERT policy is created for events/);
});

test("execution and event writes use the server-only service-role client", () => {
  assert.match(runner, /import "server-only"/);
  assert.match(runner, /import \{ supabaseAdmin \} from "@\/lib\/supabase\/admin"/);
  assert.match(runner, /from\("recruitos_command_executions"\)[\s\S]*?\.insert\(/);
  assert.match(runner, /from\("recruitos_command_executions"\)[\s\S]*?\.update\(/);
  assert.match(runner, /from\("recruitos_command_events"\)\.insert\(/);
  assert.match(admin, /import "server-only"/);
  assert.match(admin, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("browser workspace only calls trusted execution API routes", () => {
  assert.match(client, /fetch\("\/api\/recruitos\/executions"/);
  assert.match(client, /\/api\/recruitos\/executions\/\$\{execution\.id\}\/advance/);
  assert.match(client, /\/api\/recruitos\/executions\/\$\{execution\.id\}\/cancel/);
  assert.doesNotMatch(client, /supabase/i);
  assert.doesNotMatch(client, /recruitos_command_executions/);
  assert.doesNotMatch(client, /recruitos_command_events/);
});

test("server execution queries explicitly scope protected recruiting data by authenticated owner", () => {
  for (const table of [
    "jobs",
    "candidate_job_matches",
    "candidate_activity",
    "resume_analyses",
    "candidates",
    "recruitos_command_executions",
    "recruitos_command_events",
  ]) {
    assert.match(runner, new RegExp(`from\\(\\\"${table}\\\"\\)`), `${table} should be part of the authorized execution path`);
  }
  const ownerScopes = runner.match(/\.eq\("user_id", user(?:\.id|Id)\)/g) ?? [];
  assert.ok(ownerScopes.length >= 8, "execution runner should repeatedly enforce user ownership in service-role queries");
});

test("Phase 2C runner does not invoke consequential recruiter-status mutation actions", () => {
  assert.doesNotMatch(runner, /update-recruiter-status/);
  assert.doesNotMatch(runner, /recruiter_status\s*:/);
  assert.doesNotMatch(runner, /send.*email/i);
});
