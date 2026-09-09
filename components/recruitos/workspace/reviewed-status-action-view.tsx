"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Loader2, ShieldCheck, X } from "lucide-react";

import type { CandidateStatusAppliedResult, CandidateStatusProposalResult } from "@/lib/recruitos/result";

function statusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ReviewedStatusProposalView({ executionId, result }: { executionId: string; result: CandidateStatusProposalResult }) {
  const [isApplying, setIsApplying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stale = result.proposalStatus === "stale";

  async function apply() {
    if (isApplying || isCancelling || stale) return;
    setIsApplying(true);
    setError(null);
    try {
      const response = await fetch(`/api/recruitos/executions/${executionId}/proposal/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: result.proposalId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "RecruitOS could not apply the approved changes.");
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "RecruitOS could not apply the approved changes.");
      setIsApplying(false);
    }
  }

  async function cancel() {
    if (isApplying || isCancelling) return;
    setIsCancelling(true);
    setError(null);
    try {
      const response = await fetch(`/api/recruitos/executions/${executionId}/proposal/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: result.proposalId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "RecruitOS could not cancel this proposal.");
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "RecruitOS could not cancel this proposal.");
      setIsCancelling(false);
    }
  }

  return <div>
    <div className={`border-b border-border px-5 py-5 sm:px-7 ${stale ? "bg-danger-soft" : "bg-warning-soft"}`} role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <ShieldCheck className={`mt-0.5 size-5 shrink-0 ${stale ? "text-danger" : "text-warning"}`} aria-hidden="true" />
        <div>
          <p className={`text-sm font-semibold ${stale ? "text-danger" : "text-ink"}`}>{stale ? "Review required again" : "Human review required"}</p>
          <p className="mt-1 max-w-3xl text-[13px] leading-5 text-ink-dim">{stale ? "Candidate state changed after this proposal was prepared. Nothing from this stale proposal will be applied." : "RecruitOS prepared these exact candidate status changes. Nothing has been changed yet."}</p>
        </div>
      </div>
    </div>

    <div className="px-5 py-5 sm:px-7">
      <p className="font-mono text-[11px] tracking-[0.08em] text-warning">PROPOSED CHANGES</p>
      <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div><h3 className="font-display text-xl font-semibold text-ink">{result.job.title}</h3><p className="mt-1 text-sm text-ink-dim">{result.changeCount} candidate change{result.changeCount === 1 ? "" : "s"} awaiting recruiter approval</p></div>
        <p className="mt-2 text-xs text-ink-dim sm:mt-0">Prepared {new Date(result.createdAt).toLocaleString()}</p>
      </div>
    </div>

    <ol className="divide-y divide-border border-y border-border">{result.candidates.map((candidate) => <li key={candidate.candidateId} className="px-5 py-5 sm:px-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><p className="break-words font-display text-lg font-semibold text-ink">{candidate.name || candidate.email || "Unnamed candidate"}</p>{candidate.email && candidate.name ? <p className="mt-1 text-[13px] text-ink-dim">{candidate.email}</p> : null}{candidate.conflictReason ? <p className="mt-2 text-[13px] leading-5 text-danger">{candidate.conflictReason}</p> : null}</div>
        <div className="flex flex-wrap items-center gap-2 text-sm"><span className="rounded-md border border-border px-2.5 py-1.5 capitalize text-ink-dim">{statusLabel(candidate.currentStatus ?? candidate.expectedStatus)}</span><span aria-hidden="true" className="text-ink-dim">→</span><span className="rounded-md bg-warning-soft px-2.5 py-1.5 font-medium text-ink">Interview</span></div>
      </div>
      <div className="mt-3"><Link href={candidate.candidateHref} className="inline-flex min-h-10 items-center gap-2 text-[13px] font-medium text-accent">Inspect candidate <ArrowUpRight className="size-4" aria-hidden="true" /></Link></div>
    </li>)}</ol>

    {result.skipped.length ? <div className="px-5 py-5 sm:px-7"><p className="text-xs font-medium text-ink">Not included in the change</p><ul className="mt-3 space-y-2">{result.skipped.map((candidate) => <li key={candidate.candidateId} className="text-[13px] leading-5 text-ink-dim"><span className="font-medium text-ink">{candidate.name || candidate.email || "Unnamed candidate"}</span> · {candidate.reason}</li>)}</ul></div> : null}

    <div className="border-t border-border bg-bg px-5 py-5 sm:px-7">
      <p className="text-[13px] leading-5 text-ink-dim">The recruiter must explicitly approve this proposal. Refreshing, viewing, polling, or typing the original command does not approve any change.</p>
      {error ? <p className="mt-3 text-sm text-danger" role="alert">{error}</p> : null}
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => void cancel()} disabled={isApplying || isCancelling} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-ink disabled:opacity-50"><X className="size-4" aria-hidden="true" />{isCancelling ? "Cancelling…" : "Cancel"}</button>
        <button type="button" onClick={() => void apply()} disabled={isApplying || isCancelling || stale} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-warning px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">{isApplying ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}{isApplying ? "Applying approved changes…" : `Apply ${result.changeCount} change${result.changeCount === 1 ? "" : "s"}`}</button>
      </div>
    </div>
  </div>;
}

export function ReviewedStatusAppliedView({ result }: { result: CandidateStatusAppliedResult }) {
  return <div>
    <div className="border-b border-border bg-success-soft px-5 py-5 sm:px-7" role="status">
      <div className="flex items-start gap-3"><Check className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" /><div><p className="text-sm font-semibold text-success">Changes applied</p><p className="mt-1 text-[13px] leading-5 text-ink-dim">The recruiter approved this proposal. RecruitOS applied exactly the approved candidate status changes.</p></div></div>
    </div>
    <div className="px-5 py-5 sm:px-7"><p className="font-mono text-[11px] tracking-[0.08em] text-success">CHANGES APPLIED</p><h3 className="mt-3 font-display text-xl font-semibold text-ink">{result.appliedCount} candidate{result.appliedCount === 1 ? "" : "s"} moved to Interview</h3><p className="mt-1 text-sm text-ink-dim">{result.job.title} · {new Date(result.appliedAt).toLocaleString()}</p></div>
    <ol className="divide-y divide-border border-y border-border">{result.candidates.map((candidate) => <li key={candidate.candidateId} className="px-5 py-5 sm:px-7"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-display text-lg font-semibold text-ink">{candidate.name || candidate.email || "Unnamed candidate"}</p>{candidate.email && candidate.name ? <p className="mt-1 text-[13px] text-ink-dim">{candidate.email}</p> : null}</div><div className="flex items-center gap-2 text-sm"><span className="rounded-md border border-border px-2.5 py-1.5 text-ink-dim">{statusLabel(candidate.previousStatus)}</span><span aria-hidden="true" className="text-ink-dim">→</span><span className="rounded-md bg-success-soft px-2.5 py-1.5 font-medium text-success">Interview</span></div></div><div className="mt-3"><Link href={candidate.candidateHref} className="inline-flex min-h-10 items-center gap-2 text-[13px] font-medium text-accent">Inspect candidate <ArrowUpRight className="size-4" aria-hidden="true" /></Link></div></li>)}</ol>
    <div className="px-5 py-5 text-[13px] leading-5 text-ink-dim sm:px-7">RecruitOS did not independently choose to interview these candidates. It prepared the proposal, the recruiter approved it, and RecruitOS applied the approved changes.</div>
  </div>;
}
