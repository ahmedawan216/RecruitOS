import { CommandComposer as LiveCommandComposer } from "@/components/recruitos/workspace/command-task-surface";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import type { WorkspaceJob } from "@/lib/recruitos/workspace";
import { getLatestWorkspaceExecution } from "@/lib/recruitos/workspace-recovery-server";

export async function CommandComposer({ jobs, contextJob }: { jobs: WorkspaceJob[]; contextJob?: WorkspaceJob }) {
  const user = await requireAuthenticatedUser();
  const initialExecution = await getLatestWorkspaceExecution(user.id);
  return <LiveCommandComposer jobs={jobs} contextJob={contextJob} initialExecution={initialExecution} />;
}
