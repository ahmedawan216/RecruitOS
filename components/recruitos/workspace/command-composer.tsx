"use client";

import { useEffect, useState } from "react";

import { CommandComposer as LiveCommandComposer } from "@/components/recruitos/workspace/command-task-surface";
import type { WorkspaceJob } from "@/lib/recruitos/workspace";

export function CommandComposer({ jobs, contextJob }: { jobs: WorkspaceJob[]; contextJob?: WorkspaceJob }) {
  const [initialExecutionId, setInitialExecutionId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/recruitos/executions", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!cancelled && payload?.execution?.id) setInitialExecutionId(payload.execution.id);
      })
      .catch(() => {
        // Idle workspace remains usable if execution recovery is temporarily unavailable.
      });
    return () => { cancelled = true; };
  }, []);

  return <LiveCommandComposer jobs={jobs} contextJob={contextJob} initialExecutionId={initialExecutionId} />;
}
