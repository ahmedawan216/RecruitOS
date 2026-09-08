import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ErrorState } from "@/components/ui/workspace";
import { CommandComposer } from "@/components/recruitos/workspace/command-composer";
import { TaskSurface } from "@/components/recruitos/workspace/task-surface";
import { getWorkspaceHeading, type WorkspaceJob } from "@/lib/recruitos/workspace";
import RecruiterSummary from "./recruiter-summary";

const baseHref = "/dashboard/agents/recruitos";
const actionClass = "inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-ink-dim transition-colors duration-[180ms] hover:text-accent";
type RelatedCandidate = { full_name: string | null; email: string | null };
type RelatedJob = { title: string };

function StoredMatchScore({ score }: { score: number | null }) {
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100) return null;
  return <div className="shrink-0 text-center" role="img" aria-label={`Stored match score: ${score} out of 100. Not an employment probability.`}>
    <div className="relative mx-auto size-[72px]">
      <svg viewBox="0 0 72 72" className="size-full -rotate-90" aria-hidden="true"><circle cx="36" cy="36" r="31" fill="none" stroke="var(--color-border)" strokeWidth="4" /><circle cx="36" cy="36" r="31" fill="none" stroke="var(--color-info)" strokeWidth="4" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - score} /></svg>
      <span className="absolute inset-0 flex items-center justify-center text-xl font-semibold tabular-nums text-ink" aria-hidden="true">{score}</span>
    </div>
    <p className="mt-2 text-[13px] leading-[18px] text-ink-dim" aria-hidden="true">Stored match / 100</p>
  </div>;
}

function relation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatActivity(type: string) {
  const labels: Record<string, string> = {
    resume_uploaded: "Resume uploaded", analysis_completed: "Candidate analyzed", analysis_created: "Candidate analyzed",
    status_changed: "Pipeline stage updated", note_added: "Private note added",
  };
  return labels[type] ?? type.replaceAll("_", " ");
}

export default async function RecruitOSPage() {
  const user = await requireAuthenticatedUser();
  const [jobsResult, reviewResult, activityResult] = await Promise.all([
    supabaseAdmin.from("jobs").select("id, title", { count: "exact" }).eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
    supabaseAdmin.from("candidate_job_matches").select("id, candidate_id, job_id, match_score, recruiter_status, candidates ( full_name, email ), jobs ( title )", { count: "exact" }).eq("user_id", user.id).in("recruiter_status", ["new", "reviewing"]).order("updated_at", { ascending: false }).limit(1),
    supabaseAdmin.from("candidate_activity").select("id, candidate_id, job_id, type, created_at, candidates ( full_name, email ), jobs ( title )").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
  ]);
  const jobCount = jobsResult.error ? null : jobsResult.count;
  const reviewCount = reviewResult.error ? null : reviewResult.count;
  const jobs = jobsResult.error ? [] : jobsResult.data ?? [];
  const review = reviewResult.error ? null : reviewResult.data?.[0];
  const candidate = review ? relation(review.candidates as RelatedCandidate | RelatedCandidate[] | null) : null;
  const reviewJob = review ? relation(review.jobs as RelatedJob | RelatedJob[] | null) : null;
  const contextJob: WorkspaceJob | undefined = review && reviewJob ? { id: review.job_id, title: reviewJob.title } : jobs[0];
  const scopeJobs = contextJob && !jobs.some((job) => job.id === contextJob.id) ? [contextJob, ...jobs] : jobs;
  const heading = getWorkspaceHeading({
    reviewCount,
    jobCount,
    activeJobTitle: contextJob?.title,
    hasRecentActivity: !activityResult.error && Boolean(activityResult.data?.length),
  });
  const workload = reviewCount === null
    ? "Review workload is unavailable. Your recruiting tools are still accessible."
    : reviewCount > 0
      ? `${reviewCount} candidate–job ${reviewCount === 1 ? "match needs" : "matches need"} review · marked New or Reviewing`
      : jobCount === null ? "Job context is unavailable. You can still browse your candidates."
        : jobCount === 0 ? "Start with a role, then bring your candidates into focus."
          : `${jobCount} ${jobCount === 1 ? "job" : "jobs"} in your workspace · No matches marked New or Reviewing`;

  return (
    <main className="bg-bg px-4 pb-14 pt-24 sm:px-6 lg:pb-16 lg:pl-12 lg:pr-10 lg:pt-10 xl:pl-14 xl:pr-12">
      <TaskSurface>
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-ink-dim">Workspace</p>
          <a href="#workspace-tools" className={actionClass}>Current work <ArrowRight className="ml-2 size-4" aria-hidden="true" /></a>
        </div>
        <header className="mb-8">
          <h1 className="break-words font-display text-[26px] font-semibold leading-[34px] tracking-[-0.02em] text-ink sm:text-[32px] sm:leading-10">{heading}</h1>
          <p className="mt-3 text-[15px] leading-[22px] text-ink-dim">{workload}</p>
        </header>
        {jobsResult.error || reviewResult.error ? <div className="mb-5"><ErrorState>Some workspace context could not be loaded. <a href={baseHref} className="inline-flex min-h-11 items-center underline">Reload workspace</a></ErrorState></div> : null}
        <CommandComposer jobs={scopeJobs} contextJob={contextJob} />

        <div className="mt-8 grid items-start gap-7 min-[1200px]:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <section id="workspace-tools" aria-labelledby="continue-heading" className="min-w-0 scroll-mt-24">
            <h2 id="continue-heading" className="mb-4 font-display text-xl font-semibold leading-7 text-ink">{review ? "Current work" : "Start with the tools"}</h2>
            <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
              {review ? <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="break-words text-lg font-medium leading-7 text-ink">{candidate?.full_name || candidate?.email || "Unnamed candidate"}</p>
                    <p className="mt-1 break-words text-[15px] leading-[22px] text-ink-dim">{reviewJob?.title || "Job"}</p>
                    <p className="mt-4 inline-flex items-center gap-2 text-[13px] leading-[18px] text-ink-dim"><span className="size-2 shrink-0 rounded-full bg-warning" aria-hidden="true" /><span><span className="font-medium capitalize text-ink">{review.recruiter_status}</span> · Awaiting your review</span></p>
                  </div>
                  <StoredMatchScore score={review.match_score} />
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[13px] leading-[18px] text-ink-dim">Most recently updated review</span>
                  <Link href={`${baseHref}/candidates/${review.candidate_id}?jobId=${review.job_id}`} className="workspace-action">Open review <ArrowRight className="size-4" aria-hidden="true" /></Link>
                </div>
              </div> : contextJob ? <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 break-words text-sm leading-6 text-ink-dim">Pick up your hiring work for {contextJob.title}.</p>
                <Link href={`${baseHref}/jobs/${contextJob.id}`} className="workspace-action self-start">Open job <ArrowRight className="size-4" aria-hidden="true" /></Link>
              </div> : <p className="mt-3 text-sm leading-6 text-ink-dim">{jobCount === 0 ? "Create a job to set out the role, then upload resumes to begin reviewing." : "Open Jobs or Candidates to choose what to work on next."}</p>}
            </div>
            <nav aria-label="Direct recruiting actions" className="-ml-2 mt-3 flex flex-wrap gap-x-3 gap-y-1">
              <Link href={`${baseHref}/jobs/new`} className={actionClass}>Create job</Link>
              <Link href={contextJob ? `${baseHref}/analyze?jobId=${contextJob.id}` : `${baseHref}/analyze`} className={actionClass}>{contextJob ? "Upload a resume" : "Choose a job to upload"}</Link>
              <Link href={`${baseHref}/candidates`} className={actionClass}>Browse candidates</Link>
            </nav>
          </section>

          <aside aria-label="Workspace context" className="min-w-0">
            <h2 className="mb-4 font-display text-xl font-semibold leading-7 text-ink">In your workspace</h2>
            <dl className="mb-3 flex flex-wrap gap-x-8 gap-y-3 py-2">
              <div><dt className="text-[13px] leading-[18px] text-ink-dim">Jobs</dt><dd className="mt-1 text-2xl font-semibold tabular-nums text-ink">{jobCount ?? "Unavailable"}</dd></div>
              <div><dt className="text-[13px] leading-[18px] text-ink-dim">Matches to review</dt><dd className="mt-1 text-2xl font-semibold tabular-nums text-ink">{reviewCount ?? "Unavailable"}</dd></div>
            </dl>
            <details className="group border-b border-border">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-3 text-sm font-medium text-ink-dim [&::-webkit-details-marker]:hidden">Workspace activity <ChevronDown className="size-4 shrink-0 transition-transform duration-[180ms] group-open:rotate-180" aria-hidden="true" /></summary>
              <div className="pb-5">
                {activityResult.error ? <ErrorState>Activity could not be loaded. Reload the workspace to try again.</ErrorState> : activityResult.data?.length ? <ol className="divide-y divide-border">{activityResult.data.map((item) => {
                  const person = relation(item.candidates as RelatedCandidate | RelatedCandidate[] | null);
                  const job = relation(item.jobs as RelatedJob | RelatedJob[] | null);
                  return <li key={item.id} className="flex flex-col gap-1 py-3 text-sm">
                    <div className="min-w-0"><Link href={`${baseHref}/candidates/${item.candidate_id}${item.job_id ? `?jobId=${item.job_id}` : ""}`} className="inline-flex min-h-11 items-center rounded-sm font-medium capitalize text-ink hover:text-accent">{formatActivity(item.type)}</Link><p className="break-words text-[13px] leading-[18px] text-ink-dim">{person?.full_name || person?.email || "Candidate"}{job?.title ? ` · ${job.title}` : ""}</p></div>
                    <time dateTime={item.created_at} className="text-[13px] leading-[18px] text-ink-dim">{new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</time>
                  </li>;
                })}</ol> : <p className="text-sm leading-6 text-ink-dim">No activity yet. Uploads, analyses, notes, and pipeline updates will appear here as you work.</p>}
              </div>
            </details>
            <RecruiterSummary />
          </aside>
        </div>
      </TaskSurface>
    </main>
  );
}
