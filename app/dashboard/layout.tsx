import type { ReactNode } from "react";
import { IBM_Plex_Sans, Public_Sans } from "next/font/google";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { BillingPanelData } from "@/components/recruitos/billing/billing-panel";
import { getVerifiedBillingPresentation } from "@/lib/recruitos/billing-server";
import { getEffectiveUserPlan } from "@/lib/recruitos/effective-plan-server";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

const productUI = Public_Sans({ subsets: ["latin"], variable: "--font-product-ui", display: "swap" });
const productDisplay = IBM_Plex_Sans({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-product-display", display: "swap" });

function getDisplayName(user: Awaited<ReturnType<typeof requireAuthenticatedUser>>) {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const candidates = [metadata?.full_name, metadata?.name, metadata?.display_name];
  const metadataName = candidates.find((value): value is string => typeof value === "string" && value.trim().length > 0);
  return metadataName?.trim() ?? user.email ?? "RecruitOS account";
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireAuthenticatedUser();
  const effectivePlan = await getEffectiveUserPlan();
  const overview = await getVerifiedBillingPresentation(user.id, effectivePlan).catch((error) => {
    console.error("RecruitOS verified billing presentation lookup failed:", error);
    return { paddleCustomerId: null, subscriptions: [] };
  });

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
    <div className={`${productUI.variable} ${productDisplay.variable}`}>
      <DashboardShell
        displayName={getDisplayName(user)}
        email={user.email ?? "Signed-in recruiter"}
        billing={billing}
      >
        {children}
      </DashboardShell>
    </div>
  );
}
