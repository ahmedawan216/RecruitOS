import { BillingActions } from "@/components/recruitos/billing/billing-actions";
import { getBillingOverview } from "@/lib/recruitos/billing-server";
import { getEffectiveUserPlan } from "@/lib/recruitos/effective-plan-server";
import { getPlanDefinition } from "@/lib/recruitos/commercial";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const user = await requireAuthenticatedUser();
  const [effectivePlan, overview, params] = await Promise.all([
    getEffectiveUserPlan(),
    getBillingOverview(user.id),
    searchParams,
  ]);
  const plan = getPlanDefinition(effectivePlan)!;
  const currentSubscription = overview.subscriptions.find((subscription) => subscription.plan === effectivePlan) ?? overview.subscriptions[0] ?? null;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-24 sm:px-6 lg:pt-10">
      <div className="mb-8 max-w-2xl">
        <p className="product-kicker">Account</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">Billing</h1>
        <p className="mt-3 text-sm leading-6 text-ink-dim">Your RecruitOS plan is resolved from verified Paddle subscription state. Checkout completion in the browser never grants paid access by itself.</p>
      </div>

      {params.checkout === "complete" ? (
        <div role="status" className="mb-6 rounded-xl border border-info/30 bg-surface px-4 py-3 text-sm text-ink">
          Paddle Checkout completed. RecruitOS will show the paid plan after the signed webhook is received and synchronized.
        </div>
      ) : null}

      <section className="product-surface p-5 sm:p-6" aria-labelledby="current-plan-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Current verified plan</p>
            <h2 id="current-plan-heading" className="mt-2 text-2xl font-semibold text-ink">{plan.displayName}</h2>
            <p className="mt-1 text-sm text-ink-dim">{plan.price.amount === 0 ? "$0 forever" : `$${plan.price.amount}/month`}</p>
          </div>
          {currentSubscription ? (
            <dl className="grid gap-1 text-sm text-ink-dim sm:text-right">
              <div><dt className="inline font-medium text-ink">Billing state: </dt><dd className="inline">{currentSubscription.status.replaceAll("_", " ")}</dd></div>
              {currentSubscription.current_period_ends_at ? <div><dt className="inline font-medium text-ink">Current period ends: </dt><dd className="inline">{formatDate(currentSubscription.current_period_ends_at)}</dd></div> : null}
              {currentSubscription.scheduled_change_action ? <div><dt className="inline font-medium text-ink">Scheduled: </dt><dd className="inline">{currentSubscription.scheduled_change_action} {formatDate(currentSubscription.scheduled_change_effective_at) ? `on ${formatDate(currentSubscription.scheduled_change_effective_at)}` : ""}</dd></div> : null}
            </dl>
          ) : null}
        </div>
      </section>

      <section className="mt-6 product-surface p-5 sm:p-6" aria-labelledby="plans-heading">
        <h2 id="plans-heading" className="font-display text-xl font-semibold text-ink">Choose a RecruitOS plan</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {["free", "standard", "pro"].map((key) => {
            const definition = getPlanDefinition(key)!;
            return (
              <article key={key} className="rounded-xl border border-border p-4">
                <h3 className="font-semibold text-ink">{definition.displayName}</h3>
                <p className="mt-1 text-2xl font-semibold text-ink">${definition.price.amount}<span className="text-sm font-normal text-ink-dim">{definition.price.interval ? "/month" : ""}</span></p>
                <p className="mt-3 text-sm leading-6 text-ink-dim">{definition.description}</p>
              </article>
            );
          })}
        </div>
        <div className="mt-6"><BillingActions canManageBilling={Boolean(overview.paddleCustomerId)} /></div>
      </section>
    </main>
  );
}
