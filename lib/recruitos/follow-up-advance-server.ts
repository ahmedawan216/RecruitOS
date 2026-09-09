import "server-only";

import { advanceSemanticFollowUp } from "@/lib/recruitos/follow-up-server";
import { executionResultSchema, type ExecutionResult } from "@/lib/recruitos/result";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type DbRow = Record<string, unknown>;

function snapshot(row: DbRow) {
  const parsedResult = row.result ? executionResultSchema.safeParse(row.result) : null;
  return {
    id: String(row.id), status: String(row.status), stage: String(row.stage), commandText: String(row.command_text),
    requestedCount: Number(row.requested_count), requestedJobText: typeof row.requested_job_text === "string" ? row.requested_job_text : null,
    resolvedJobId: typeof row.resolved_job_id === "string" ? row.resolved_job_id : null,
    result: parsedResult?.success ? parsedResult.data as ExecutionResult : null,
    errorCode: typeof row.error_code === "string" ? row.error_code : null,
    errorMessage: typeof row.error_message === "string" ? row.error_message : null,
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

export async function advanceContextualFollowUpIfPending(executionId: string) {
  const user = await requireAuthenticatedUser();
  const { data, error } = await supabaseAdmin.from("recruitos_command_executions").select("*").eq("id", executionId).eq("user_id", user.id).maybeSingle();
  if (error) return { handled: true as const, result: { ok: false as const, status: 500, error: "RecruitOS could not continue this focused analysis." } };
  if (!data) return { handled: true as const, result: { ok: false as const, status: 404, error: "Task not found." } };
  if (data.stage !== "followup_semantic_analysis") return { handled: false as const };

  await advanceSemanticFollowUp(user.id, data as DbRow);
  const { data: updated, error: readError } = await supabaseAdmin.from("recruitos_command_executions").select("*").eq("id", executionId).eq("user_id", user.id).maybeSingle();
  if (readError || !updated) return { handled: true as const, result: { ok: false as const, status: 500, error: "Focused analysis completed but its result could not be loaded." } };
  return { handled: true as const, result: { ok: true as const, execution: snapshot(updated as DbRow) } };
}
