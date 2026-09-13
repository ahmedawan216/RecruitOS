import { NextResponse } from "next/server";

import { getVerifiedBillingPresentation } from "@/lib/recruitos/billing-server";
import { getEffectiveUserPlan } from "@/lib/recruitos/effective-plan-server";
import { getPaddleServerClient } from "@/lib/recruitos/paddle-server";
import { assertSameOriginRequest } from "@/lib/recruitos/request-security";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAuthenticatedUser();
    const effectivePlan = await getEffectiveUserPlan();
    const overview = await getVerifiedBillingPresentation(user.id, effectivePlan);

    if (!overview.paddleCustomerId || overview.subscriptions.length === 0) {
      return NextResponse.json(
        { error: "No current paid subscription is available to manage." },
        { status: 404 },
      );
    }

    const session = await getPaddleServerClient().customerPortalSessions.create(
      overview.paddleCustomerId,
      overview.subscriptions.map((row) => row.paddle_subscription_id),
    );

    return NextResponse.json({ url: session.urls.general.overview });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Please sign in to manage billing." }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith("ORIGIN_")) {
      return NextResponse.json({ error: "This billing request could not be verified." }, { status: 403 });
    }
    console.error("RecruitOS Paddle portal session failed:", error);
    return NextResponse.json(
      { error: "Billing management could not be opened. Please try again." },
      { status: 500 },
    );
  }
}
