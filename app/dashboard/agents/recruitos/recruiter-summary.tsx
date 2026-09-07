"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";

import { generateRecruiterSummary } from "@/app/actions/recruiter-summary";
import { ErrorState, Surface } from "@/components/ui/workspace";

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
    <Surface className="mt-4 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><Sparkles className="size-4" aria-hidden="true" /></span>
          <div><p className="text-sm font-semibold text-ink">Recruiting brief</p><p className="mt-1 max-w-2xl text-xs leading-5 text-ink-dim">Generate an optional, grounded summary from your stored candidate and pipeline data.</p></div>
        </div>
        <button type="button" disabled={pending} onClick={generate} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-surface px-4 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Generating…" : "Generate brief"}</button>
      </div>
      {summary ? <p role="status" className="mt-5 border-t border-border pt-5 text-sm leading-7 text-ink">{summary}</p> : null}
      {error ? <div className="mt-5"><ErrorState>{error}</ErrorState></div> : null}
    </Surface>
  );
}
