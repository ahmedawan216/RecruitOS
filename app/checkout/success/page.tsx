import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CheckoutActivation } from "@/components/recruitos/billing/checkout-activation";
import { RecruitOSBrand } from "@/components/ui/recruitos-brand";
import { getPlanDefinition } from "@/lib/recruitos/commercial";
import { getEffectiveUserPlan } from "@/lib/recruitos/effective-plan-server";
import { isPaidPlanKey } from "@/lib/recruitos/paddle-billing";
import { getAuthenticatedUser } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "Activate RecruitOS",
  description: "Confirm your verified RecruitOS subscription.",
};

export default async function CheckoutSuccessPage({
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
          <RecruitOSBrand variant="endorsed-black" className="mx-auto w-[168px]" priority />
          <h1 className="mt-6 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">We could not verify that purchase intent.</h1>
          <Link href="https://operationos.org/pricing" className="workspace-action mt-6">Back to pricing</Link>
        </div>
      </main>
    );
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    const next = `/checkout/success?plan=${plan}`;
    redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  }

  const effectivePlan = await getEffectiveUserPlan();
  const definition = getPlanDefinition(plan)!;

  return (
    <main className="min-h-screen bg-bg px-5 pb-16 pt-28 sm:px-8">
      <CheckoutActivation
        plan={plan}
        displayName={definition.displayName}
        initialVerified={effectivePlan === plan}
      />
    </main>
  );
}
