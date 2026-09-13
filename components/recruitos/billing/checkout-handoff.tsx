"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { getPaddleClient } from "@/lib/recruitos/paddle-client";
import type { PaidPlanKey } from "@/lib/recruitos/paddle-billing";

const PRICING_URL = "https://operationos.org/pricing";

type CheckoutState = "idle" | "preparing" | "opened" | "error";

export function CheckoutHandoff({ plan }: { plan: PaidPlanKey }) {
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
        throw new Error(body.error ?? "Checkout could not be started.");
      }

      const paddle = await getPaddleClient();
      if (!paddle) throw new Error("Checkout could not be started.");

      paddle.Checkout.open({
        items: [{ priceId: body.priceId, quantity: 1 }],
        customer: { id: body.paddleCustomerId },
        settings: {
          displayMode: "overlay",
          theme: "light",
          allowLogout: false,
          successUrl: `${window.location.origin}/dashboard/agents/recruitos/billing?checkout=complete`,
        },
      });
      setState("opened");
    } catch {
      startedRef.current = false;
      setState("error");
      setMessage("Secure checkout could not be prepared. Please try again.");
    }
  }, [plan]);

  useEffect(() => {
    void startCheckout();
  }, [startCheckout]);

  return (
    <div className="product-surface mx-auto max-w-lg p-6 text-center sm:p-8">
      <p className="product-kicker">RecruitOS checkout</p>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
        {state === "error" ? "Checkout needs another try." : "Preparing secure checkout..."}
      </h1>
      <p className="mt-3 text-sm leading-6 text-ink-dim">
        {state === "opened"
          ? "Paddle Checkout is open. Your RecruitOS plan changes only after payment is verified by the billing webhook."
          : message ?? "Your selected plan is verified again on the RecruitOS server before Paddle Checkout opens."}
      </p>

      {state === "error" ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={() => void startCheckout()} className="workspace-action">
            Retry
          </button>
          <Link href={PRICING_URL} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-ink hover:border-accent hover:text-accent">
            View pricing
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function ExistingPaidPlanHandoff({
  currentPlan,
  selectedPlan,
}: {
  currentPlan: PaidPlanKey;
  selectedPlan: PaidPlanKey;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function openPortal() {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/recruitos/billing/portal", { method: "POST" });
      const body = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !body.url) throw new Error();
      window.location.assign(body.url);
    } catch {
      setPending(false);
      setMessage("Billing management could not be opened. Please try again.");
    }
  }

  const samePlan = currentPlan === selectedPlan;

  return (
    <div className="product-surface mx-auto max-w-lg p-6 text-center sm:p-8">
      <p className="product-kicker">RecruitOS billing</p>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
        {samePlan ? "This plan is already active." : "Manage your plan in Paddle."}
      </h1>
      <p className="mt-3 text-sm leading-6 text-ink-dim">
        {samePlan
          ? "RecruitOS will not start a duplicate subscription for the plan already verified on your account."
          : "You already have a paid RecruitOS subscription. Use Paddle to manage plan changes without creating a second subscription."}
      </p>
      {message ? <p role="alert" className="mt-4 text-sm text-danger">{message}</p> : null}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button type="button" disabled={pending} onClick={() => void openPortal()} className="workspace-action">
          {pending ? "Opening Paddle..." : "Manage subscription in Paddle"}
        </button>
        <Link href={PRICING_URL} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-ink hover:border-accent hover:text-accent">
          View pricing
        </Link>
      </div>
    </div>
  );
}
