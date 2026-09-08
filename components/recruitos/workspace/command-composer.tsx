"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronDown, FileSearch } from "lucide-react";
import { getWorkspaceSuggestions, type WorkspaceJob, type WorkspaceState } from "@/lib/recruitos/workspace";

type DraftState = Extract<WorkspaceState, { draft: unknown }>;

export function CommandComposer({ jobs, contextJob }: { jobs: WorkspaceJob[]; contextJob?: WorkspaceJob }) {
  const [state, setState] = useState<DraftState>({ phase: "idle", draft: { text: "", jobId: null } });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { text, jobId } = state.draft;
  const selectedJob = jobs.find((job) => job.id === jobId);
  const suggestions = getWorkspaceSuggestions(selectedJob ?? contextJob);

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
  }, [text]);

  function updateDraft(value: string, scope = jobId) {
    setState({ phase: value ? "command-draft" : "idle", draft: { text: value, jobId: scope } });
  }

  return (
    <section aria-labelledby="command-label" className="ph-no-capture ph-no-capture-input" data-workspace-state={state.phase}>
      <div className="command-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-6 sm:px-7 sm:pt-7">
          <label id="command-label" htmlFor="workspace-command" className="font-display text-xl font-semibold leading-7 text-ink">Tell RecruitOS what you need</label>
          <span className="inline-flex items-center gap-2 rounded-md bg-surface-2 px-2.5 py-1 text-[13px] font-medium text-ink-dim"><span className="size-1.5 rounded-full bg-ink-dim" aria-hidden="true" />Draft only</span>
        </div>
        <div className="px-5 pb-5 pt-5 sm:px-7">
          <textarea ref={textareaRef} id="workspace-command" name="command-draft" value={text} rows={2} maxLength={4000} autoComplete="off" spellCheck
            aria-describedby="command-availability command-keyboard" placeholder="Describe the recruiting work you want to get done…"
            onChange={(event) => updateDraft(event.target.value)}
            onKeyDown={(event) => {
              if (!event.nativeEvent.isComposing && event.key === "Enter" && (event.ctrlKey || event.metaKey)) event.preventDefault();
            }}
            className="ph-mask ph-no-capture ph-no-capture-input block min-h-[84px] max-h-[168px] w-full resize-none overflow-y-auto rounded-sm bg-transparent py-2 text-base leading-7 text-ink outline-none placeholder:text-ink-dim focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          />
        </div>
        <div className="flex flex-col gap-3 px-5 pb-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex min-w-0 max-w-full items-center gap-3 sm:w-[60%]">
            <label htmlFor="command-scope" className="shrink-0 text-[13px] text-ink-dim">Scope</label>
            <div className="relative min-w-0 flex-1">
              <select id="command-scope" value={jobId ?? ""} onChange={(event) => updateDraft(text, event.target.value || null)} className="min-h-11 w-full min-w-0 appearance-none rounded-lg bg-accent-soft py-2 pl-3 pr-8 text-sm font-medium text-accent">
                <option value="">All your jobs</option>
                {jobs.length ? <optgroup label="Recent and current jobs">{jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</optgroup> : null}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3.5 size-4 text-accent" aria-hidden="true" />
            </div>
          </div>
          <button type="button" disabled aria-describedby="command-availability" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-end rounded-lg border border-border bg-surface-2 px-5 text-sm font-medium text-ink-dim disabled:cursor-not-allowed">Run task <ArrowUpRight className="size-4" aria-hidden="true" /></button>
        </div>
      <div className="px-5 pb-5 text-[13px] leading-[18px] text-ink-dim sm:px-7">
        <p id="command-availability">Execution isn’t available yet. Drafts aren’t saved or submitted.</p>
        <p id="command-keyboard" className="sr-only">Enter inserts a new line. Ctrl or Command plus Enter is reserved for future execution and does nothing yet.</p>
      </div>
      <div className="rounded-b-xl border-t border-border bg-bg px-3 py-3 sm:px-5">
        <p className="px-2 pb-2 text-[13px] font-medium text-ink-dim">Suggested drafts <span className="font-normal">· select to edit</span></p>
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
    </section>
  );
}
