/** UI references for the RecruitOS command workspace. */
export type WorkspaceDraft = { text: string; jobId: string | null };
export type WorkspaceState =
  | { phase: "idle" | "command-draft"; draft: WorkspaceDraft }
  | { phase: "submitted" | "resolving" | "understanding" | "live-work"; executionId: string }
  | { phase: "result" | "candidate-inspection" | "follow-up"; executionId: string; resultId: string }
  | { phase: "proposal" | "approval" | "applied" | "completed"; executionId: string; proposalId: string }
  | { phase: "error" | "cancelled"; executionId: string; message: string };

export type WorkspaceJob = { id: string; title: string };
export type WorkspaceHeadingContext = {
  reviewCount: number | null;
  jobCount: number | null;
  activeJobTitle?: string;
  hasRecentActivity?: boolean;
};

/** Null means unavailable, never an empty workspace. Selected deterministically from real workspace state. */
export function getWorkspaceHeading({ reviewCount, jobCount, activeJobTitle, hasRecentActivity = false }: WorkspaceHeadingContext) {
  if (reviewCount !== null && reviewCount > 0) {
    return reviewCount === 1 ? "One candidate review to pick up." : `${reviewCount} candidate reviews to pick up.`;
  }
  if (activeJobTitle) return `Ready to find the strongest candidates for ${activeJobTitle}?`;
  if (hasRecentActivity) return "Continue where you left off?";
  if (jobCount === 0) return "What are we hiring for today?";
  if (jobCount !== null && jobCount > 0) return "Who are we reviewing today?";
  return "What are we hiring for today?";
}

export function getWorkspaceSuggestions(job?: WorkspaceJob): string[] {
  return job
    ? [`Review applicants for ${job.title} and prepare the strongest 8`, `Find the best 8 candidates for ${job.title}`]
    : ["Review applicants for a job and prepare the strongest 8", "Find the best 8 candidates for a job"];
}
