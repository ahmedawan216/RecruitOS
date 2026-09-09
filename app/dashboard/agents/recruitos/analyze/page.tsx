import Link from "next/link";
import RecruitOSAnalyzePage from "./AnalyzePage";

type PageProps = { searchParams: Promise<{ jobId?: string | string[] }> };

export default async function Page({ searchParams }: PageProps) {
  const { jobId } = await searchParams;
  const resolvedJobId = Array.isArray(jobId) ? jobId[0] : jobId;
  if (!resolvedJobId) return <main className="min-h-screen bg-bg px-5 pb-20 pt-24 sm:px-8 sm:pt-28"><div className="mx-auto max-w-wrap"><Link href="/dashboard/agents/recruitos/jobs" className="product-link mb-6 -ml-2">← Jobs</Link><section className="product-surface max-w-[720px] p-7"><p className="product-kicker">Resume analysis</p><h1 className="mt-4 font-display text-2xl font-semibold text-ink">Choose a job before adding a resume.</h1><p className="mt-3 max-w-[560px] text-sm leading-6 text-ink-dim">Resume analysis is job-specific. Select a role so RecruitOS can compare the candidate with the correct requirements.</p><Link href="/dashboard/agents/recruitos/jobs" className="workspace-action mt-6">Choose a job</Link></section></div></main>;
  return <RecruitOSAnalyzePage jobId={resolvedJobId} />;
}
