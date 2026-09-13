import { BillingPanel, type BillingPanelData } from "@/components/recruitos/billing/billing-panel";
import { getVerifiedBillingPresentation } from "@/lib/recruitos/billing-server";
import { getEffectiveUserPlan } from "@/lib/recruitos/effective-plan-server";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

export default async function BillingPage() {
  const user = await requireAuthenticatedUser();
  const effectivePlan = await getEffectiveUserPlan();
  const overview = await getVerifiedBillingPresentation(user.id, effectivePlan);
  const subscription = overview.subscriptions[0] ?? null;

  const billing: BillingPanelData = {
    effectivePlan,
    paddleCustomerId: overview.paddleCustomerId,
    currentSubscription: subscription
      ? {
          status: subscription.status,
          currentPeriodEndsAt: subscription.current_period_ends_at,
          scheduledChangeAction: subscription.scheduled_change_action,
          scheduledChangeEffectiveAt: subscription.scheduled_change_effective_at,
        }
      : null,
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-24 sm:px-6 lg:pt-10">
      <div className="mb-8 max-w-2xl">
        <p className="product-kicker">Account</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">Billing</h1>
        <p className="mt-3 text-sm leading-6 text-ink-dim">
          Review your verified RecruitOS plan and manage the current Paddle subscription connected to your account.
        </p>
      </div>
      <BillingPanel data={billing} />
    </main>
  );
}
