import { NextResponse } from "next/server";

import { beginContextualFollowUp } from "@/lib/recruitos/follow-up-server";

type Context = { params: Promise<{ executionId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { executionId } = await params;
    const body = await request.json().catch(() => null);
    const result = await beginContextualFollowUp(executionId, body);
    if (!result.ok) return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return NextResponse.json({ error: "Please sign in to continue RecruitOS tasks." }, { status: 401 });
    console.error("RecruitOS contextual follow-up route failed:", error);
    return NextResponse.json({ error: "RecruitOS could not prepare that follow-up." }, { status: 500 });
  }
}
