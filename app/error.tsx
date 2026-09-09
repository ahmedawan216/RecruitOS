"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="min-h-[70vh] bg-bg px-5 py-32 sm:px-8"><section className="product-surface mx-auto max-w-[520px] p-7 text-center sm:p-9"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-danger">Page error</p><h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">RecruitOS could not load this page.</h1><p className="mt-4 text-sm leading-6 text-ink-dim">Your account data has not been changed by this page error. Try loading the page again, or return to the workspace.</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Button type="button" onClick={reset}>Try again</Button><Button asChild variant="ghost"><Link href="/dashboard/agents/recruitos">Open workspace</Link></Button></div></section></main>;
}
