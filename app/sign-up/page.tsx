import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { PaidAuthContext } from "@/components/auth/paid-auth-context";
import { RecruitOSBrand } from "@/components/ui/recruitos-brand";
import { getPaidPurchaseContextFromRedirect } from "@/lib/recruitos/purchase-context";
import { getSafeRedirectPath } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a RecruitOS account and start a private recruiting workspace.",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = getSafeRedirectPath(params.next);
  const purchaseContext = getPaidPurchaseContextFromRedirect(next);

  return (
    <main className="min-h-screen bg-bg px-5 pb-16 pt-20 sm:px-8 sm:pt-24">
      <div className="mx-auto grid max-w-[980px] gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <aside className="hidden lg:block">
          <RecruitOSBrand variant="endorsed-black" className="w-[184px]" priority />
          <h1 className="mt-6 max-w-[440px] font-display text-4xl font-semibold leading-tight tracking-[-0.035em] text-ink">
            {purchaseContext ? `Continue with RecruitOS ${purchaseContext.displayName}.` : "One workspace for direct recruiting control and faster command-driven work."}
          </h1>
          <p className="mt-5 max-w-[460px] text-sm leading-7 text-ink-dim">
            {purchaseContext
              ? "Create your account first, then continue to secure monthly checkout. Payment is handled after authentication."
              : "Create your account, add a job, bring in candidates, and use the interface or natural-language commands from the same recruiting context."}
          </p>
        </aside>

        <section className="product-surface mx-auto w-full max-w-[480px] p-6 sm:p-8">
          <p className="product-kicker">Create account</p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
            {purchaseContext ? "Create your account to continue." : "Set up RecruitOS."}
          </h2>
          <p className="mb-6 mt-3 text-sm leading-6 text-ink-dim">
            {purchaseContext
              ? "Your selected plan will stay attached to this secure purchase flow."
              : "Create your private recruiting workspace. Consequential actions remain subject to explicit human review."}
          </p>
          {purchaseContext ? <PaidAuthContext context={purchaseContext} /> : null}
          <AuthForm mode="sign-up" next={next} />
        </section>
      </div>
    </main>
  );
}
