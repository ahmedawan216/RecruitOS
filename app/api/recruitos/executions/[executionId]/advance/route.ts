import { NextResponse } from "next/server";

import { advanceCommandExecution } from "@/lib/recruitos/execution-server";

type Context = { params: Promise<{ executionId: string }> };

export async function POST(_request: Request, { params }: Context) {
  try {
    const { executionId } = await params;
    const result = await advanceCommandExecution(executionId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Please sign in to run RecruitOS tasks." }, { status: 401 });
    }
    console.error("RecruitOS execution advance route failed:", error);
    return NextResponse.json({ error: "RecruitOS could not continue this task." }, { status: 500 });
  }
}
