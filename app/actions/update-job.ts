"use server";

import { revalidatePath } from "next/cache";

import type { PlanLimitReached } from "@/lib/recruitos/plan-limits";
import { openJobWithinPlanLimit } from "@/lib/recruitos/usage-server";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type JobLifecycleStatus = "draft" | "open" | "closed" | "archived";

export type UpdateJobResult = {
  success: boolean;
  error?: string;
  limit?: PlanLimitReached;
};

export async function updateJob(
  jobId: string,
  input: { title?: string; description?: string; lifecycleStatus?: JobLifecycleStatus },
): Promise<UpdateJobResult> {
  const user = await requireAuthenticatedUser();
  if (!jobId) return { success: false, error: "Job not found." };

  const data: Record<string, string> = {};

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) return { success: false, error: "Job title cannot be empty." };
    data.title = title;
  }

  if (input.description !== undefined) {
    const description = input.description.trim();
    if (!description) return { success: false, error: "Job description cannot be empty." };
    data.description = description;
  }

  if (input.lifecycleStatus === "open") {
    const result = await openJobWithinPlanLimit(user.id, jobId);
    if (!result.allowed) {
      return { success: false, error: result.limit.message, limit: result.limit };
    }
    if (!result.found) return { success: false, error: "Job not found." };
  } else if (input.lifecycleStatus) {
    data.lifecycle_status = input.lifecycleStatus;
    data.status = input.lifecycleStatus;
  }

  if (Object.keys(data).length > 0) {
    const { data: job, error } = await supabaseAdmin
      .from("jobs")
      .update(data)
      .eq("id", jobId)
      .eq("user_id", user.id)
      .select("id")
      .single();

    if (error || !job) {
      console.error("Job update error:", error);
      return { success: false, error: "Could not update this job." };
    }
  }

  revalidatePath(`/dashboard/agents/recruitos/jobs/${jobId}`);
  revalidatePath("/dashboard/agents/recruitos/jobs");
  return { success: true };
}
