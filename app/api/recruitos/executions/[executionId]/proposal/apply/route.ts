import { NextResponse } from "next/server";

import { applyCandidateStatusProposal } from "@/lib/recruitos/status-action-server";

type Context = { params: Promise<{ executionId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { executionId } = await params;
    const body = await request.json().catch(() => null);
    const result = await applyCandidateStatusProposal(executionId, body);
    if (!result.ok) return NextResponse.json({ error: result.error, code: result.code, execution: "execution" in result ? result.execution : undefined }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return NextResponse.json({ error: "Please sign in to approve candidate changes." }, { status: 401 });
    console.error("RecruitOS reviewed proposal apply route failed:", error);
    return NextResponse.json({ error: "RecruitOS could not apply the approved candidate changes." }, { status: 500 });
  }
}
