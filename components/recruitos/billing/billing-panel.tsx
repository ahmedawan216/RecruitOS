import Link from "next/link";

import { BillingActions } from "@/components/recruitos/billing/billing-actions";
import { getPlanDefinition, type PlanKey } from "@/lib/recruitos/commercial";

export const RECRUITOS_PRICING_URL = "https://operationos.org/pricing";

export type BillingPanelData = Readonly<{
  effectivePlan: PlanKey;
  paddleCustomerId: string | null;
  currentSubscription: Readonly<{
    status: string;
    currentPeriodEndsAt: string | null;
    scheduledChangeAction: string | null;
    scheduledChangeEffectiveAt: string | null;
  }> | null;
}>;

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

function formatStatus(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function BillingPanel({
  data,
  checkoutComplete = false,
}: {
  data: BillingPanelData;
  checkoutComplete?: boolean;
}) {
  const plan = getPlanDefinition(data.effectivePlan);
  if (!plan) return null;

  const isPaid = data.effectivePlan !== "free";
  const periodEnd = formatDate(data.currentSubscription?.currentPeriodEndsAt ?? null);
  const scheduledDate = formatDate(data.currentSubscription?.scheduledChangeEffectiveAt ?? null);
  const planActionLabel = data.effectivePlan === "free" ? "Upgrade plan" : "View plans";

  return (
    <div data-recruitos-billing-panel className="space-y-5">
      {checkoutComplete ? (
        <div role="status" className="rounded-xl border border-info/30 bg-surface-2 px-4 py-3 text-sm leading-6 text-ink">
          Paddle Checkout completed. Your RecruitOS plan changes only after the signed Paddle webhook is verified and synchronized.
        </div>
      ) : null}

      <section className="rounded-xl border border-border bg-surface p-5 sm:p-6" aria-labelledby="current-billing-plan">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Current plan</p>
        <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 id="current-billing-plan" className="font-display text-2xl font-semibold text-ink">
              {plan.displayName}
            </h3>
            {isPaid ? <p className="mt-1 text-sm text-ink-dim">${plan.price.amount}/month</p> : <p className="mt-1 text-sm text-ink-dim">$0</p>}
          </div>

          <dl className="grid gap-1.5 text-sm text-ink-dim sm:text-right">
            <div>
              <dt className="inline font-medium text-ink">Billing state: </dt>
              <dd className="inline">
                {data.currentSubscription ? formatStatus(data.currentSubscription.status) : isPaid ? "Pending synchronization" : "Free plan"}
              </dd>
            </div>
            {periodEnd ? (
              <div>
                <dt className="inline font-medium text-ink">Current period ends: </dt>
                <dd className="inline">{periodEnd}</dd>
              </div>
            ) : null}
            {data.currentSubscription?.scheduledChangeAction ? (
              <div>
                <dt className="inline font-medium text-ink">Scheduled: </dt>
                <dd className="inline">
                  {formatStatus(data.currentSubscription.scheduledChangeAction)}
                  {scheduledDate ? ` on ${scheduledDate}` : ""}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="mt-5">
          <BillingActions canManageBilling={Boolean(data.paddleCustomerId)} />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5 sm:p-6" aria-labelledby="billing-plan-options">
        <h3 id="billing-plan-options" className="font-display text-lg font-semibold text-ink">Plan options</h3>
        <p className="mt-2 max-w-xl text-sm leading-6 text-ink-dim">
          Need a different plan? View RecruitOS plans and pricing on OperationOS.
        </p>
        <Link
          href={RECRUITOS_PRICING_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {planActionLabel}
        </Link>
      </section>
    </div>
  );
}
