import { NextResponse } from "next/server";

import { dismissWorkspaceExecution } from "@/lib/recruitos/workspace-recovery-server";

type Context = { params: Promise<{ executionId: string }> };

export async function POST(_request: Request, { params }: Context) {
  try {
    const { executionId } = await params;
    const result = await dismissWorkspaceExecution(executionId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Please sign in to start a new RecruitOS task." }, { status: 401 });
    }
    console.error("RecruitOS workspace dismissal failed:", error);
    return NextResponse.json({ error: "RecruitOS could not clear this task from the workspace." }, { status: 500 });
  }
}
