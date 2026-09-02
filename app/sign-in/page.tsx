import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") && !params.next.startsWith("//")
    ? params.next
    : "/dashboard";

  return (
    <main className="min-h-screen bg-bg px-5 pb-20 pt-28 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-md items-center">
        <section className="w-full rounded-2xl border border-border p-6 sm:p-8">
          <Link href="/" className="font-mono text-[11px] tracking-[0.08em] text-accent">
            RECRUITOS
          </Link>
          <h1 className="mt-6 font-display text-3xl font-semibold text-ink">
            Welcome back.
          </h1>
          <p className="mt-3 mb-8 text-sm leading-[1.7] text-ink-dim">
            Sign in to continue to your RecruitOS workspace.
          </p>
          {params.error === "config" && (
            <div className="mb-5 rounded-lg border border-red-400/30 px-4 py-3 text-sm text-red-300">
              Authentication is not configured correctly. Please contact the site administrator.
            </div>
          )}
          <AuthForm mode="sign-in" next={next} />
        </section>
      </div>
    </main>
  );
}
