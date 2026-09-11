"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { getPaddleClient } from "@/lib/recruitos/paddle-client";
import type { PaidPlanKey } from "@/lib/recruitos/paddle-billing";

export function BillingActions({ canManageBilling }: { canManageBilling: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<PaidPlanKey | "portal" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function startCheckout(plan: PaidPlanKey) {
    setPending(plan);
    setMessage(null);
    try {
      const response = await fetch("/api/recruitos/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const body = (await response.json()) as { error?: string; priceId?: string; paddleCustomerId?: string };
      if (!response.ok || !body.priceId || !body.paddleCustomerId) {
        throw new Error(body.error ?? "Checkout could not be prepared.");
      }

      const paddle = await getPaddleClient();
      if (!paddle) throw new Error("Paddle Checkout could not be initialized.");
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkout could not be started.");
    } finally {
      setPending(null);
    }
  }

  async function openPortal() {
    setPending("portal");
    setMessage(null);
    try {
      const response = await fetch("/api/recruitos/billing/portal", { method: "POST" });
      const body = (await response.json()) as { error?: string; url?: string };
      if (!response.ok || !body.url) throw new Error(body.error ?? "Billing management could not be opened.");
      window.location.assign(body.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Billing management could not be opened.");
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" className="workspace-action" disabled={pending !== null} onClick={() => startCheckout("standard")}>
          {pending === "standard" ? "Opening checkout…" : "Choose Standard · $39/month"}
        </button>
        <button type="button" className="workspace-action" disabled={pending !== null} onClick={() => startCheckout("pro")}>
          {pending === "pro" ? "Opening checkout…" : "Choose Pro · $69/month"}
        </button>
      </div>
      {canManageBilling ? (
        <button type="button" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-2" disabled={pending !== null} onClick={openPortal}>
          {pending === "portal" ? "Opening Paddle…" : "Manage subscription in Paddle"}
        </button>
      ) : null}
      {message ? <p role="alert" className="text-sm text-danger">{message}</p> : null}
      <button type="button" className="text-sm font-medium text-accent underline-offset-4 hover:underline" onClick={() => router.refresh()}>
        Refresh verified billing state
      </button>
    </div>
  );
}
