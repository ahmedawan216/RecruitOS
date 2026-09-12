"use server";

import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { analyzeResume } from "@/app/actions/analyze-resume";
import type { PlanLimitReached } from "@/lib/recruitos/plan-limits";

export type BatchItemResult = {
  name: string;
  success: boolean;
  error?: string;
  resumeId?: string;
  candidateId?: string;
  limit?: PlanLimitReached;
};

/** Analyze already-uploaded resumes for a job. Upload/extraction is kept separate. */
export async function batchAnalyzeResumes(jobId: string, resumeIds: string[]): Promise<BatchItemResult[]> {
  await requireAuthenticatedUser();

  if (!jobId) {
    return resumeIds.map((resumeId) => ({ name: resumeId, success: false, error: "No job was selected." }));
  }

  const results: BatchItemResult[] = [];

  for (const resumeId of resumeIds.slice(0, 25)) {
    try {
      const analysisResult = await analyzeResume(resumeId, jobId);
      results.push({
        name: resumeId,
        success: analysisResult.success,
        error: analysisResult.success ? undefined : analysisResult.error,
        resumeId,
        candidateId: analysisResult.candidateId,
        limit: analysisResult.limit,
      });
      if (analysisResult.limit) break;
    } catch (error) {
      console.error("Batch analysis error:", error);
      results.push({ name: resumeId, success: false, error: "This resume could not be analyzed.", resumeId });
    }
  }

  return results;
}
