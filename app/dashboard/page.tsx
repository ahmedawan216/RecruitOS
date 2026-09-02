import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-bg pt-32">
      <div className="mx-auto max-w-[1200px] px-6 pb-24">
        <section className="mb-16">
          <p className="mb-4 font-mono text-[11px] tracking-[0.08em] text-ink-dim">
            RECRUITOS WORKSPACE
          </p>

          <h1 className="font-display text-[clamp(32px,5vw,56px)] font-semibold leading-[1.05] tracking-[-0.025em] text-ink">
            Your recruiting command center.
          </h1>

          <p className="mt-4 max-w-[560px] text-[15px] leading-[1.6] text-ink-dim">
            Analyze resumes, manage candidates, and stay in control of every
            hiring decision.
          </p>
        </section>

        <section>
          <div className="mb-5">
            <p className="font-mono text-[11px] tracking-[0.08em] text-ink-dim">
              YOUR WORKSPACE
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/dashboard/agents/recruitos"
              className="group rounded-xl border border-border bg-bg p-6 transition-all duration-200 hover:border-accent/40 hover:bg-accent/[0.03]"
            >
              <div className="mb-8 flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-ink/[0.04] font-mono text-sm text-accent">
                  001
                </div>

                <span className="rounded-full border border-accent/20 bg-accent/[0.06] px-2.5 py-1 font-mono text-[10px] tracking-[0.05em] text-accent">
                  ACTIVE
                </span>
              </div>

              <h2 className="font-display text-xl font-semibold text-ink">
                RecruitOS
              </h2>

              <p className="mt-2 text-sm leading-[1.6] text-ink-dim">
                AI recruiting employee for resume analysis and candidate
                screening.
              </p>

              <div className="mt-7 flex items-center justify-between border-t border-border pt-4">
                <span className="font-mono text-[10px] tracking-[0.05em] text-ink-dim">
                  RECRUITING
                </span>

                <span className="text-sm text-ink-dim transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink">
                  Open →
                </span>
              </div>
            </Link>

          </div>
        </section>
      </div>
    </main>
  );
}
