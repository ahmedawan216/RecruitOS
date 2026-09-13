import { NextResponse } from "next/server";

import { getEffectiveUserPlan } from "@/lib/recruitos/effective-plan-server";
import { isPaidPlanKey } from "@/lib/recruitos/paddle-billing";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAuthenticatedUser();
    const url = new URL(request.url);
    const plan = url.searchParams.get("plan");

    if (!isPaidPlanKey(plan)) {
      return NextResponse.json({ verified: false }, { status: 400 });
    }

    const effectivePlan = await getEffectiveUserPlan();
    return NextResponse.json({
      verified: effectivePlan === plan,
      plan: effectivePlan,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ verified: false }, { status: 401 });
    }
    console.error("RecruitOS activation verification failed:", error);
    return NextResponse.json({ verified: false }, { status: 500 });
  }
}
