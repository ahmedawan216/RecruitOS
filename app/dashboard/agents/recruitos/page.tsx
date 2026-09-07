import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Clock3, CornerDownLeft, Plus, Sparkles, Users } from "lucide-react";

import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { EmptyState, ErrorState, SectionHeading, StatusBadge, Surface } from "@/components/ui/workspace";
import RecruiterSummary from "./recruiter-summary";

const baseHref = "/dashboard/agents/recruitos";

type RelatedCandidate = { full_name: string | null; email: string | null };
type RelatedJob = { title: string };

function relation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatActivity(type: string) {
  const labels: Record<string, string> = {
    resume_uploaded: "Resume uploaded",
    analysis_created: "Candidate analyzed",
    status_changed: "Pipeline stage updated",
    note_added: "Private note added",
  };
  return labels[type] ?? type.replaceAll("_", " ");
}

export default async function RecruitOSPage() {
  const user = await requireAuthenticatedUser();
  const [activeJobsResult, recentJobsResult, candidatesResult, reviewResult, interviewsResult, activityResult] = await Promise.all([
    supabaseAdmin.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).or("lifecycle_status.eq.open,status.eq.open"),
    supabaseAdmin.from("jobs").select("id, title, status, lifecycle_status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
    supabaseAdmin.from("candidates").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabaseAdmin.from("candidate_job_matches").select("id, candidate_id, job_id, match_score, recruiter_status, candidates ( full_name, email ), jobs ( title )", { count: "exact" }).eq("user_id", user.id).in("recruiter_status", ["new", "reviewing"]).order("updated_at", { ascending: false }).limit(5),
    supabaseAdmin.from("candidate_job_matches").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("recruiter_status", "interview"),
    supabaseAdmin.from("candidate_activity").select("id, candidate_id, job_id, type, created_at, candidates ( full_name, email ), jobs ( title )").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
  ]);

  const hasQueryError = [activeJobsResult, recentJobsResult, candidatesResult, reviewResult, interviewsResult, activityResult].some((result) => result.error);
  const recentJobs = recentJobsResult.data ?? [];
  const reviewItems = reviewResult.data ?? [];
  const activity = activityResult.data ?? [];
  const activeJobCount = activeJobsResult.count ?? 0;
  const candidateCount = candidatesResult.count ?? 0;
  const reviewCount = reviewResult.count ?? 0;
  const interviewCount = interviewsResult.count ?? 0;

  return (
    <main className="min-h-screen bg-bg px-4 pb-16 pt-24 sm:px-6 sm:pt-24 lg:px-8 lg:pt-10">
      <div className="mx-auto max-w-[1180px]">
        <header className="mb-7 sm:mb-8">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">Recruiting workspace</p>
          <h1 className="max-w-3xl font-display text-[clamp(30px,4vw,46px)] font-semibold leading-[1.12] tracking-[-0.035em] text-ink">What are we hiring for today?</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-6 text-ink-dim">Start with a job, review the people who need attention, or move directly into your candidate workspace.</p>
        </header>

        <Surface className="overflow-hidden border-border-strong shadow-workspace">
          <div className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-medium text-ink-dim"><Sparkles className="size-4 text-accent" aria-hidden="true" />RecruitOS commands</div>
              <StatusBadge>Foundation preview</StatusBadge>
            </div>
            <label htmlFor="recruitos-command" className="sr-only">Tell RecruitOS what you need</label>
            <textarea id="recruitos-command" rows={2} disabled aria-describedby="command-availability" placeholder="Tell RecruitOS what you need…" className="workspace-control min-h-[84px] resize-none border-0 bg-bg px-4 py-3.5 text-base shadow-none" />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p id="command-availability" className="text-xs leading-5 text-ink-dim">Command execution arrives in a later phase. Your existing tools remain available below.</p>
              <button type="button" disabled className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-3.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-45">Run command <CornerDownLeft className="size-3.5" aria-hidden="true" /></button>
            </div>
          </div>
        </Surface>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Active jobs", value: activeJobCount, icon: BriefcaseBusiness },
            { label: "Candidates", value: candidateCount, icon: Users },
            { label: "Needs review", value: reviewCount, icon: Clock3 },
            { label: "Interviews", value: interviewCount, icon: Sparkles },
          ].map(({ label, value, icon: Icon }) => <Surface key={label} className="flex items-center gap-4 p-4"><span className="flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent"><Icon className="size-[18px]" aria-hidden="true" /></span><div><p className="text-2xl font-semibold tracking-[-0.03em] text-ink">{value}</p><p className="text-xs text-ink-dim">{label}</p></div></Surface>)}
        </div>

        {hasQueryError ? <div className="mt-4"><ErrorState>Some workspace data could not be loaded. Refresh the page to try again.</ErrorState></div> : null}

        <section className="mt-8" aria-labelledby="next-actions-heading">
          <SectionHeading id="next-actions-heading" eyebrow="Start here" title="Next actions" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link href={`${baseHref}/jobs/new`} className="group flex min-h-[94px] items-center gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-workspace focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-white"><Plus className="size-[18px]" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">Create a job</span><span className="mt-1 block text-xs leading-5 text-ink-dim">Add a role and begin its hiring pipeline.</span></span><ArrowRight className="size-4 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></Link>
            <Link href={`${baseHref}/candidates`} className="group flex min-h-[94px] items-center gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-workspace focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent"><Users className="size-[18px]" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">Review candidates</span><span className="mt-1 block text-xs leading-5 text-ink-dim">Search, filter, and manage your candidate pool.</span></span><ArrowRight className="size-4 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></Link>
          </div>
        </section>

        <div className="mt-8 grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
          <Surface className="p-5 sm:p-6">
            <SectionHeading eyebrow="Priority queue" title="Candidates needing review" action={<Link href={`${baseHref}/candidates?status=reviewing`} className="rounded-md text-xs font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">View candidates</Link>} />
            <div className="mt-5">
              {reviewItems.length ? <div className="divide-y divide-border">{reviewItems.map((item) => {
                const candidate = relation(item.candidates as RelatedCandidate | RelatedCandidate[] | null);
                const job = relation(item.jobs as RelatedJob | RelatedJob[] | null);
                return <Link key={item.id} href={`${baseHref}/candidates/${item.candidate_id}?jobId=${item.job_id}`} className="group flex min-h-[66px] items-center gap-3 py-3 first:pt-0 last:pb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-ink">{(candidate?.full_name || candidate?.email || "C").charAt(0).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink group-hover:text-accent">{candidate?.full_name || candidate?.email || "Unnamed candidate"}</span><span className="mt-0.5 block truncate text-xs text-ink-dim">{job?.title || "Job"}</span></span><span className="hidden text-right sm:block"><StatusBadge tone={item.recruiter_status === "new" ? "info" : "warning"}>{item.recruiter_status}</StatusBadge>{item.match_score !== null ? <span className="mt-1.5 block text-[11px] text-ink-dim">{item.match_score}% match</span> : null}</span><ArrowRight className="size-4 shrink-0 text-ink-faint" aria-hidden="true" /></Link>;
              })}</div> : <EmptyState title="Review queue is clear" description={candidateCount ? "No candidates are currently marked new or reviewing." : "Create a job and upload a resume to add your first candidate."} action={!candidateCount ? <Link href={`${baseHref}/jobs/new`} className="text-xs font-medium text-accent hover:underline">Create a job</Link> : undefined} />}
            </div>
          </Surface>

          <Surface className="p-5 sm:p-6">
            <SectionHeading eyebrow="Hiring work" title="Recent jobs" action={<Link href={`${baseHref}/jobs`} className="rounded-md text-xs font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">View all</Link>} />
            <div className="mt-5">
              {recentJobs.length ? <div className="divide-y divide-border">{recentJobs.map((job) => {
                const lifecycle = job.lifecycle_status ?? job.status;
                return <Link key={job.id} href={`${baseHref}/jobs/${job.id}`} className="group flex min-h-[62px] items-center gap-3 py-3 first:pt-0 last:pb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink group-hover:text-accent">{job.title}</span><span className="mt-1 block text-xs text-ink-dim">Created {new Date(job.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></span><StatusBadge tone={lifecycle === "open" ? "success" : "neutral"}>{lifecycle}</StatusBadge></Link>;
              })}</div> : <EmptyState title="No jobs yet" description="Create a job to establish the role and requirements candidates will be evaluated against." action={<Link href={`${baseHref}/jobs/new`} className="text-xs font-medium text-accent hover:underline">Create your first job</Link>} />}
            </div>
          </Surface>
        </div>

        <Surface className="mt-4 p-5 sm:p-6">
          <SectionHeading eyebrow="Workspace history" title="Recent activity" />
          <div className="mt-5">
            {activity.length ? <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{activity.map((item) => {
              const candidate = relation(item.candidates as RelatedCandidate | RelatedCandidate[] | null);
              const job = relation(item.jobs as RelatedJob | RelatedJob[] | null);
              return <li key={item.id} className="rounded-lg border border-border bg-bg/50 p-4"><p className="text-sm font-medium capitalize text-ink">{formatActivity(item.type)}</p><p className="mt-1 truncate text-xs text-ink-dim">{candidate?.full_name || candidate?.email || "Candidate"}{job?.title ? ` · ${job.title}` : ""}</p><time dateTime={item.created_at} className="mt-3 block text-[11px] text-ink-faint">{new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</time></li>;
            })}</ol> : <EmptyState title="No activity yet" description="Uploads, analyses, notes, and pipeline updates will appear here as you work." />}
          </div>
        </Surface>

        <RecruiterSummary />
      </div>
    </main>
  );
}
