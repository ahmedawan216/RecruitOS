import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Create account", description: "Create a RecruitOS account and start a private recruiting workspace." };

export default function SignUpPage() {
  return <main className="min-h-screen bg-bg px-5 pb-16 pt-24 sm:px-8 sm:pt-28"><div className="mx-auto grid max-w-[980px] gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"><aside className="hidden lg:block"><p className="product-kicker">Start with RecruitOS</p><h1 className="mt-4 max-w-[440px] font-display text-4xl font-semibold leading-tight tracking-[-0.035em] text-ink">One workspace for direct recruiting control and faster command-driven work.</h1><p className="mt-5 max-w-[460px] text-sm leading-7 text-ink-dim">Create your account, add a job, bring in candidates, and use the interface or natural-language commands from the same recruiting context.</p></aside><section className="product-surface mx-auto w-full max-w-[480px] p-6 sm:p-8"><p className="product-kicker">Create account</p><h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">Set up RecruitOS.</h2><p className="mb-7 mt-3 text-sm leading-6 text-ink-dim">Create your private recruiting workspace. Consequential actions remain subject to explicit human review.</p><AuthForm mode="sign-up" /></section></div></main>;
}
