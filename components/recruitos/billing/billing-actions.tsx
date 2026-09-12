"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BillingActions({ canManageBilling }: { canManageBilling: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<"portal" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
    <div className="flex flex-col items-start gap-3">
      {canManageBilling ? (
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending !== null}
          onClick={openPortal}
        >
          {pending === "portal" ? "Opening Paddle..." : "Manage subscription in Paddle"}
        </button>
      ) : null}
      {message ? <p role="alert" className="text-sm text-danger">{message}</p> : null}
      <button
        type="button"
        className="text-sm font-medium text-accent underline-offset-4 hover:underline"
        onClick={() => router.refresh()}
      >
        Refresh verified billing state
      </button>
    </div>
  );
}
