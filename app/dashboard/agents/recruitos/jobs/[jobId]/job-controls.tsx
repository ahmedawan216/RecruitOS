"use client";

import { useState, useTransition } from "react";
import { updateJob, type JobLifecycleStatus } from "@/app/actions/update-job";
import { PlanLimitNotice } from "@/components/recruitos/usage/plan-limit-notice";
import type { PlanLimitReached } from "@/lib/recruitos/plan-limits";

export default function JobControls({ jobId, title, description, status }: { jobId: string; title: string; description: string; status: JobLifecycleStatus }) {
  const [editing, setEditing] = useState(false);
  const [formTitle, setFormTitle] = useState(title);
  const [formDescription, setFormDescription] = useState(description);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<PlanLimitReached | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    setLimit(null);
    startTransition(async () => {
      const result = await updateJob(jobId, { title: formTitle, description: formDescription });
      if (!result.success) setError(result.error ?? "Could not update job.");
      else { setEditing(false); window.location.reload(); }
    });
  }

  function setLifecycle(next: JobLifecycleStatus) {
    setError(null);
    setLimit(null);
    startTransition(async () => {
      const result = await updateJob(jobId, { lifecycleStatus: next });
      if (!result.success) {
        setError(result.error ?? "Could not update job.");
        setLimit(result.limit ?? null);
      }
      else window.location.reload();
    });
  }

  return <div className="mt-5 rounded-xl border border-border p-6 sm:p-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-[11px] tracking-[0.08em] text-ink-dim">JOB MANAGEMENT</p><p className="mt-2 text-sm text-ink-dim">Edit the role or change its lifecycle state.</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={() => setEditing((value) => !value)} className="rounded-lg border border-border px-4 py-2.5 text-xs font-medium text-ink">{editing ? "Cancel" : "Edit job"}</button>{status === "open" && <button type="button" disabled={pending} onClick={() => setLifecycle("closed")} className="rounded-lg border border-border px-4 py-2.5 text-xs font-medium text-ink">Close job</button>}{status === "closed" && <button type="button" disabled={pending} onClick={() => setLifecycle("open")} className="rounded-lg border border-border px-4 py-2.5 text-xs font-medium text-ink">Reopen</button>}{status !== "archived" && <button type="button" disabled={pending} onClick={() => setLifecycle("archived")} className="rounded-lg border border-border px-4 py-2.5 text-xs font-medium text-ink">Archive</button>}</div></div>
    {editing && <div className="mt-6 border-t border-border pt-6"><input value={formTitle} onChange={(event) => setFormTitle(event.target.value)} className="w-full rounded-lg border border-border bg-transparent px-4 py-3 text-sm text-ink outline-none focus:border-accent" /><textarea value={formDescription} onChange={(event) => setFormDescription(event.target.value)} rows={8} className="mt-4 w-full resize-y rounded-lg border border-border bg-transparent px-4 py-3 text-sm leading-[1.6] text-ink outline-none focus:border-accent" /><button type="button" disabled={pending} onClick={save} className="mt-4 rounded-lg bg-accent px-5 py-3 text-sm font-medium text-bg">{pending ? "Saving..." : "Save changes"}</button></div>}
    {limit ? <div className="mt-4"><PlanLimitNotice limit={limit} /></div> : error ? <p role="alert" className="mt-4 text-sm text-red-400">{error}</p> : null}
  </div>;
}
