import Link from "next/link";

import { getPlanDefinition } from "@/lib/recruitos/commercial";
import { RECRUITOS_PRICING_URL, type PlanLimitReached } from "@/lib/recruitos/plan-limits";

export function PlanLimitNotice({ limit }: { limit: PlanLimitReached }) {
  const plan = getPlanDefinition(limit.plan);
  if (!plan) return null;

  const cta =
    limit.plan === "free"
      ? { label: "Upgrade plan", href: RECRUITOS_PRICING_URL }
      : limit.plan === "standard"
        ? { label: "View Pro", href: RECRUITOS_PRICING_URL }
        : null;

  return (
    <div
      role="alert"
      data-plan-limit-resource={limit.resource}
      className="rounded-xl border border-warning/30 bg-warning/[0.06] p-4 text-sm text-ink"
    >
      <p className="font-medium">{limit.message}</p>
      <p className="mt-1.5 text-ink-dim">Current plan: {plan.displayName}</p>
      {cta ? (
        <Link
          href={cta.href}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-accent px-3.5 font-medium text-white transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {cta.label}
        </Link>
      ) : (
        <p className="mt-3 font-medium text-ink-dim">Limit reached for this billing period.</p>
      )}
    </div>
  );
}
