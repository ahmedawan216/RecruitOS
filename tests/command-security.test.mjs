import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/20260908153000_recruitos_phase2c_command_executions.sql", import.meta.url), "utf8");
const runner = readFileSync(new URL("../lib/recruitos/execution-server.ts", import.meta.url), "utf8");

test("Phase 2C execution tables retain explicit ownership, RLS, and duplicate protection", () => {
  assert.match(migration, /user_id uuid not null references auth\.users\(id\) on delete cascade/);
  assert.match(migration, /alter table public\.recruitos_command_executions enable row level security/);
  assert.match(migration, /alter table public\.recruitos_command_events enable row level security/);
  assert.match(migration, /unique \(user_id, idempotency_key\)/);
  assert.match(migration, /j\.user_id = auth\.uid\(\)/);
  assert.match(migration, /e\.id = execution_id and e\.user_id = auth\.uid\(\)/);
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
