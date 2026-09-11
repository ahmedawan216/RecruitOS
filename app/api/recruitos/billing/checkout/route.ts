import { NextResponse } from "next/server";

import { getOrCreatePaddleCustomer } from "@/lib/recruitos/billing-server";
import { getPaddlePriceIdForPlan, isPaidPlanKey } from "@/lib/recruitos/paddle-billing";
import { assertSameOriginRequest } from "@/lib/recruitos/request-security";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAuthenticatedUser();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "The checkout request was malformed." }, { status: 400 });
    }

    const plan = typeof body === "object" && body !== null && "plan" in body ? (body as { plan?: unknown }).plan : null;
    if (!isPaidPlanKey(plan)) {
      return NextResponse.json({ error: "Choose Standard or Pro to start checkout." }, { status: 400 });
    }

    const priceId = getPaddlePriceIdForPlan(plan);
    if (!priceId) {
      console.error(`Paddle price is not configured for ${plan}.`);
      return NextResponse.json({ error: "Checkout is not configured for this plan." }, { status: 503 });
    }

    const customer = await getOrCreatePaddleCustomer(user);
    return NextResponse.json({
      plan,
      priceId,
      paddleCustomerId: customer.paddle_customer_id,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Please sign in to start checkout." }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith("ORIGIN_")) {
      return NextResponse.json({ error: "This billing request could not be verified." }, { status: 403 });
    }
    console.error("RecruitOS Paddle checkout preparation failed:", error);
    return NextResponse.json({ error: "Checkout could not be started. Please try again." }, { status: 500 });
  }
}
