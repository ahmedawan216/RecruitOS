"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { RecruitOSBrand } from "@/components/ui/recruitos-brand";
import type { PaidPlanKey } from "@/lib/recruitos/paddle-billing";

type ActivationState = "checking" | "ready" | "delayed";
const MAX_AUTOMATIC_CHECKS = 8;
const CHECK_INTERVAL_MS = 1500;

export function CheckoutActivation({
  plan,
  displayName,
  initialVerified,
}: {
  plan: PaidPlanKey;
  displayName: string;
  initialVerified: boolean;
}) {
  const [state, setState] = useState<ActivationState>(initialVerified ? "ready" : "checking");
  const [attempt, setAttempt] = useState(initialVerified ? MAX_AUTOMATIC_CHECKS : 0);
  const checkingRef = useRef(false);

  const checkVerifiedPlan = useCallback(async () => {
    if (checkingRef.current || state === "ready") return;
    checkingRef.current = true;

    try {
      const response = await fetch(`/api/recruitos/billing/activation?plan=${plan}`, {
        method: "GET",
        cache: "no-store",
      });
      const body = (await response.json()) as { verified?: boolean };

      if (response.ok && body.verified) {
        setState("ready");
        return;
      }

      setAttempt((current) => {
        const nextAttempt = current + 1;
        if (nextAttempt >= MAX_AUTOMATIC_CHECKS) setState("delayed");
        return nextAttempt;
      });
    } catch {
      setAttempt((current) => {
        const nextAttempt = current + 1;
        if (nextAttempt >= MAX_AUTOMATIC_CHECKS) setState("delayed");
        return nextAttempt;
      });
    } finally {
      checkingRef.current = false;
    }
  }, [plan, state]);

  useEffect(() => {
    if (state !== "checking") return;
    const timer = window.setTimeout(() => void checkVerifiedPlan(), attempt === 0 ? 250 : CHECK_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [attempt, checkVerifiedPlan, state]);

  function checkAgain() {
    if (checkingRef.current) return;
    setAttempt(0);
    setState("checking");
  }

  if (state === "ready") {
    return (
      <div className="product-surface mx-auto max-w-lg p-6 text-center sm:p-8" role="status">
        <RecruitOSBrand variant="endorsed-black" className="mx-auto w-[168px]" priority />
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
          RecruitOS {displayName} is ready.
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-dim">
          Your verified subscription is active and your RecruitOS workspace is ready.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/dashboard/agents/recruitos" className="workspace-action">Open RecruitOS</Link>
          <Link href="/dashboard/agents/recruitos/billing" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-ink hover:border-accent hover:text-accent">
            Manage billing
          </Link>
        </div>
      </div>
    );
  }

  if (state === "delayed") {
    return (
      <div className="product-surface mx-auto max-w-lg p-6 text-center sm:p-8" role="status">
        <RecruitOSBrand variant="endorsed-black" className="mx-auto w-[168px]" priority />
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
          Access is still being confirmed.
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-dim">
          Your payment was received, but RecruitOS has not yet confirmed the verified subscription state.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={checkAgain} className="workspace-action">Check again</button>
          <Link href="/dashboard/agents/recruitos" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-ink hover:border-accent hover:text-accent">
            Open RecruitOS
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="product-surface mx-auto max-w-lg p-6 text-center sm:p-8" role="status" aria-live="polite">
      <RecruitOSBrand variant="endorsed-black" className="mx-auto w-[168px]" priority />
      <h1 className="mt-6 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
        Payment received. We&apos;re activating RecruitOS.
      </h1>
      <p className="mt-3 text-sm leading-6 text-ink-dim">
        Your payment was completed. We&apos;re confirming your RecruitOS {displayName} access now.
      </p>
      <p className="mt-5 text-xs font-medium text-ink-faint">Finishing your account setup...</p>
    </div>
  );
}
