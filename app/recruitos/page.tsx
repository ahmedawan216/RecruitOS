import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "RecruitOS — AI Resume Screening for Recruiters",
  description:
    "RecruitOS helps recruiters analyze resumes against job requirements, understand candidate fit, and spend less time on manual screening.",
  alternates: {
    canonical: "/recruitos",
  },
  openGraph: {
    title: "RecruitOS — AI Resume Screening for Recruiters",
    description:
      "Analyze resumes, understand candidate fit, and spend less time on manual screening.",
    url: "/recruitos",
    siteName: "RecruitOS",
    type: "website",
    images: [
      {
        url: "/images/recruitos/RecruitOS_workspace_preview.png",
        width: 1200,
        height: 700,
        alt: "RecruitOS dashboard",
      },
    ],
  },
};

export default function RecruitOSLandingPage() {
  return (
    <div className="min-h-screen bg-[#08090c] text-white">
      {/* Navigation */}
      

      {/* Hero */}
      <section className="px-6 pb-20 pt-24 md:pb-28 md:pt-32">
        <div className="mx-auto max-w-5xl text-center">
          <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.18em] text-[#667cff]">
            AI RESUME SCREENING
          </p>

          <h1 className="mx-auto max-w-4xl font-display text-5xl font-semibold leading-[1.05] tracking-[-0.04em] text-white md:text-7xl">
            Stop spending hours screening resumes.
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-white/55 md:text-xl">
            RecruitOS analyzes candidates against your job requirements,
            explains why they match, and helps your team spend more time on
            the people worth talking to.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/dashboard/agents/recruitos"
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90"
            >
              Try RecruitOS →
            </Link>

            <a
              href="#how-it-works"
              className="rounded-lg border border-white/10 px-6 py-3 text-sm font-medium text-white/60 transition-colors hover:border-white/20 hover:text-white"
            >
              See how it works
            </a>
          </div>

          <p className="mt-5 text-xs text-white/30">
            AI-assisted screening. Human-controlled hiring decisions.
          </p>
        </div>
      </section>

      {/* Product preview */}
      <section className="px-6 pb-28">
        <div className="mx-auto max-w-6xl">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c0f] shadow-2xl shadow-black/40">
            <Image
              src="/images/recruitos/RecruitOS_workspace_preview.png"
              alt="RecruitOS dashboard showing resume analysis, candidates, and jobs"
              width={1200}
              height={700}
              className="h-auto w-full"
              priority
            />
          </div>

          <p className="mt-4 text-center text-xs text-white/30">
            The RecruitOS workspace for analyzing resumes, managing
            candidates, and organizing hiring roles.
          </p>
        </div>
      </section>

      {/* Problem */}
      <section className="border-y border-white/[0.06] px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.15em] text-[#667cff]">
                THE PROBLEM
              </p>

              <h2 className="font-display text-3xl font-semibold tracking-[-0.025em] md:text-4xl">
                Resume screening shouldn't consume your day.
              </h2>
            </div>

            <div className="space-y-5 text-[15px] leading-7 text-white/55">
              <p>
                A single role can attract dozens or hundreds of applications.
                Reading every resume manually takes time that recruiters
                could spend interviewing candidates, sourcing talent, and
                improving the hiring process.
              </p>

              <p>
                RecruitOS handles the repetitive first pass so your team can
                quickly understand which candidates deserve a closer look.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="px-6 py-24 md:py-32"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.15em] text-[#667cff]">
              HOW IT WORKS
            </p>

            <h2 className="font-display text-3xl font-semibold tracking-[-0.025em] md:text-4xl">
              From resume pile to candidate shortlist.
            </h2>

            <p className="mt-5 text-[15px] leading-7 text-white/50">
              RecruitOS turns the first-pass screening process into a
              structured workflow your recruiting team can actually use.
            </p>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-4">
            {[
              {
                number: "01",
                title: "Add your job",
                description:
                  "Choose the hiring role and requirements you want to evaluate candidates against.",
              },
              {
                number: "02",
                title: "Upload a resume",
                description:
                  "Give RecruitOS the candidate resume you want to analyze.",
              },
              {
                number: "03",
                title: "Understand the match",
                description:
                  "See relevant experience, matching skills, gaps, concerns, and the overall assessment.",
              },
              {
                number: "04",
                title: "Make the decision",
                description:
                  "Use the analysis to focus your attention while keeping the final hiring decision with your team.",
              },
            ].map((step) => (
              <div
                key={step.number}
                className="rounded-xl border border-white/[0.08] bg-white/[0.015] p-6"
              >
                <span className="font-mono text-xs text-[#667cff]">
                  {step.number}
                </span>

                <h3 className="mt-8 font-display text-lg font-semibold">
                  {step.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-white/45">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Candidate analysis */}
      <section className="border-y border-white/[0.06] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-14 md:grid-cols-[0.8fr_1.2fr] md:items-center">
            <div>
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.15em] text-[#667cff]">
                EXPLAINABLE SCREENING
              </p>

              <h2 className="font-display text-3xl font-semibold tracking-[-0.025em] md:text-4xl">
                Don't just get a score. Understand why.
              </h2>

              <p className="mt-5 text-[15px] leading-7 text-white/50">
                A match percentage on its own doesn't tell a recruiter much.
                RecruitOS gives you the information behind the assessment so
                your team can quickly verify the result.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  "Matching skills",
                  "Missing skills",
                  "Relevant experience",
                  "Candidate concerns",
                  "Recruiter recommendation",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 text-sm text-white/65"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#667cff]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c0f]">
              <Image
                src="/images/recruitos/Candidate_analysis_2.png"
                alt="RecruitOS candidate analysis showing match score, skills, experience, and recommendation"
                width={1200}
                height={700}
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.15em] text-[#667cff]">
              BUILT FOR RECRUITERS
            </p>

            <h2 className="font-display text-3xl font-semibold tracking-[-0.025em] md:text-4xl">
              Less screening. More recruiting.
            </h2>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/[0.08] p-7">
              <h3 className="font-display text-lg font-semibold">
                Save time
              </h3>

              <p className="mt-3 text-sm leading-6 text-white/45">
                Start with structured candidate assessments instead of
                manually reading every resume from beginning to end.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.08] p-7">
              <h3 className="font-display text-lg font-semibold">
                Understand candidates
              </h3>

              <p className="mt-3 text-sm leading-6 text-white/45">
                Quickly see which experience and skills match the
                requirements and where the candidate may fall short.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.08] p-7">
              <h3 className="font-display text-lg font-semibold">
                Stay in control
              </h3>

              <p className="mt-3 text-sm leading-6 text-white/45">
                RecruitOS assists with screening. Your recruiters remain
                responsible for deciding who moves forward.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Human in control */}
      <section className="border-y border-white/[0.06] bg-white/[0.015] px-6 py-24">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.15em] text-[#667cff]">
            HUMAN IN THE LOOP
          </p>

          <h2 className="font-display text-3xl font-semibold tracking-[-0.025em] md:text-5xl">
            AI should assist hiring decisions.
            <br />
            Not secretly make them.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-7 text-white/50">
            RecruitOS is designed to make the repetitive part of recruiting
            faster while keeping recruiters responsible for the decisions
            that matter.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section
        id="get-started"
        className="px-6 py-28"
      >
        <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/[0.025] px-6 py-16 text-center md:px-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#667cff]">
            RECRUITOS
          </p>

          <h2 className="mt-5 font-display text-3xl font-semibold tracking-[-0.03em] md:text-5xl">
            Spend less time screening resumes.
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-7 text-white/50">
            Let RecruitOS handle the repetitive first pass so your team can
            focus on qualified candidates and better conversations.
          </p>

          <Link
            href="/dashboard/agents/recruitos"
            className="mt-8 inline-flex rounded-lg bg-white px-7 py-3.5 text-sm font-semibold text-black transition-colors hover:bg-white/90"
          >
            Get early access →
          </Link>
        </div>
      </section>

      {/* Footer */}
      
    </div>
  );
}
