import { NextResponse } from "next/server";

import { readCommandExecution } from "@/lib/recruitos/execution-server";

type Context = { params: Promise<{ executionId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { executionId } = await params;
    const url = new URL(request.url);
    const after = Number(url.searchParams.get("after") ?? "0");
    const result = await readCommandExecution(executionId, Number.isFinite(after) ? after : 0);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Please sign in to view RecruitOS tasks." }, { status: 401 });
    }
    console.error("RecruitOS execution read route failed:", error);
    return NextResponse.json({ error: "Task progress could not be loaded." }, { status: 500 });
  }
}
