import type { PaidPurchaseContext } from "@/lib/recruitos/purchase-context";

export function PaidAuthContext({ context }: { context: PaidPurchaseContext }) {
  return (
    <aside className="mb-6 rounded-xl border border-accent/20 bg-accent-soft/60 p-4" aria-label="Selected RecruitOS plan">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">Selected plan</p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <div>
          <p className="font-display text-lg font-semibold text-ink">RecruitOS {context.displayName}</p>
          <p className="mt-1 text-sm text-ink-dim">Billed monthly. Cancel anytime.</p>
        </div>
        <p className="shrink-0 text-sm font-semibold text-ink">{context.priceLabel}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-ink-dim">
        Create your account or sign in to continue to secure checkout.
      </p>
    </aside>
  );
}
