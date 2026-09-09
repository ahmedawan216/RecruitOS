import "server-only";

import { renderAnalysisHtml, safeAnalysisFilename } from "@/lib/recruitos/analysis-export";
import { executionResultSchema } from "@/lib/recruitos/command";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function getOwnedAnalysisExport(executionId: string) {
  const user = await requireAuthenticatedUser();
  const { data, error } = await supabaseAdmin
    .from("recruitos_command_executions")
    .select("id, status, command_text, result, completed_at")
    .eq("id", executionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { ok: false as const, status: 500, error: "RecruitOS could not prepare this analysis download." };
  if (!data) return { ok: false as const, status: 404, error: "Analysis not found." };
  if (data.status !== "completed" || !data.completed_at) return { ok: false as const, status: 409, error: "This analysis is not complete yet." };

  const parsed = executionResultSchema.safeParse(data.result);
  if (!parsed.success) return { ok: false as const, status: 409, error: "This completed analysis does not contain a valid structured result." };

  return {
    ok: true as const,
    filename: safeAnalysisFilename(parsed.data.job.title),
    html: renderAnalysisHtml({ commandText: data.command_text, completedAt: data.completed_at, result: parsed.data }),
  };
}
