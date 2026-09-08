"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronDown, FileSearch, Loader2, RotateCcw, X } from "lucide-react";

import {
  canCancelExecution,
  isTerminalExecutionStatus,
  parseRecruitingCommand,
  type ExecutionResult,
} from "@/lib/recruitos/command";
import { getWorkspaceSuggestions, type WorkspaceJob } from "@/lib/recruitos/workspace";

type ExecutionSnapshot = {
  id: string;
  status: string;
  stage: string;
  commandText: string;
  requestedCount: number;
  requestedJobText: string | null;
  resolvedJobId: string | null;
  result: ExecutionResult | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProgressEvent = {
  id: number;
  kind: string;
  message: string;
  data: Record<string, unknown>;
  createdAt: string;
};

type DraftState = { text: string; jobId: string | null };

export function CommandComposer({ jobs, contextJob, initialExecutionId }: { jobs: WorkspaceJob[]; contextJob?: WorkspaceJob; initialExecutionId?: string | null }) {
  const [draft, setDraft] = useState<DraftState>({ text: "", jobId: null });
  const [execution, setExecution] = useState<ExecutionSnapshot | null>(null);
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [cursor, setCursor] = useState(0);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorRef = useRef(0);
  const selectedJob = jobs.find((job) => job.id === draft.jobId);
  const suggestions = getWorkspaceSuggestions(selectedJob ?? contextJob);
  const parsedDraft = useMemo(() => parseRecruitingCommand(draft.text), [draft.text]);
  const canSubmit = parsedDraft.ok && !isSubmitting && !execution;

  useEffect(() => {
    const textarea = textareaRef.current;
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
  }, [draft.text]);

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
    if (!initialExecutionId || execution) return;
    let cancelled = false;
    refreshExecution(initialExecutionId).catch((error) => {
      if (!cancelled) setSubmissionError(error instanceof Error ? error.message : "Recent task could not be restored.");
    });
    return () => { cancelled = true; };
    // execution intentionally excluded: this only restores once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialExecutionId]);

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
    // cursor is tracked via cursorRef to avoid restarting the runner for every event page.
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
        body: JSON.stringify({
          commandText: draft.text,
          jobId: draft.jobId,
          idempotencyKey: crypto.randomUUID(),
        }),
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

  function resetWorkspace() {
    setExecution(null);
    setEvents([]);
    setSubmissionError(null);
    cursorRef.current = 0;
    setCursor(0);
    setDraft({ text: "", jobId: contextJob?.id ?? null });
    queueMicrotask(() => textareaRef.current?.focus());
  }

  if (execution) {
    const terminal = isTerminalExecutionStatus(execution.status);
    const result = execution.result;
    return (
      <section aria-labelledby="command-task-label" className="ph-no-capture" data-workspace-state={result ? "result" : terminal ? execution.status : "live-work"}>
        <div className="command-surface overflow-hidden">
          <div className="flex flex-col gap-4 px-5 pb-5 pt-6 sm:flex-row sm:items-start sm:justify-between sm:px-7 sm:pt-7">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="command-task-label" className="font-display text-xl font-semibold leading-7 text-ink">{result ? `${result.job.title} shortlist` : "RecruitOS task"}</h2>
                <span className={`rounded-md px-2.5 py-1 text-[12px] font-medium ${execution.status === "completed" ? "bg-success-soft text-success" : execution.status === "failed" || execution.status === "cancelled" || execution.status === "clarification_required" ? "bg-surface-2 text-ink-dim" : "bg-accent-soft text-accent"}`}>
                  {execution.status === "clarification_required" ? "Needs scope" : execution.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-3 max-w-3xl break-words text-[15px] leading-6 text-ink-dim">{execution.commandText}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {canCancelExecution(execution.status) ? <button type="button" onClick={cancelExecution} disabled={isCancelling} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-ink-dim hover:text-ink disabled:opacity-60"><X className="size-4" aria-hidden="true" />{isCancelling ? "Cancelling…" : "Cancel"}</button> : null}
              {terminal ? <button type="button" onClick={resetWorkspace} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-ink-dim hover:text-ink"><RotateCcw className="size-4" aria-hidden="true" />New task</button> : null}
            </div>
          </div>

          {!result ? <div className="border-t border-border px-5 py-5 sm:px-7">
            {!terminal ? <div className="mb-4 flex items-center gap-2 text-sm font-medium text-accent"><Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /><span>Working on authorized workspace data</span></div> : null}
            <ol aria-live="polite" className="space-y-3">
              {events.length ? events.map((event) => <li key={event.id} className="flex items-start gap-3 text-sm leading-6">
                <span className={`mt-2 size-1.5 shrink-0 rounded-full ${event.kind === "warning" || event.kind === "failed" ? "bg-warning" : event.kind === "completed" ? "bg-success" : "bg-accent"}`} aria-hidden="true" />
                <span className={event.kind === "warning" ? "text-ink-dim" : "text-ink"}>{event.message}</span>
              </li>) : <li className="text-sm text-ink-dim">Loading task progress…</li>}
            </ol>
            {execution.errorMessage ? <div role="status" className="mt-5 rounded-lg border border-border bg-surface-2 p-4 text-sm leading-6 text-ink-dim">{execution.errorMessage}</div> : null}
            {submissionError ? <div role="alert" className="mt-4 text-sm leading-6 text-danger">{submissionError}</div> : null}
          </div> : <div className="border-t border-border">
            <div className="grid gap-4 px-5 py-5 sm:grid-cols-4 sm:px-7">
              <div><p className="text-xs text-ink-dim">Applicants considered</p><p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{result.consideredCount}</p></div>
              <div><p className="text-xs text-ink-dim">Existing assessments</p><p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{result.reusedAnalysisCount}</p></div>
              <div><p className="text-xs text-ink-dim">New assessments</p><p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{result.generatedAnalysisCount}</p></div>
              <div><p className="text-xs text-ink-dim">Prepared candidates</p><p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{result.rankedCount}</p></div>
            </div>
            {result.partial ? <p className="border-t border-border px-5 py-3 text-[13px] leading-5 text-ink-dim sm:px-7">Partial result: {result.analysisFailureCount} applicant assessment{result.analysisFailureCount === 1 ? "" : "s"} could not be completed. The ranking uses only available validated evidence.</p> : null}
            <ol className="divide-y divide-border">
              {result.candidates.map((candidate) => <li key={candidate.candidateId} className="px-5 py-6 sm:px-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3"><span className="font-mono text-sm text-accent">#{candidate.rank}</span><h3 className="break-words font-display text-lg font-semibold text-ink">{candidate.name || candidate.email || "Unnamed candidate"}</h3></div>
                    {candidate.email && candidate.name ? <p className="mt-1 text-[13px] text-ink-dim">{candidate.email}</p> : null}
                    {candidate.summary ? <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-dim">{candidate.summary}</p> : null}
                  </div>
                  <div className="shrink-0 text-left sm:text-right"><p className="text-2xl font-semibold tabular-nums text-ink">{candidate.matchScore}/100</p><p className="mt-1 text-[11px] leading-4 text-ink-dim">Stored match score · not a hiring probability</p></div>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <div><p className="text-xs font-medium text-ink">Evidence</p><ul className="mt-2 space-y-1 text-[13px] leading-5 text-ink-dim">{candidate.evidence.length ? candidate.evidence.slice(0, 4).map((item) => <li key={item}>• {item}</li>) : <li>No additional evidence summary stored.</li>}</ul></div>
                  <div><p className="text-xs font-medium text-ink">Strengths</p><p className="mt-2 text-[13px] leading-5 text-ink-dim">{candidate.strengths.length ? candidate.strengths.slice(0, 6).join(" · ") : "No structured strengths stored."}</p></div>
                  <div><p className="text-xs font-medium text-ink">Concerns / gaps</p><p className="mt-2 text-[13px] leading-5 text-ink-dim">{[...candidate.concerns, ...candidate.missingSkills].slice(0, 6).join(" · ") || "No structured concerns stored."}</p></div>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-[12px] capitalize text-ink-dim">Recruiter status: {candidate.recruiterStatus ?? "not set"}</p><Link href={candidate.candidateHref} className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-accent">Inspect candidate <ArrowUpRight className="size-4" aria-hidden="true" /></Link></div>
              </li>)}
            </ol>
            <div className="border-t border-border bg-bg px-5 py-4 text-[12px] leading-5 text-ink-dim sm:px-7">Decision support only. RecruitOS has not rejected, advanced, contacted, or otherwise changed any candidate.</div>
          </div>}
        </div>
      </section>
    );
  }

  const helpCopy = !draft.text
    ? "Phase 2C can review and rank applicants for a job. No hiring status changes are performed."
    : parsedDraft.ok
      ? `Ready to prepare up to ${parsedDraft.value.requestedCount} candidates using authorized workspace evidence.`
      : parsedDraft.message;

  return (
    <section aria-labelledby="command-label" className="ph-no-capture ph-no-capture-input" data-workspace-state={draft.text ? "command-draft" : "idle"}>
      <div className="command-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-6 sm:px-7 sm:pt-7">
          <label id="command-label" htmlFor="workspace-command" className="font-display text-xl font-semibold leading-7 text-ink">Tell RecruitOS what you need</label>
          <span className="inline-flex items-center gap-2 rounded-md bg-accent-soft px-2.5 py-1 text-[13px] font-medium text-accent"><span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />Real execution</span>
        </div>
        <div className="px-5 pb-5 pt-5 sm:px-7">
          <textarea ref={textareaRef} id="workspace-command" name="command" value={draft.text} rows={2} maxLength={4000} autoComplete="off" spellCheck
            aria-describedby="command-availability command-keyboard" placeholder="Review applicants for Senior Accountant and prepare the strongest 8…"
            onChange={(event) => updateDraft(event.target.value)}
            onKeyDown={(event) => {
              if (!event.nativeEvent.isComposing && event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                if (canSubmit) void submit();
              }
            }}
            className="ph-mask ph-no-capture ph-no-capture-input block min-h-[84px] max-h-[168px] w-full resize-none overflow-y-auto rounded-sm bg-transparent py-2 text-base leading-7 text-ink outline-none placeholder:text-ink-dim focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          />
        </div>
        <div className="flex flex-col gap-3 px-5 pb-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex min-w-0 max-w-full items-center gap-3 sm:w-[60%]">
            <label htmlFor="command-scope" className="shrink-0 text-[13px] text-ink-dim">Scope</label>
            <div className="relative min-w-0 flex-1">
              <select id="command-scope" value={draft.jobId ?? ""} onChange={(event) => updateDraft(draft.text, event.target.value || null)} className="min-h-11 w-full min-w-0 appearance-none rounded-lg bg-accent-soft py-2 pl-3 pr-8 text-sm font-medium text-accent">
                <option value="">Resolve from command</option>
                {jobs.length ? <optgroup label="Recent and current jobs">{jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</optgroup> : null}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3.5 size-4 text-accent" aria-hidden="true" />
            </div>
          </div>
          <button type="button" onClick={() => void submit()} disabled={!canSubmit} aria-describedby="command-availability" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-end rounded-lg bg-accent px-5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40">{isSubmitting ? "Starting…" : "Run task"} {isSubmitting ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ArrowUpRight className="size-4" aria-hidden="true" />}</button>
        </div>
        <div className="px-5 pb-5 text-[13px] leading-[18px] text-ink-dim sm:px-7">
          <p id="command-availability" className={!parsedDraft.ok && draft.text ? "text-warning" : undefined}>{submissionError ?? helpCopy}</p>
          <p id="command-keyboard" className="sr-only">Enter inserts a new line. Control or Command plus Enter runs a supported task.</p>
        </div>
        <div className="rounded-b-xl border-t border-border bg-bg px-3 py-3 sm:px-5">
          <p className="px-2 pb-2 text-[13px] font-medium text-ink-dim">Suggested tasks <span className="font-normal">· select to edit</span></p>
          <div className="flex flex-col gap-1">
            {suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => {
              updateDraft(suggestion, selectedJob?.id ?? contextJob?.id ?? null);
              textareaRef.current?.focus();
            }} className="group flex min-h-12 w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-[15px] leading-[22px] text-ink transition-colors duration-[180ms] ease-out hover:bg-accent-soft">
              <FileSearch className="size-[18px] shrink-0 text-ink-dim" aria-hidden="true" /><span className="min-w-0 flex-1 break-words">{suggestion}</span><ArrowDownLeft className="size-4 shrink-0 text-accent transition-transform duration-[180ms] group-hover:translate-y-0.5 motion-reduce:transform-none" aria-hidden="true" />
            </button>)}
          </div>
        </div>
      </div>
      <span className="sr-only" aria-hidden="true">{cursor}</span>
    </section>
  );
}
