"use server";

import { captureOutcome } from "@/lib/analytics/server";

import type { PlanLimitReached } from "@/lib/recruitos/plan-limits";
import { createJobWithinPlanLimit } from "@/lib/recruitos/usage-server";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

export type CreateJobState = {
  success: boolean;
  error?: string;
  jobId?: string;
  limit?: PlanLimitReached;
};

export async function createJob(_prevState: CreateJobState, formData: FormData): Promise<CreateJobState> {
  try {
    const user = await requireAuthenticatedUser();
    const title = formData.get("title");
    const description = formData.get("description");

    if (typeof title !== "string" || !title.trim()) {
      return { success: false, error: "Please enter a job title." };
    }
    if (typeof description !== "string" || !description.trim()) {
      return { success: false, error: "Please enter a job description." };
    }

    const result = await createJobWithinPlanLimit(user.id, title.trim(), description.trim());
    if (!result.allowed) {
      return { success: false, error: result.limit.message, limit: result.limit };
    }

    await captureOutcome(user.id, "job_created", { job_count: 1 }, result.jobId);
    return { success: true, jobId: result.jobId };
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return { success: false, error: "Please sign in to create a job." };
    }
    console.error("Unexpected job creation error:", error);
    return { success: false, error: "Something went wrong while creating the job." };
  }
}
