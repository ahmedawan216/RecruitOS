"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";

import { generateRecruiterSummary } from "@/app/actions/recruiter-summary";
import { ErrorState } from "@/components/ui/workspace";

export default function RecruiterSummary() {
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function generate() {
    setError(null);
    startTransition(async () => {
      const result = await generateRecruiterSummary();
      if (!result.success) setError(result.error ?? "Could not generate summary.");
      else setSummary(result.summary ?? null);
    });
  }

  return (
    <details className="group border-b border-border">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-sm py-3 text-sm font-medium text-ink-dim [&::-webkit-details-marker]:hidden">Recruiting brief <ChevronDown className="size-4 shrink-0 transition-transform duration-[180ms] group-open:rotate-180" aria-hidden="true" /></summary>
      <div className="pb-5">
      <div className="flex flex-col items-start gap-4">
        <div className="flex items-start gap-3">
          <p className="text-[13px] leading-[18px] text-ink-dim">Generate an optional, grounded summary from your stored candidate and pipeline data.</p>
        </div>
        <button type="button" disabled={pending} onClick={generate} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Generating…" : "Generate brief"}</button>
      </div>
      {summary ? <p role="status" className="mt-5 border-t border-border pt-5 text-sm leading-7 text-ink">{summary}</p> : null}
      {error ? <div className="mt-5"><ErrorState>{error}</ErrorState></div> : null}
      </div>
    </details>
  );
}
