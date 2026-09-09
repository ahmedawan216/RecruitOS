import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { ExecutionResult } from "@/lib/recruitos/result";
import { ReviewedStatusAppliedView, ReviewedStatusProposalView } from "@/components/recruitos/workspace/reviewed-status-action-view";

function CandidateLink({ href }: { href: string }) {
  return <Link href={href} className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-accent">Inspect candidate <ArrowUpRight className="size-4" aria-hidden="true" /></Link>;
}

function CandidateName({ name, email }: { name: string | null; email: string | null }) {
  return <div className="min-w-0"><h3 className="break-words font-display text-lg font-semibold text-ink">{name || email || "Unnamed candidate"}</h3>{email && name ? <p className="mt-1 text-[13px] text-ink-dim">{email}</p> : null}</div>;
}

function StoredScore({ score }: { score: number }) {
  return <div className="shrink-0 text-left sm:text-right"><p className="text-2xl font-semibold tabular-nums text-ink">{score}/100</p><p className="mt-1 text-[11px] leading-4 text-ink-dim">Stored match score · not a hiring probability</p></div>;
}

function EmptyEvidence({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-[13px] leading-5 text-ink-dim">{children}</p>;
}

function Overview({ result }: { result: Extract<ExecutionResult, { kind: "candidate_shortlist" }> }) {
  return <>
    <div className="grid gap-4 px-5 py-5 sm:grid-cols-4 sm:px-7">
      <div><p className="text-xs text-ink-dim">Applicants considered</p><p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{result.consideredCount}</p></div>
      <div><p className="text-xs text-ink-dim">Existing assessments</p><p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{result.reusedAnalysisCount}</p></div>
      <div><p className="text-xs text-ink-dim">New assessments</p><p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{result.generatedAnalysisCount}</p></div>
      <div><p className="text-xs text-ink-dim">Prepared candidates</p><p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{result.rankedCount}</p></div>
    </div>
    {result.partial ? <p className="border-t border-border px-5 py-3 text-[13px] leading-5 text-ink-dim sm:px-7">Partial result: {result.analysisFailureCount} applicant assessment{result.analysisFailureCount === 1 ? "" : "s"} could not be completed. The ranking uses only available validated evidence.</p> : null}
    <ol className="divide-y divide-border">{result.candidates.map((candidate) => <li key={candidate.candidateId} className="px-5 py-6 sm:px-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-3"><span className="font-mono text-sm text-accent">#{candidate.rank}</span><CandidateName name={candidate.name} email={candidate.email} /></div>{candidate.summary ? <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-dim">{candidate.summary}</p> : null}</div><StoredScore score={candidate.matchScore} /></div><div className="mt-4 grid gap-4 lg:grid-cols-3"><div><p className="text-xs font-medium text-ink">Evidence</p>{candidate.evidence.length ? <ul className="mt-2 space-y-1 text-[13px] leading-5 text-ink-dim">{candidate.evidence.slice(0, 4).map((item) => <li key={item}>• {item}</li>)}</ul> : <EmptyEvidence>No additional evidence summary stored.</EmptyEvidence>}</div><div><p className="text-xs font-medium text-ink">Strengths</p><EmptyEvidence>{candidate.strengths.length ? candidate.strengths.slice(0, 6).join(" · ") : "No structured strengths stored."}</EmptyEvidence></div><div><p className="text-xs font-medium text-ink">Concerns / gaps</p><EmptyEvidence>{[...candidate.concerns, ...candidate.missingSkills].slice(0, 6).join(" · ") || "No structured concerns stored."}</EmptyEvidence></div></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-[12px] capitalize text-ink-dim">Recruiter status: {candidate.recruiterStatus ?? "not set"}</p><CandidateLink href={candidate.candidateHref} /></div></li>)}</ol>
  </>;
}

function Concerns({ result }: { result: Extract<ExecutionResult, { kind: "candidate_concerns" }> }) {
  return <><div className="px-5 py-4 text-[13px] leading-5 text-ink-dim sm:px-7">Focused on concerns and missing evidence across the current {result.candidateSetCount} candidate shortlist. No candidate status has changed.</div><ol className="divide-y divide-border">{result.candidates.map((candidate) => <li key={candidate.candidateId} className="px-5 py-6 sm:px-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 items-start gap-3"><span className="font-mono text-sm text-accent">#{candidate.rank}</span><CandidateName name={candidate.name} email={candidate.email} /></div><StoredScore score={candidate.matchScore} /></div><div className="mt-4 grid gap-4 lg:grid-cols-2"><div><p className="text-xs font-medium text-ink">Primary concerns</p>{candidate.concerns.length ? <ul className="mt-2 space-y-2 text-[13px] leading-5 text-ink-dim">{candidate.concerns.map((item) => <li key={item}>• {item}</li>)}</ul> : <EmptyEvidence>No structured concerns are present in the stored analysis.</EmptyEvidence>}</div><div><p className="text-xs font-medium text-ink">Gaps / missing evidence</p>{candidate.missingSkills.length ? <ul className="mt-2 space-y-2 text-[13px] leading-5 text-ink-dim">{candidate.missingSkills.map((item) => <li key={item}>• {item}</li>)}</ul> : <EmptyEvidence>No structured skill gaps are present in the stored analysis.</EmptyEvidence>}</div></div><div className="mt-5 flex justify-end"><CandidateLink href={candidate.candidateHref} /></div></li>)}</ol></>;
}

function Comparison({ result }: { result: Extract<ExecutionResult, { kind: "candidate_comparison" }> }) {
  return <><div className="px-5 py-4 text-[13px] leading-5 text-ink-dim sm:px-7">Comparing {result.comparedCount} candidates from the bounded {result.sourceCandidateCount}-candidate task result using existing evidence.</div><div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-sm"><thead><tr className="border-y border-border bg-bg"><th className="px-5 py-3 font-medium text-ink-dim sm:px-7">Candidate</th><th className="px-4 py-3 font-medium text-ink-dim">Stored match</th><th className="px-4 py-3 font-medium text-ink-dim">Experience</th><th className="px-4 py-3 font-medium text-ink-dim">Strengths</th><th className="px-4 py-3 font-medium text-ink-dim">Concerns / gaps</th></tr></thead><tbody>{result.candidates.map((candidate) => <tr key={candidate.candidateId} className="border-b border-border align-top"><td className="px-5 py-5 sm:px-7"><p className="font-medium text-ink">#{candidate.originalRank} {candidate.name || candidate.email || "Unnamed candidate"}</p><div className="mt-2"><CandidateLink href={candidate.candidateHref} /></div></td><td className="px-4 py-5 tabular-nums text-ink">{candidate.matchScore}/100</td><td className="px-4 py-5 text-ink-dim">{candidate.yearsRelevantExperience === null ? "Not established" : `${candidate.yearsRelevantExperience} years`}</td><td className="max-w-[260px] px-4 py-5 text-[13px] leading-5 text-ink-dim">{candidate.strengths.slice(0, 5).join(" · ") || "No structured strengths stored."}</td><td className="max-w-[280px] px-4 py-5 text-[13px] leading-5 text-ink-dim">{[...candidate.concerns, ...candidate.missingSkills].slice(0, 5).join(" · ") || "No structured concerns stored."}</td></tr>)}</tbody></table></div></>;
}

function SkillFocus({ result }: { result: Extract<ExecutionResult, { kind: "candidate_skill_focus" }> }) {
  return <><div className="px-5 py-4 text-[13px] leading-5 text-ink-dim sm:px-7">Evidence focus: {result.focus}. Overall stored match scores remain visible for context.</div>{result.insufficientEvidence ? <div className="border-t border-border bg-warning-soft px-5 py-4 text-sm leading-6 text-ink-dim sm:px-7">The stored candidate evidence does not reliably establish {result.focus}. Missing evidence is treated as uncertainty, not as negative evidence.</div> : null}<ol className="divide-y divide-border">{result.candidates.map((candidate) => <li key={candidate.candidateId} className="px-5 py-6 sm:px-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex items-start gap-3"><span className="font-mono text-sm text-accent">#{candidate.rank}</span><CandidateName name={candidate.name} email={candidate.email} /></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-dim"><span>Evidence strength: <span className="font-medium capitalize text-ink">{candidate.evidenceStrength}</span></span><span>Focus relevance: <span className="font-medium tabular-nums text-ink">{candidate.relevanceScore}/100</span></span><span>Original shortlist: #{candidate.originalRank}</span></div></div><StoredScore score={candidate.matchScore} /></div><div className="mt-4"><p className="text-xs font-medium text-ink">Relevant stored evidence</p>{candidate.relevantEvidence.length ? <ul className="mt-2 space-y-2 text-[13px] leading-5 text-ink-dim">{candidate.relevantEvidence.map((item) => <li key={item}>• {item}</li>)}</ul> : <EmptyEvidence>No reliable stored evidence was identified for this focus.</EmptyEvidence>}{candidate.uncertainty ? <p className="mt-3 text-[12px] leading-5 text-ink-dim">Uncertainty: {candidate.uncertainty}</p> : null}</div><div className="mt-5 flex justify-end"><CandidateLink href={candidate.candidateHref} /></div></li>)}</ol></>;
}

function Refocus({ result }: { result: Extract<ExecutionResult, { kind: "candidate_refocus" }> }) {
  return <><div className="px-5 py-4 text-[13px] leading-5 text-ink-dim sm:px-7">Analytical ordering focused on {result.focus}. This does not change the job requirements or any hiring status.</div>{result.insufficientEvidence ? <div className="border-t border-border bg-warning-soft px-5 py-4 text-sm leading-6 text-ink-dim sm:px-7">The stored candidate evidence does not reliably establish {result.focus}. Missing evidence is treated as uncertainty, not as negative evidence.</div> : null}<ol className="divide-y divide-border">{result.candidates.map((candidate) => <li key={candidate.candidateId} className="px-5 py-6 sm:px-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex items-start gap-3"><span className="font-mono text-sm text-accent">#{candidate.focusRank}</span><CandidateName name={candidate.name} email={candidate.email} /></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-dim"><span>Evidence strength: <span className="font-medium capitalize text-ink">{candidate.evidenceStrength}</span></span><span>Focus relevance: <span className="font-medium tabular-nums text-ink">{candidate.relevanceScore}/100</span></span><span>Original shortlist: #{candidate.originalRank}{candidate.movement ? ` · ${candidate.movement > 0 ? "up" : "down"} ${Math.abs(candidate.movement)}` : " · unchanged"}</span></div></div><StoredScore score={candidate.matchScore} /></div><div className="mt-4"><p className="text-xs font-medium text-ink">Relevant stored evidence</p>{candidate.relevantEvidence.length ? <ul className="mt-2 space-y-2 text-[13px] leading-5 text-ink-dim">{candidate.relevantEvidence.map((item) => <li key={item}>• {item}</li>)}</ul> : <EmptyEvidence>No reliable stored evidence was identified for this focus.</EmptyEvidence>}{candidate.uncertainty ? <p className="mt-3 text-[12px] leading-5 text-ink-dim">Uncertainty: {candidate.uncertainty}</p> : null}</div><div className="mt-5 flex justify-end"><CandidateLink href={candidate.candidateHref} /></div></li>)}</ol></>;
}

export function StructuredResultView({ result, executionId }: { result: ExecutionResult; executionId?: string }) {
  switch (result.kind) {
    case "candidate_shortlist": return <Overview result={result} />;
    case "candidate_concerns": return <Concerns result={result} />;
    case "candidate_comparison": return <Comparison result={result} />;
    case "candidate_skill_focus": return <SkillFocus result={result} />;
    case "candidate_refocus": return <Refocus result={result} />;
    case "candidate_status_proposal": return executionId ? <ReviewedStatusProposalView executionId={executionId} result={result} /> : null;
    case "candidate_status_action_result": return <ReviewedStatusAppliedView result={result} />;
  }
}

export function resultCandidateCount(result: ExecutionResult) {
  if (result.kind === "candidate_shortlist") return result.candidates.length;
  if (result.kind === "candidate_comparison") return result.sourceCandidateCount;
  if (result.kind === "candidate_status_proposal") return result.changeCount + result.skipped.length;
  if (result.kind === "candidate_status_action_result") return result.appliedCount;
  return result.candidateSetCount;
}

export function resultHeading(result: ExecutionResult) {
  switch (result.kind) {
    case "candidate_shortlist": return `${result.job.title} shortlist`;
    case "candidate_concerns": return `${result.job.title} concerns`;
    case "candidate_comparison": return `${result.job.title} comparison`;
    case "candidate_skill_focus": return `${result.focus} evidence`;
    case "candidate_refocus": return `${result.job.title} · ${result.focus} focus`;
    case "candidate_status_proposal": return `${result.job.title} proposed changes`;
    case "candidate_status_action_result": return `${result.job.title} changes applied`;
  }
}
