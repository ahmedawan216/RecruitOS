"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { getPaddleClient } from "@/lib/recruitos/paddle-client";
import type { PaidPlanKey } from "@/lib/recruitos/paddle-billing";

const PRICING_URL = "https://operationos.org/pricing";

type CheckoutState = "idle" | "preparing" | "opened" | "error";

export function CheckoutHandoff({
  plan,
  displayName,
  priceLabel,
}: {
  plan: PaidPlanKey;
  displayName: string;
  priceLabel: string;
}) {
  const [state, setState] = useState<CheckoutState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const startedRef = useRef(false);

  const startCheckout = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setState("preparing");
    setMessage(null);

    try {
      const response = await fetch("/api/recruitos/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const body = (await response.json()) as {
        error?: string;
        priceId?: string;
        paddleCustomerId?: string;
      };

      if (!response.ok || !body.priceId || !body.paddleCustomerId) {
        throw new Error("CHECKOUT_PREPARATION_FAILED");
      }

      const paddle = await getPaddleClient();
      if (!paddle) throw new Error("CHECKOUT_INITIALIZATION_FAILED");

      paddle.Checkout.open({
        items: [{ priceId: body.priceId, quantity: 1 }],
        customer: { id: body.paddleCustomerId },
        settings: {
          displayMode: "overlay",
          theme: "light",
          allowLogout: false,
          successUrl: `${window.location.origin}/checkout/success?plan=${plan}`,
        },
      });
      setState("opened");
    } catch {
      startedRef.current = false;
      setState("error");
      setMessage("We couldn't open secure checkout.");
    }
  }, [plan]);

  useEffect(() => {
    void startCheckout();
  }, [startCheckout]);

  return (
    <div className="product-surface mx-auto max-w-lg p-6 text-center sm:p-8">
      <p className="product-kicker">RecruitOS by OperationOS</p>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
        Complete your RecruitOS {displayName} setup
      </h1>

      <div className="mx-auto mt-6 max-w-sm rounded-xl border border-border bg-surface-2 p-4 text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Selected plan</p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <p className="font-display text-lg font-semibold text-ink">{displayName}</p>
          <p className="text-sm font-semibold text-ink">{priceLabel}</p>
        </div>
        <p className="mt-1 text-xs text-ink-dim">Billed monthly. Cancel anytime.</p>
      </div>

      <div className="mt-6" role="status" aria-live="polite">
        {state === "error" ? (
          <>
            <h2 className="font-display text-xl font-semibold text-ink">We couldn&apos;t open secure checkout.</h2>
            <p className="mt-2 text-sm leading-6 text-ink-dim">
              Please try again. Your selected plan is still preserved.
            </p>
          </>
        ) : (
          <>
            <h2 className="font-display text-xl font-semibold text-ink">
              {state === "opened" ? "Secure checkout is open." : "Preparing secure checkout..."}
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-dim">
              {state === "opened"
                ? "Complete payment in Paddle. RecruitOS access is activated only after the verified billing webhook confirms your subscription."
                : "RecruitOS is verifying your account and approved plan before opening Paddle."}
            </p>
          </>
        )}
      </div>

      {state === "opened" ? (
        <div className="mt-6">
          <Link href={PRICING_URL} className="text-sm font-medium text-accent underline-offset-4 hover:underline">
            Back to pricing
          </Link>
        </div>
      ) : null}

      {state === "error" ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={() => void startCheckout()} className="workspace-action">
            Try again
          </button>
          <Link href={PRICING_URL} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-ink hover:border-accent hover:text-accent">
            Back to pricing
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function ExistingPaidPlanHandoff({
  currentPlan,
  selectedPlan,
  currentPlanName,
}: {
  currentPlan: PaidPlanKey;
  selectedPlan: PaidPlanKey;
  currentPlanName: string;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function openPortal() {
    if (pending) return;
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/recruitos/billing/portal", { method: "POST" });
      const body = (await response.json()) as { url?: string };
      if (!response.ok || !body.url) throw new Error("PORTAL_UNAVAILABLE");
      window.location.assign(body.url);
    } catch {
      setPending(false);
      setMessage("Billing management could not be opened. Please try again.");
    }
  }

  const samePlan = currentPlan === selectedPlan;

  return (
    <div className="product-surface mx-auto max-w-lg p-6 text-center sm:p-8">
      <p className="product-kicker">RecruitOS by OperationOS</p>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
        {samePlan ? `You're already on RecruitOS ${currentPlanName}.` : "Manage your RecruitOS plan in Paddle."}
      </h1>
      <p className="mt-3 text-sm leading-6 text-ink-dim">
        {samePlan
          ? "RecruitOS will not start another checkout for the plan already verified on your account."
          : "You already have a verified paid subscription. Use Paddle billing management to change plans without creating a second subscription."}
      </p>
      {message ? <p role="alert" className="mt-4 text-sm text-danger">{message}</p> : null}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/dashboard/agents/recruitos" className="workspace-action">Open RecruitOS</Link>
        <button
          type="button"
          disabled={pending}
          onClick={() => void openPortal()}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-ink hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Opening Paddle..." : "Manage subscription"}
        </button>
      </div>
    </div>
  );
}
