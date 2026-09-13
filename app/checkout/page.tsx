import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CheckoutHandoff, ExistingPaidPlanHandoff } from "@/components/recruitos/billing/checkout-handoff";
import { getEffectiveUserPlan } from "@/lib/recruitos/effective-plan-server";
import { isPaidPlanKey } from "@/lib/recruitos/paddle-billing";
import { getAuthenticatedUser } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "RecruitOS Checkout",
  description: "Continue to secure RecruitOS billing.",
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const params = await searchParams;
  const plan = params.plan;

  if (!isPaidPlanKey(plan)) {
    return (
      <main className="min-h-screen bg-bg px-5 pb-16 pt-28 sm:px-8">
        <div className="product-surface mx-auto max-w-lg p-6 text-center sm:p-8">
          <p className="product-kicker">RecruitOS checkout</p>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">Choose a paid plan first.</h1>
          <p className="mt-3 text-sm leading-6 text-ink-dim">Only Standard and Pro can start paid checkout.</p>
          <Link href="https://operationos.org/pricing" className="workspace-action mt-6">View pricing</Link>
        </div>
      </main>
    );
  }

  const user = await getAuthenticatedUser();
  const next = `/checkout?plan=${plan}`;
  if (!user) {
    redirect(`/sign-up?next=${encodeURIComponent(next)}`);
  }

  const effectivePlan = await getEffectiveUserPlan();

  return (
    <main className="min-h-screen bg-bg px-5 pb-16 pt-28 sm:px-8">
      {effectivePlan === "free" ? (
        <CheckoutHandoff plan={plan} />
      ) : (
        <ExistingPaidPlanHandoff currentPlan={effectivePlan} selectedPlan={plan} />
      )}
    </main>
  );
}
