import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { PaidAuthContext } from "@/components/auth/paid-auth-context";
import { RecruitOSBrand } from "@/components/ui/recruitos-brand";
import { getPaidPurchaseContextFromRedirect } from "@/lib/recruitos/purchase-context";
import { getSafeRedirectPath } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your RecruitOS recruiting workspace.",
};

const callbackErrors: Record<string, string> = {
  config: "RecruitOS could not start the sign-in flow. Please try again, or contact the site administrator if the issue continues.",
  "invalid-link": "That confirmation link is missing required information. Request a fresh confirmation email and try again.",
  "auth-callback": "That confirmation link could not be completed. It may have expired or already been used. Request a fresh confirmation email if needed.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = getSafeRedirectPath(params.next);
  const purchaseContext = getPaidPurchaseContextFromRedirect(next);
  const callbackError = params.error ? callbackErrors[params.error] : undefined;

  return (
    <main className="min-h-screen bg-bg px-5 pb-16 pt-20 sm:px-8 sm:pt-24">
      <div className="mx-auto grid max-w-[980px] gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <aside className="hidden lg:block">
          <RecruitOSBrand variant="endorsed-black" className="w-[184px]" priority />
          <h1 className="mt-6 max-w-[440px] font-display text-4xl font-semibold leading-tight tracking-[-0.035em] text-ink">
            {purchaseContext ? `Continue with RecruitOS ${purchaseContext.displayName}.` : "Pick up the recruiting work you already started."}
          </h1>
          <p className="mt-5 max-w-[460px] text-sm leading-7 text-ink-dim">
            {purchaseContext
              ? "Sign in to keep your selected plan and continue to secure monthly checkout."
              : "Your jobs, candidates, analyses, command tasks, and reviewed actions stay connected to your authenticated workspace."}
          </p>
        </aside>

        <section className="product-surface mx-auto w-full max-w-[480px] p-6 sm:p-8">
          <p className="product-kicker">Sign in</p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
            {purchaseContext ? "Sign in to continue checkout." : "Welcome back."}
          </h2>
          <p className="mb-6 mt-3 text-sm leading-6 text-ink-dim">
            {purchaseContext ? "Your selected plan is preserved securely while you authenticate." : "Continue to your RecruitOS workspace."}
          </p>
          {purchaseContext ? <PaidAuthContext context={purchaseContext} /> : null}
          {callbackError ? (
            <div role="alert" className="mb-5 rounded-lg border border-danger/25 bg-danger/[0.05] px-4 py-3 text-sm leading-6 text-danger">
              {callbackError}
            </div>
          ) : null}
          <AuthForm mode="sign-in" next={next} />
        </section>
      </div>
    </main>
  );
}
