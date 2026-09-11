import { NextResponse } from "next/server";

import { getPaddleServerClient } from "@/lib/recruitos/paddle-server";
import { assertSameOriginRequest } from "@/lib/recruitos/request-security";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAuthenticatedUser();

    const customerResult = await supabaseAdmin
      .from("recruitos_paddle_customers")
      .select("paddle_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (customerResult.error) throw customerResult.error;
    if (!customerResult.data) {
      return NextResponse.json({ error: "No Paddle billing account exists for this RecruitOS account." }, { status: 404 });
    }

    const subscriptionsResult = await supabaseAdmin
      .from("recruitos_paddle_subscriptions")
      .select("paddle_subscription_id")
      .eq("user_id", user.id)
      .limit(25);
    if (subscriptionsResult.error) throw subscriptionsResult.error;

    const session = await getPaddleServerClient().customerPortalSessions.create(
      customerResult.data.paddle_customer_id,
      (subscriptionsResult.data ?? []).map((row) => row.paddle_subscription_id),
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
    return NextResponse.json({ error: "Billing management could not be opened. Please try again." }, { status: 500 });
  }
}
