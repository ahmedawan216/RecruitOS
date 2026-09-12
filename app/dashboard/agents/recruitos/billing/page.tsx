import { BillingPanel, type BillingPanelData } from "@/components/recruitos/billing/billing-panel";
import { getBillingOverview } from "@/lib/recruitos/billing-server";
import { getEffectiveUserPlan } from "@/lib/recruitos/effective-plan-server";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

function getCurrentSubscription(
  effectivePlan: BillingPanelData["effectivePlan"],
  subscriptions: Awaited<ReturnType<typeof getBillingOverview>>["subscriptions"],
): BillingPanelData["currentSubscription"] {
  const subscription =
    subscriptions.find((item) => item.plan === effectivePlan) ??
    subscriptions[0] ??
    null;

  if (!subscription) return null;

  return {
    status: subscription.status,
    currentPeriodEndsAt: subscription.current_period_ends_at,
    scheduledChangeAction: subscription.scheduled_change_action,
    scheduledChangeEffectiveAt: subscription.scheduled_change_effective_at,
  };
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const user = await requireAuthenticatedUser();
  const [effectivePlan, overview, params] = await Promise.all([
    getEffectiveUserPlan(),
    getBillingOverview(user.id),
    searchParams,
  ]);

  const billing: BillingPanelData = {
    effectivePlan,
    paddleCustomerId: overview.paddleCustomerId,
    currentSubscription: getCurrentSubscription(effectivePlan, overview.subscriptions),
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-24 sm:px-6 lg:pt-10">
      <div className="mb-8 max-w-2xl">
        <p className="product-kicker">Account</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">Billing</h1>
        <p className="mt-3 text-sm leading-6 text-ink-dim">
          Review your verified RecruitOS plan and manage the Paddle subscription connected to your account.
        </p>
      </div>

      <BillingPanel data={billing} checkoutComplete={params.checkout === "complete"} />
    </main>
  );
}
