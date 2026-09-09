import { NextResponse } from "next/server";

import { cancelCandidateStatusProposal } from "@/lib/recruitos/status-action-server";

type Context = { params: Promise<{ executionId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { executionId } = await params;
    const body = await request.json().catch(() => null);
    const result = await cancelCandidateStatusProposal(executionId, body);
    if (!result.ok) return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return NextResponse.json({ error: "Please sign in to cancel this candidate proposal." }, { status: 401 });
    console.error("RecruitOS reviewed proposal cancel route failed:", error);
    return NextResponse.json({ error: "RecruitOS could not cancel this candidate proposal." }, { status: 500 });
  }
}
