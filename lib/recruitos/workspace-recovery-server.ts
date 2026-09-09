import "server-only";

import { executionResultSchema } from "@/lib/recruitos/command";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getExecutionRecoveryMode,
  isWorkspaceExecutionDismissed,
  type ExecutionSnapshot,
} from "@/lib/recruitos/workspace-recovery";

type DbRow = Record<string, unknown>;

function asObject(value: unknown): DbRow {
  return value && typeof value === "object" && !Array.isArray(value) ? value as DbRow : {};
}

function snapshot(row: DbRow): ExecutionSnapshot {
  const parsedResult = row.result ? executionResultSchema.safeParse(row.result) : null;
  return {
    id: String(row.id),
    status: String(row.status),
    stage: String(row.stage),
    commandText: String(row.command_text),
    requestedCount: Number(row.requested_count),
    requestedJobText: typeof row.requested_job_text === "string" ? row.requested_job_text : null,
    resolvedJobId: typeof row.resolved_job_id === "string" ? row.resolved_job_id : null,
    result: parsedResult?.success ? parsedResult.data : null,
    errorCode: typeof row.error_code === "string" ? row.error_code : null,
    errorMessage: typeof row.error_message === "string" ? row.error_message : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function getLatestWorkspaceExecution(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("recruitos_command_executions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  if (isWorkspaceExecutionDismissed(data.work_state)) return null;
  if (getExecutionRecoveryMode(String(data.status)) === "none") return null;
  return snapshot(data as DbRow);
}

export async function dismissWorkspaceExecution(executionId: string) {
  const user = await requireAuthenticatedUser();
  const { data, error } = await supabaseAdmin
    .from("recruitos_command_executions")
    .select("id, status, work_state")
    .eq("id", executionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { ok: false as const, status: 500, error: "RecruitOS could not clear this task from the workspace." };
  if (!data) return { ok: false as const, status: 404, error: "Task not found." };
  if (getExecutionRecoveryMode(String(data.status)) !== "restore") {
    return { ok: false as const, status: 409, error: "Active tasks must finish or be cancelled before starting a new task." };
  }

  const workState = asObject(data.work_state);
  const { error: updateError } = await supabaseAdmin
    .from("recruitos_command_executions")
    .update({
      work_state: { ...workState, workspaceDismissedAt: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    })
    .eq("id", executionId)
    .eq("user_id", user.id);

  if (updateError) return { ok: false as const, status: 500, error: "RecruitOS could not clear this task from the workspace." };
  return { ok: true as const };
}
