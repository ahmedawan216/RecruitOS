import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return <main className="min-h-[70vh] bg-bg px-5 py-32 sm:px-8"><section className="product-surface mx-auto max-w-[520px] p-7 text-center sm:p-9"><p className="product-kicker">404</p><h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">That RecruitOS page is not available.</h1><p className="mt-4 text-sm leading-6 text-ink-dim">The address may be outdated, or the resource may no longer be reachable from this workspace.</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Button asChild><Link href="/dashboard/agents/recruitos">Open workspace</Link></Button><Button asChild variant="ghost"><Link href="/">RecruitOS home</Link></Button></div></section></main>;
}
