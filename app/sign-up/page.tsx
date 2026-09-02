import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-bg px-5 pb-20 pt-28 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-md items-center">
        <section className="w-full rounded-2xl border border-border p-6 sm:p-8">
          <Link href="/" className="font-mono text-[11px] tracking-[0.08em] text-accent">
            RECRUITOS
          </Link>
          <h1 className="mt-6 font-display text-3xl font-semibold text-ink">
            Create your account.
          </h1>
          <p className="mt-3 mb-8 text-sm leading-[1.7] text-ink-dim">
            Your private workspace for AI-assisted recruiting.
          </p>
          <AuthForm mode="sign-up" />
        </section>
      </div>
    </main>
  );
}
