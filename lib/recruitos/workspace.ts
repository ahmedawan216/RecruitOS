/** UI references only; execution payloads belong to the later command layer. */
export type WorkspaceDraft = { text: string; jobId: string | null };
export type WorkspaceState =
  | { phase: "idle" | "command-draft"; draft: WorkspaceDraft }
  | { phase: "submitted" | "resolving" | "understanding" | "live-work"; executionId: string }
  | { phase: "result" | "candidate-inspection" | "follow-up"; executionId: string; resultId: string }
  | { phase: "proposal" | "approval" | "applied" | "completed"; executionId: string; proposalId: string }
  | { phase: "error" | "cancelled"; executionId: string; message: string };

export type WorkspaceJob = { id: string; title: string };

/** Null means unavailable, never an empty workspace. Selected on the server. */
export function getWorkspaceHeading(reviewCount: number | null, jobCount: number | null, recentJob?: string) {
  if (reviewCount !== null && reviewCount > 0) {
    return reviewCount === 1 ? "One candidate review to pick up." : "Ready to review the next candidates?";
  }
  if (jobCount === 0) return "What role are we hiring for?";
  if (recentJob) return `Continue with ${recentJob}.`;
  return "What are we hiring for today?";
}

export function getWorkspaceSuggestions(job?: WorkspaceJob): string[] {
  return job
    ? [`Review candidates for ${job.title}`, `Show candidates needing review for ${job.title}`]
    : ["Show candidates needing review", "Help me review candidates for a role"];
}
