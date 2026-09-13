import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, FileSearch, MessageSquareText, ShieldCheck, Users } from "lucide-react";

import { RecruitOSBrand } from "@/components/ui/recruitos-brand";

export const metadata: Metadata = {
  title: "RecruitOS | Operational recruiting workspace",
  description: "Run recruiting work across jobs, candidates, resume analysis, contextual commands, and human-reviewed actions in one RecruitOS workspace.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "RecruitOS | Operational recruiting workspace",
    description: "Use the interface when you want control. Tell RecruitOS what you want when you want speed.",
    url: "/",
    siteName: "RecruitOS",
    type: "website",
    images: [
      {
        url: "/brand/recruitos/recruitos-social-preview-1200x630.png",
        width: 1200,
        height: 630,
        alt: "RecruitOS operational recruiting workspace",
      },
    ],
  },
};

const baseHref = "/dashboard/agents/recruitos";

function DemoCandidate({ name, detail, score }: { name: string; detail: string; score: number }) {
  return (
    <div className="grid gap-3 border-t border-border px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
      <div className="min-w-0"><p className="font-medium text-ink">{name}</p><p className="mt-1 text-xs leading-5 text-ink-dim">{detail}</p></div>
      <div className="flex items-center gap-3"><span className="text-xs text-ink-faint">Stored match</span><span className="text-lg font-semibold tabular-nums text-ink">{score}</span></div>
    </div>
  );
}

export default function RecruitOSLandingPage() {
  return (
    <main className="bg-bg pt-16">
      <section className="px-5 pb-16 pt-20 sm:px-8 sm:pb-20 sm:pt-28 lg:pb-24">
        <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="max-w-[680px]">
            <RecruitOSBrand variant="endorsed-black" className="w-[190px]" priority />
            <h1 className="mt-7 font-display text-[clamp(42px,7vw,76px)] font-semibold leading-[0.98] tracking-[-0.045em] text-ink">Run recruiting work without losing control.</h1>
            <p className="mt-7 max-w-[620px] text-[17px] leading-8 text-ink-dim">RecruitOS gives recruiters a structured workspace for jobs, candidates, and resume analysis, plus natural-language commands when speed matters. Consequential changes stop for human review before anything is applied.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/sign-up" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-semibold text-white transition-colors duration-[180ms] hover:bg-[#0a5555]">Create RecruitOS account <ArrowRight className="size-4" aria-hidden="true" /></Link><Link href={baseHref} className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-ink transition-colors duration-[180ms] hover:border-border-strong hover:bg-surface-2">Open workspace</Link></div>
            <p className="mt-4 text-xs leading-5 text-ink-faint">Use the interface when you want control. Tell RecruitOS what you want when you want speed.</p>
          </div>

          <div className="product-surface overflow-hidden" aria-label="Fictional RecruitOS product example">
            <div className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-3 sm:px-5"><div><p className="text-xs font-semibold text-ink">Example workspace</p><p className="mt-0.5 text-[11px] text-ink-faint">Fictional candidates for product demonstration</p></div><span className="rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-semibold text-accent">Workspace</span></div>
            <div className="p-4 sm:p-5"><p className="text-xs font-medium text-ink-dim">Tell RecruitOS what you want</p><div className="mt-2 rounded-xl border border-border bg-bg p-4 text-sm leading-6 text-ink">Show me the strongest 3 candidates for Product Designer.</div><div className="mt-4 flex flex-wrap gap-2 text-[11px] text-ink-dim"><span className="rounded-full border border-border bg-surface px-2.5 py-1.5">Job scope verified</span><span className="rounded-full border border-border bg-surface px-2.5 py-1.5">Candidate evidence reviewed</span><span className="rounded-full border border-border bg-surface px-2.5 py-1.5">Structured result ready</span></div></div>
            <div className="border-t border-border bg-surface"><div className="px-4 py-3 sm:px-5"><p className="text-xs font-semibold text-ink">Strongest candidates</p><p className="mt-1 text-[11px] text-ink-dim">A ranked recruiting result, not a hiring probability.</p></div><DemoCandidate name="Maya Chen" detail="Strong portfolio evidence and relevant product systems work" score={88} /><DemoCandidate name="Jordan Lee" detail="Relevant interaction design experience with a smaller research sample" score={82} /><DemoCandidate name="Sam Rivera" detail="Strong visual craft with a few role-specific evidence gaps" score={78} /></div>
          </div>
        </div>
      </section>

      <section id="product" className="border-y border-border bg-surface px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-[1120px]"><div className="max-w-[700px]"><p className="product-kicker">One recruiting workspace</p><h2 className="mt-4 font-display text-[clamp(30px,4vw,48px)] font-semibold leading-tight tracking-[-0.035em] text-ink">Direct control when you need it. Commands when they save time.</h2><p className="mt-5 text-[15px] leading-7 text-ink-dim">RecruitOS does not replace the normal recruiting interface. It connects the interface and the command workspace to the same real jobs, candidates, analyses, and review states.</p></div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[{ icon: Users, title: "Jobs and candidates", copy: "Create roles, inspect candidate records, review pipeline status, and move through recruiting work with normal controls." }, { icon: FileSearch, title: "Resume analysis", copy: "Upload a resume for a selected job and inspect structured strengths, gaps, concerns, evidence, and stored match information." }, { icon: MessageSquareText, title: "Contextual commands", copy: "Ask RecruitOS to shortlist, compare, focus on skills, surface concerns, or prepare a supported status change from the active task." }].map(({ icon: Icon, title, copy }) => <article key={title} className="product-surface p-6"><Icon className="size-5 text-accent" strokeWidth={1.8} aria-hidden="true" /><h3 className="mt-5 font-display text-xl font-semibold text-ink">{title}</h3><p className="mt-3 text-sm leading-6 text-ink-dim">{copy}</p></article>)}
          </div>
        </div>
      </section>

      <section id="workflow" className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[1120px]"><div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start"><div className="max-w-[520px]"><p className="product-kicker">The operating loop</p><h2 className="mt-4 font-display text-[clamp(30px,4vw,48px)] font-semibold leading-tight tracking-[-0.035em] text-ink">A command becomes visible recruiting work.</h2><p className="mt-5 text-[15px] leading-7 text-ink-dim">RecruitOS keeps the work structured as the task changes. You can inspect the result, refine it in context, and return to the normal interface at any point.</p></div><ol className="product-surface divide-y divide-border">{["Command: state the recruiting task in plain language.", "Real work: RecruitOS uses the active job and candidate scope.", "Structured result: inspect ranked candidates, evidence, concerns, or comparisons.", "Contextual follow-up: refine the current result without starting over.", "Proposal: supported consequential changes are prepared, not silently applied.", "Human review: you approve or cancel the exact proposed changes.", "Approved action: RecruitOS applies only what you approved and records the result."].map((step, index) => <li key={step} className="flex gap-4 px-5 py-4 sm:px-6"><span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-bg text-xs font-semibold text-ink-dim">{index + 1}</span><p className="text-sm leading-6 text-ink">{step}</p></li>)}</ol></div></div>
      </section>

      <section id="human-control" className="border-y border-border bg-[#fbf8f1] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-[1120px] gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"><div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-warning">Human decision boundary</p><h2 className="mt-4 font-display text-[clamp(30px,4vw,48px)] font-semibold leading-tight tracking-[-0.035em] text-ink">RecruitOS can prepare a change. You decide whether it happens.</h2><p className="mt-5 text-[15px] leading-7 text-ink-dim">For the supported candidate status workflow, RecruitOS shows the exact candidates and current-to-proposed status before Apply becomes available. Cancel leaves candidate status unchanged.</p></div><div className="rounded-xl border border-[#e5d6b8] bg-surface p-5 sm:p-6"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" /><div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-warning">Proposed changes</p><p className="mt-2 text-lg font-semibold text-ink">Move 2 candidates to Interview</p><p className="mt-1 text-sm leading-6 text-ink-dim">Nothing has been changed yet.</p></div></div><div className="mt-5 space-y-2">{["Maya Chen: Reviewing → Interview", "Jordan Lee: Shortlisted → Interview"].map((item) => <div key={item} className="flex items-center gap-3 rounded-lg border border-border bg-bg px-4 py-3 text-sm text-ink"><Check className="size-4 shrink-0 text-warning" aria-hidden="true" />{item}</div>)}</div><div className="mt-5 flex gap-3"><span className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium text-ink-dim">Cancel</span><span className="inline-flex min-h-11 items-center rounded-lg bg-warning px-4 text-sm font-semibold text-white">Apply 2 changes</span></div></div></div>
      </section>

      <section className="px-5 py-20 sm:px-8 sm:py-24"><div className="mx-auto max-w-[820px] text-center"><p className="product-kicker">RecruitOS</p><h2 className="mt-4 font-display text-[clamp(32px,5vw,54px)] font-semibold leading-tight tracking-[-0.04em] text-ink">Start with the work already in front of you.</h2><p className="mx-auto mt-5 max-w-[620px] text-[15px] leading-7 text-ink-dim">Create a role, add candidates, analyze evidence, or tell RecruitOS what you need from the active recruiting context.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/sign-up" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-accent px-6 text-sm font-semibold text-white transition-colors duration-[180ms] hover:bg-[#0a5555]">Create account</Link><Link href="/sign-in" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border bg-surface px-6 text-sm font-semibold text-ink transition-colors duration-[180ms] hover:bg-surface-2">Sign in</Link></div></div></section>
    </main>
  );
}
