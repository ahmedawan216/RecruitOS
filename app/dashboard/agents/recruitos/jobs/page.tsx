import Link from "next/link";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import DeleteJobButton from "./delete-job-button";

type Job = { id: string; title: string; description: string; status: string; lifecycle_status: string | null; created_at: string };

const statusClass = (status: string) => status === "open"
  ? "border-accent/25 bg-accent-soft text-accent"
  : status === "closed"
    ? "border-warning/25 bg-warning/[0.07] text-warning"
    : status === "archived"
      ? "border-border bg-surface-2 text-ink-faint"
      : "border-info/20 bg-info/[0.06] text-info";

export default async function RecruitOSJobsPage() {
  const user = await requireAuthenticatedUser();
  const { data: jobs, error } = await supabaseAdmin.from("jobs").select("id, title, description, status, lifecycle_status, created_at").eq("user_id", user.id).order("created_at", { ascending: false });

  return <main className="min-h-screen bg-bg px-4 pb-20 pt-24 sm:px-6 sm:pt-28 lg:px-8"><div className="mx-auto max-w-wrap">
    <Link href="/dashboard/agents/recruitos" className="product-link mb-6 -ml-2">← Workspace</Link>
    <header className="mb-8 flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between"><div className="max-w-[700px]"><p className="product-kicker">Jobs</p><h1 className="mt-4 font-display text-[clamp(34px,5vw,56px)] font-semibold leading-[1.05] tracking-[-0.035em] text-ink">Roles define the recruiting context.</h1><p className="mt-4 text-[15px] leading-7 text-ink-dim">Create roles, review their candidate pipelines, and use a job as the scope for resume analysis and command-driven work.</p></div><Link href="/dashboard/agents/recruitos/jobs/new" className="workspace-action w-full sm:w-auto">Create job</Link></header>
    {error ? <section className="product-surface p-6"><p className="text-sm font-medium text-danger">Jobs could not be loaded.</p><p className="mt-2 text-sm leading-6 text-ink-dim">Refresh this page to try again. Existing jobs and candidate data have not been changed.</p><a href="/dashboard/agents/recruitos/jobs" className="product-link mt-3 -ml-2">Reload jobs</a></section> : !jobs?.length ? <section className="product-surface p-7 sm:p-10"><p className="product-kicker">No jobs yet</p><h2 className="mt-4 font-display text-2xl font-semibold text-ink">Create the role RecruitOS should work against.</h2><p className="mt-3 max-w-[560px] text-sm leading-6 text-ink-dim">Jobs hold the requirements used for candidate analysis and give the command workspace a clear recruiting scope.</p><Link href="/dashboard/agents/recruitos/jobs/new" className="workspace-action mt-6">Create your first job</Link></section> : <section className="overflow-hidden rounded-xl border border-border bg-surface"><div className="hidden grid-cols-[minmax(0,1fr)_110px_145px_210px] gap-5 border-b border-border bg-surface-2/70 px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-dim sm:grid sm:px-6"><span>Job</span><span>Status</span><span>Created</span><span>Actions</span></div><div className="divide-y divide-border">{jobs.map((job: Job) => { const lifecycle = job.lifecycle_status ?? job.status; return <article key={job.id} className="grid gap-5 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_110px_145px_210px] sm:items-center sm:px-6 sm:py-6"><div className="min-w-0"><h2 className="truncate font-display text-lg font-semibold text-ink">{job.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-dim">{job.description}</p></div><div><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold capitalize ${statusClass(lifecycle)}`}>{lifecycle}</span></div><time className="text-sm text-ink-dim" dateTime={job.created_at}>{new Date(job.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</time><div className="flex flex-wrap gap-2"><Link href={`/dashboard/agents/recruitos/jobs/${job.id}`} className="inline-flex min-h-10 items-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent">Open job</Link><DeleteJobButton jobId={job.id} jobTitle={job.title} /></div></article>; })}</div></section>}
  </div></main>;
}
