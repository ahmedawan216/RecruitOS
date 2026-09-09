import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Sign in", description: "Sign in to your RecruitOS recruiting workspace." };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/dashboard";
  return <main className="min-h-screen bg-bg px-5 pb-16 pt-24 sm:px-8 sm:pt-28"><div className="mx-auto grid max-w-[980px] gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"><aside className="hidden lg:block"><p className="product-kicker">RecruitOS workspace</p><h1 className="mt-4 max-w-[440px] font-display text-4xl font-semibold leading-tight tracking-[-0.035em] text-ink">Pick up the recruiting work you already started.</h1><p className="mt-5 max-w-[460px] text-sm leading-7 text-ink-dim">Your jobs, candidates, analyses, command tasks, and reviewed actions stay connected to your authenticated workspace.</p></aside><section className="product-surface mx-auto w-full max-w-[480px] p-6 sm:p-8"><p className="product-kicker">Sign in</p><h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">Welcome back.</h2><p className="mb-7 mt-3 text-sm leading-6 text-ink-dim">Continue to your RecruitOS workspace.</p>{params.error === "config" ? <div role="alert" className="mb-5 rounded-lg border border-danger/25 bg-danger/[0.05] px-4 py-3 text-sm leading-6 text-danger">RecruitOS could not start the sign-in flow. Please try again, or contact the site administrator if the issue continues.</div> : null}<AuthForm mode="sign-in" next={next} /></section></div></main>;
}
