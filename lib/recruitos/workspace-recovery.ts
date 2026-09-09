import type { ExecutionResult } from "@/lib/recruitos/command";

export type ExecutionSnapshot = {
  id: string;
  status: string;
  stage: string;
  commandText: string;
  requestedCount: number;
  requestedJobText: string | null;
  resolvedJobId: string | null;
  result: ExecutionResult | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecoveryMode = "resume" | "restore" | "none";

export function getExecutionRecoveryMode(status: string): RecoveryMode {
  if (["queued", "running"].includes(status)) return "resume";
  if (["completed", "failed", "cancelled", "clarification_required"].includes(status)) return "restore";
  return "none";
}

export function isWorkspaceExecutionDismissed(workState: unknown) {
  if (!workState || typeof workState !== "object" || Array.isArray(workState)) return false;
  const dismissedAt = (workState as Record<string, unknown>).workspaceDismissedAt;
  return typeof dismissedAt === "string" && dismissedAt.length > 0;
}
