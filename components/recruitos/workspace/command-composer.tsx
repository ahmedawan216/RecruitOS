"use client";

import { CommandComposer as LiveCommandComposer } from "@/components/recruitos/workspace/command-task-surface";
import type { WorkspaceJob } from "@/lib/recruitos/workspace";
import type { ExecutionSnapshot } from "@/lib/recruitos/workspace-recovery";

export function CommandComposer({
  jobs,
  contextJob,
  initialExecution,
}: {
  jobs: WorkspaceJob[];
  contextJob?: WorkspaceJob;
  initialExecution?: ExecutionSnapshot | null;
}) {
  return <LiveCommandComposer jobs={jobs} contextJob={contextJob} initialExecution={initialExecution ?? null} />;
}
