import { NextResponse } from "next/server";

import { createCommandExecution } from "@/lib/recruitos/execution-server";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { getLatestWorkspaceExecution } from "@/lib/recruitos/workspace-recovery-server";

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const execution = await getLatestWorkspaceExecution(user.id);
    return NextResponse.json({ execution });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Please sign in to view RecruitOS tasks." }, { status: 401 });
    }
    console.error("RecruitOS latest execution route failed:", error);
    return NextResponse.json({ error: "Recent RecruitOS task could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "The command submission was malformed." }, { status: 400 });
    }

    const result = await createCommandExecution(body);
    if (!result.ok) return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
    return NextResponse.json({ execution: result.execution, duplicate: result.duplicate }, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Please sign in to run RecruitOS tasks." }, { status: 401 });
    }
    console.error("RecruitOS execution intake route failed:", error);
    return NextResponse.json({ error: "RecruitOS could not create the task. Please try again." }, { status: 500 });
  }
}
