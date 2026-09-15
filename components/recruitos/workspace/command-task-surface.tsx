"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronDown, Download, FileSearch, Loader2, RotateCcw, Sparkles, X } from "lucide-react";

import {
  canCancelExecution,
  isTerminalExecutionStatus,
  parseCandidateStatusActionCommand,
  parseFollowUpCommand,
  parseRecruitingCommand,
} from "@/lib/recruitos/command";
import { getWorkspaceSuggestions, type WorkspaceJob } from "@/lib/recruitos/workspace";
import type { ExecutionSnapshot } from "@/lib/recruitos/workspace-recovery";
import { StructuredResultView, resultCandidateCount, resultHeading } from "@/components/recruitos/workspace/structured-result-view";

type ProgressEvent = {
  id: number;
  kind: string;
  message: string;
  data: Record<string, unknown>;
  createdAt: string;
};

type DraftState = { text: string; jobId: string | null };

export function CommandComposer({ jobs, contextJob, initialExecution }: { jobs: WorkspaceJob[]; contextJob?: WorkspaceJob; initialExecution?: ExecutionSnapshot | null }) {
  const [draft, setDraft] = useState<DraftState>({ text: "", jobId: contextJob?.id ?? null });
  const [followUpDraft, setFollowUpDraft] = useState("");
  const [execution, setExecution] = useState<ExecutionSnapshot | null>(initialExecution ?? null);
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [cursor, setCursor] = useState(0);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFollowingUp, setIsFollowingUp] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const followUpRef = useRef<HTMLTextAreaElement>(null);
  const cursorRef = useRef(0);
  const restoredExecutionRef = useRef<string | null>(null);
  const selectedJob = jobs.find((job) => job.id === draft.jobId);
  const suggestions = getWorkspaceSuggestions(selectedJob ?? contextJob);
  const parsedDraft = useMemo(() => parseRecruitingCommand(draft.text), [draft.text]);
  const candidateCount = execution?.result?.candidates.length;
  const parsedFollowUp = useMemo(() => parseFollowUpCommand(followUpDraft, candidateCount), [followUpDraft, candidateCount]);
  const parsedAction = useMemo(() => parseCandidateStatusActionCommand(followUpDraft), [followUpDraft]);
  const actionRequest = parsedAction.ok || parsedAction.code !== "NOT_STATUS_ACTION";
  const resultBlocksFollowUp = execution?.result?.kind === "candidate_status_proposal" || execution?.result?.kind === "candidate_status_action_result";
  const canSubmit = parsedDraft.ok && !isSubmitting && !execution;
  const canSubmitFollowUp = Boolean(execution?.result) && execution?.status === "completed" && !resultBlocksFollowUp && (parsedFollowUp.ok || actionRequest) && !isFollowingUp;

  useEffect(() => {
    const textarea = execution ? followUpRef.current : textareaRef.current;
    if (!textarea) return;
    const resize = () => {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 168)}px`;
    };
    resize();
    let previousWidth = textarea.parentElement?.clientWidth;
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width !== previousWidth) {
        previousWidth = entry.contentRect.width;
        resize();
      }
    });
    if (textarea.parentElement) observer.observe(textarea.parentElement);
    return () => observer.disconnect();
  }, [draft.text, followUpDraft, execution?.id]);

  async function refreshExecution(executionId: string) {
    const response = await fetch(`/api/recruitos/executions/${executionId}?after=${cursorRef.current}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Task progress could not be loaded.");
    setExecution(payload.execution);
    if (Array.isArray(payload.events) && payload.events.length) {
      setEvents((current) => {
        const known = new Set(current.map((item) => item.id));
        return [...current, ...payload.events.filter((item: ProgressEvent) => !known.has(item.id))];
      });
    }
    if (typeof payload.nextCursor === "number") {
      cursorRef.current = payload.nextCursor;
      setCursor(payload.nextCursor);
    }
    return payload.execution as ExecutionSnapshot;
  }

  useEffect(() => {
    if (!initialExecution?.id || restoredExecutionRef.current === initialExecution.id) return;
    restoredExecutionRef.current = initialExecution.id;
    let cancelled = false;
    refreshExecution(initialExecution.id).catch((error) => {
      if (!cancelled) setSubmissionError(error instanceof Error ? error.message : "Recent task could not be restored.");
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialExecution?.id]);

  useEffect(() => {
    if (!execution || isTerminalExecutionStatus(execution.status)) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function drive() {
      if (stopped || !execution) return;
      try {
        const advance = await fetch(`/api/recruitos/executions/${execution.id}/advance`, { method: "POST" });
        const advancePayload = await advance.json();
        if (!advance.ok) throw new Error(advancePayload.error || "RecruitOS could not continue this task.");
        if (advancePayload.execution) setExecution(advancePayload.execution);
        const latest = await refreshExecution(execution.id);
        if (!stopped && !isTerminalExecutionStatus(latest.status)) timer = setTimeout(drive, 900);
      } catch (error) {
        if (!stopped) {
          setSubmissionError(error instanceof Error ? error.message : "RecruitOS could not continue this task.");
          timer = setTimeout(drive, 2500);
        }
      }
    }

    drive();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execution?.id, execution?.status]);

  function updateDraft(text: string, jobId = draft.jobId) {
    setDraft({ text, jobId });
    setSubmissionError(null);
  }

  async function submit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setSubmissionError(null);
    setEvents([]);
    cursorRef.current = 0;
    setCursor(0);
    try {
      const response = await fetch("/api/recruitos/executions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commandText: draft.text, jobId: draft.jobId, idempotencyKey: crypto.randomUUID() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "RecruitOS could not create the task.");
      setExecution(payload.execution);
      await refreshExecution(payload.execution.id);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "RecruitOS could not create the task.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitFollowUp() {
    if (!execution || !canSubmitFollowUp) return;
    setIsFollowingUp(true);
    setSubmissionError(null);
    try {
      const response = await fetch(`/api/recruitos/executions/${execution.id}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commandText: followUpDraft, idempotencyKey: crypto.randomUUID() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "RecruitOS could not prepare that follow-up.");
      setExecution(payload.execution);
      setFollowUpDraft("");
      await refreshExecution(execution.id);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "RecruitOS could not prepare that follow-up.");
    } finally {
      setIsFollowingUp(false);
    }
  }

  async function cancelExecution() {
    if (!execution || !canCancelExecution(execution.status) || isCancelling) return;
    setIsCancelling(true);
    setSubmissionError(null);
    try {
      const response = await fetch(`/api/recruitos/executions/${execution.id}/cancel`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "RecruitOS could not cancel this task.");
      setExecution(payload.execution);
      await refreshExecution(execution.id);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "RecruitOS could not cancel this task.");
    } finally {
      setIsCancelling(false);
    }
  }

  async function resetWorkspace() {
    if (!execution || !isTerminalExecutionStatus(execution.status) || isResetting) return;
    setIsResetting(true);
    setSubmissionError(null);
    try {
      const response = await fetch(`/api/recruitos/executions/${execution.id}/dismiss`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "RecruitOS could not start a new task.");
      setExecution(null);
      setEvents([]);
      setFollowUpDraft("");
      cursorRef.current = 0;
      setCursor(0);
      const correcting = execution.status === "failed" || execution.status === "clarification_required";
      setDraft({
        text: correcting ? execution.commandText : "",
        jobId: correcting ? jobs.find((job) => job.id === execution.resolvedJobId)?.id ?? draft.jobId ?? contextJob?.id ?? null : contextJob?.id ?? null,
      });
      queueMicrotask(() => textareaRef.current?.focus());
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "RecruitOS could not start a new task.");
    } finally {
      setIsResetting(false);
    }
  }

  if (execution) {
    const terminal = isTerminalExecutionStatus(execution.status);
    const result = execution.result;
    const followUpWorking = execution.status === "running" && execution.stage === "followup_semantic_analysis";
    const pendingProposal = result?.kind === "candidate_status_proposal";
    const appliedAction = result?.kind === "candidate_status_action_result";
    const latestProgress = [...events].reverse().find((event) => event.kind === "progress" || event.kind === "status");
    const followUpSuggestions = result && !pendingProposal && !appliedAction ? [
      ...(result.kind !== "candidate_concerns" ? ["Show me only the concerns."] : []),
      ...(resultCandidateCount(result) >= 2 && result.kind !== "candidate_comparison" ? ["Compare the strongest candidates."] : []),
      ...(result.kind === "candidate_shortlist" && result.candidates[0]?.strengths[0] ? [`Which candidates have the strongest ${result.candidates[0].strengths[0]} experience?`] : []),
      ...(resultCandidateCount(result) >= 1 ? [`Move the strongest ${Math.min(3, resultCandidateCount(result))} candidate${Math.min(3, resultCandidateCount(result)) === 1 ? "" : "s"} to interview.`] : []),
      ...(result.kind !== "candidate_shortlist" ? ["Show the full shortlist."] : []),
    ].slice(0, 4) : [];

    return (
      <section aria-labelledby="command-task-label" className="ph-no-capture" data-workspace-state={followUpWorking ? "live-work" : pendingProposal ? "review-required" : result ? "result" : terminal ? execution.status : "live-work"}>
        <div className="command-surface overflow-hidden">
          <div className="flex flex-col gap-4 px-5 pb-5 pt-6 sm:flex-row sm:items-start sm:justify-between sm:px-7 sm:pt-7">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="command-task-label" className="font-display text-xl font-semibold leading-7 text-ink">{result ? resultHeading(result) : "RecruitOS task"}</h2>
                <span className={`rounded-md px-2.5 py-1 text-[12px] font-medium ${pendingProposal ? "bg-warning-soft text-warning" : appliedAction || execution.status === "completed" ? "bg-success-soft text-success" : execution.status === "failed" || execution.status === "cancelled" || execution.status === "clarification_required" ? "bg-surface-2 text-ink-dim" : "bg-accent-soft text-accent"}`}>
                  {pendingProposal ? (result.proposalStatus === "stale" ? "Review again" : "Review required") : appliedAction ? "Applied" : followUpWorking ? "Refocusing" : execution.status === "clarification_required" ? "Needs scope" : execution.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-3 max-w-3xl break-words text-[15px] leading-6 text-ink-dim">{pendingProposal ? result.requestedCommand : execution.commandText}</p>
              {result ? <p className="mt-2 text-[13px] leading-5 text-ink-dim">Current scope · {result.job.title} · {resultCandidateCount(result)} candidate{resultCandidateCount(result) === 1 ? "" : "s"}</p> : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {result && execution.status === "completed" && !pendingProposal && !appliedAction ? <a href={`/api/recruitos/executions/${execution.id}/export`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-ink-dim hover:text-ink"><Download className="size-4" aria-hidden="true" />Download analysis</a> : null}
              {canCancelExecution(execution.status) ? <button type="button" onClick={cancelExecution} disabled={isCancelling} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-ink-dim hover:text-ink disabled:opacity-60"><X className="size-4" aria-hidden="true" />{isCancelling ? "Cancelling…" : "Cancel"}</button> : null}
              {terminal && !pendingProposal ? <button type="button" onClick={() => void resetWorkspace()} disabled={isResetting} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-ink-dim hover:text-ink disabled:opacity-60"><RotateCcw className="size-4" aria-hidden="true" />{isResetting ? "Starting…" : execution.status === "failed" || execution.status === "clarification_required" ? "Edit command" : "New task"}</button> : null}
            </div>
          </div>

          {!result ? <div className="border-t border-border px-5 py-5 sm:px-7">
            {!terminal ? <div className="mb-4 flex items-center gap-2 text-sm font-medium text-accent"><Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /><span>Working on authorized workspace data</span></div> : null}
            <ol aria-live="polite" className="space-y-3">{events.length ? events.map((event) => <li key={event.id} className="flex items-start gap-3 text-sm leading-6"><span className={`mt-2 size-1.5 shrink-0 rounded-full ${event.kind === "warning" || event.kind === "failed" ? "bg-warning" : event.kind === "completed" ? "bg-success" : "bg-accent"}`} aria-hidden="true" /><span className={event.kind === "warning" ? "text-ink-dim" : "text-ink"}>{event.message}</span></li>) : <li className="text-sm text-ink-dim">Loading task progress…</li>}</ol>
            {execution.errorMessage ? <div role="status" className="mt-5 rounded-lg border border-border bg-surface-2 p-4 text-sm leading-6 text-ink-dim">{execution.errorMessage}</div> : null}
            {submissionError ? <div role="alert" className="mt-4 text-sm leading-6 text-danger">{submissionError}</div> : null}
          </div> : <div className="border-t border-border">
            {followUpWorking ? <div className="border-b border-border bg-accent-soft px-5 py-4 sm:px-7" aria-live="polite"><div className="flex items-center gap-3 text-sm font-medium text-accent"><Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /><span>{latestProgress?.message ?? "Reviewing current shortlist evidence"}</span></div><p className="mt-1 pl-7 text-[12px] leading-5 text-ink-dim">The current result remains visible while RecruitOS performs this bounded analytical pass.</p></div> : null}
            {execution.errorMessage && !pendingProposal ? <div role="status" className="border-b border-border bg-warning-soft px-5 py-4 text-sm leading-6 text-ink-dim sm:px-7">{execution.errorMessage}</div> : null}
            <StructuredResultView result={result} executionId={execution.id} />
            {!pendingProposal && !appliedAction ? <div className="border-t border-border bg-bg px-5 py-4 text-[12px] leading-5 text-ink-dim sm:px-7">Decision support only. RecruitOS has not rejected, advanced, contacted, scheduled, or otherwise changed any candidate.</div> : null}

            {execution.status === "completed" && !pendingProposal && !appliedAction ? <div className="border-t border-border px-5 py-5 sm:px-7 sm:py-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-display text-base font-semibold text-ink">Continue this recruiting task</h3><p className="mt-1 text-[13px] leading-5 text-ink-dim">Your next command stays within the current {result.job.title} task and its {resultCandidateCount(result)} candidates.</p></div><span className="inline-flex items-center gap-2 self-start rounded-md bg-accent-soft px-2.5 py-1 text-[12px] font-medium text-accent"><Sparkles className="size-3.5" aria-hidden="true" />Current result context</span></div>
              <div className="mt-4 rounded-lg border border-border bg-surface px-4 py-3">
                <textarea ref={followUpRef} value={followUpDraft} rows={2} maxLength={1000} autoComplete="off" spellCheck aria-label="Contextual follow-up command" aria-describedby="followup-help followup-keyboard" placeholder="Show me only the concerns…" onChange={(event) => { setFollowUpDraft(event.target.value); setSubmissionError(null); }} onKeyDown={(event) => { if (!event.nativeEvent.isComposing && event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); if (canSubmitFollowUp) void submitFollowUp(); } }} className="ph-mask ph-no-capture ph-no-capture-input block min-h-[64px] max-h-[168px] w-full resize-none overflow-y-auto bg-transparent text-[15px] leading-6 text-ink outline-none placeholder:text-ink-dim focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent" />
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p id="followup-help" className={`text-[12px] leading-5 ${followUpDraft && !parsedFollowUp.ok && !parsedAction.ok ? "text-warning" : "text-ink-dim"}`}>{submissionError ?? (!followUpDraft ? "Focus, compare, inspect evidence, or prepare a human-reviewed move to Interview." : parsedAction.ok ? "This will prepare exact candidate changes for human review. No status changes occur until you separately approve the proposal." : actionRequest ? parsedAction.message : parsedFollowUp.ok ? (parsedFollowUp.requiresSemanticAnalysis ? "RecruitOS will review evidence for this focus across the current candidates." : "This follow-up uses the current analysis without re-analyzing resumes.") : parsedFollowUp.message)}</p><button type="button" onClick={() => void submitFollowUp()} disabled={!canSubmitFollowUp} className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 ${parsedAction.ok ? "bg-warning" : "bg-accent"}`}>{isFollowingUp ? "Preparing…" : parsedAction.ok ? "Prepare proposal" : "Apply follow-up"}{isFollowingUp ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ArrowUpRight className="size-4" aria-hidden="true" />}</button></div>
                <p id="followup-keyboard" className="sr-only">Enter inserts a new line. Control or Command plus Enter applies a supported analytical follow-up or prepares a reviewed candidate status proposal.</p>
              </div>
              {followUpSuggestions.length ? <div className="mt-3 flex flex-wrap gap-2" aria-label="Suggested follow-ups">{followUpSuggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => { setFollowUpDraft(suggestion); setSubmissionError(null); queueMicrotask(() => followUpRef.current?.focus()); }} className="min-h-10 rounded-lg border border-border px-3 text-[13px] font-medium text-ink-dim hover:border-accent hover:text-accent">{suggestion}</button>)}</div> : null}
            </div> : null}
          </div>}
        </div>
      </section>
    );
  }

  const helpCopy = !draft.text ? selectedJob ? `Commands use ${selectedJob.title}. Say “this role” to refer to it. Candidate status changes need your separate approval.` : "Name a job in your command, or select one above. Candidate status changes need your separate approval." : parsedDraft.ok ? `Ready to prepare up to ${parsedDraft.value.requestedCount} candidates using resume evidence from your workspace.` : parsedDraft.message;

  return (
    <section aria-labelledby="command-label" className="ph-no-capture ph-no-capture-input" data-workspace-state={draft.text ? "command-draft" : "idle"}>
      <div className="command-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-6 sm:px-7 sm:pt-7"><label id="command-label" htmlFor="workspace-command" className="font-display text-xl font-semibold leading-7 text-ink">Tell RecruitOS what you need</label><span className="inline-flex items-center gap-2 rounded-md bg-accent-soft px-2.5 py-1 text-[13px] font-medium text-accent"><span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />Recruiting commands</span></div>
        <div className="px-5 pb-5 pt-5 sm:px-7"><textarea ref={textareaRef} id="workspace-command" name="command" value={draft.text} rows={2} maxLength={4000} autoComplete="off" spellCheck aria-describedby="command-availability command-keyboard" placeholder={selectedJob ? "Review candidates for this role and show the strongest 8…" : "Review candidates for [job title] and show the strongest 8…"} onChange={(event) => updateDraft(event.target.value)} onKeyDown={(event) => { if (!event.nativeEvent.isComposing && event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); if (canSubmit) void submit(); } }} className="ph-mask ph-no-capture ph-no-capture-input block min-h-[84px] max-h-[168px] w-full resize-none overflow-y-auto rounded-sm bg-transparent py-2 text-base leading-7 text-ink outline-none placeholder:text-ink-dim focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent" /></div>
        <div className="flex flex-col gap-3 px-5 pb-5 sm:flex-row sm:items-center sm:justify-between sm:px-7"><div className="flex min-w-0 max-w-full items-center gap-3 sm:w-[60%]"><label htmlFor="command-scope" className="shrink-0 text-[13px] text-ink-dim">Job</label><div className="relative min-w-0 flex-1"><select id="command-scope" value={draft.jobId ?? ""} onChange={(event) => updateDraft(draft.text, event.target.value || null)} className="min-h-11 w-full min-w-0 appearance-none rounded-lg bg-accent-soft py-2 pl-3 pr-8 text-sm font-medium text-accent"><option value="">Use the job named in my command</option>{jobs.length ? <optgroup label="Recent and current jobs">{jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</optgroup> : null}</select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 size-4 text-accent" aria-hidden="true" /></div></div><button type="button" onClick={() => void submit()} disabled={!canSubmit} aria-describedby="command-availability" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-end rounded-lg bg-accent px-5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40">{isSubmitting ? "Starting…" : "Run task"} {isSubmitting ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ArrowUpRight className="size-4" aria-hidden="true" />}</button></div>
        <div className="px-5 pb-5 text-[13px] leading-[18px] text-ink-dim sm:px-7"><p id="command-availability" className={!parsedDraft.ok && draft.text ? "text-warning" : undefined}>{submissionError ?? helpCopy}</p><p id="command-keyboard" className="sr-only">Enter inserts a new line. Control or Command plus Enter runs a supported task.</p></div>
        <div className="rounded-b-xl border-t border-border bg-bg px-3 py-3 sm:px-5"><p className="px-2 pb-2 text-[13px] font-medium text-ink-dim">Suggested tasks <span className="font-normal">· select to edit</span></p><div className="flex flex-col gap-1">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => { updateDraft(suggestion, selectedJob?.id ?? contextJob?.id ?? null); textareaRef.current?.focus(); }} className="group flex min-h-12 w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-[15px] leading-[22px] text-ink transition-colors duration-[180ms] ease-out hover:bg-accent-soft"><FileSearch className="size-[18px] shrink-0 text-ink-dim" aria-hidden="true" /><span className="min-w-0 flex-1 break-words">{suggestion}</span><ArrowDownLeft className="size-4 shrink-0 text-accent transition-transform duration-[180ms] group-hover:translate-y-0.5 motion-reduce:transform-none" aria-hidden="true" /></button>)}</div></div>
      </div>
      <span className="sr-only" aria-hidden="true">{cursor}</span>
    </section>
  );
}
