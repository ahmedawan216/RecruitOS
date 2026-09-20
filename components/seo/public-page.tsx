import Link from "next/link";
import { JsonLd } from "./json-ld";
import { publicOrigin } from "@/lib/seo";
export function PublicPage({ title, intro, path, children }: { title: string; intro: string; path: string; children: React.ReactNode }) {
  return <main className="bg-bg px-5 pb-20 pt-32 sm:px-8"><article className="mx-auto max-w-3xl text-ink">
    <nav aria-label="Breadcrumb" className="mb-8 text-sm"><Link href="/" className="text-accent underline">RecruitOS</Link><span> / {title}</span></nav>
    <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
    <p className="mt-6 text-lg leading-8 text-ink-dim">{intro}</p>
    <p className="mt-6"><Link href="/sign-up" className="inline-flex min-h-12 items-center rounded-lg bg-accent px-5 font-semibold text-white">Try RecruitOS free</Link></p>
    <p className="mt-3 text-sm text-ink-dim">Free during early access. No card required.</p>
    <div className="mt-12 space-y-10 [&_h2]:mb-4 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_p]:leading-7 [&_p+p]:mt-4 [&_li]:mb-3 [&_li]:leading-7 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 [&_a]:text-accent [&_a]:underline">{children}</div>
    <aside className="mt-12 rounded-lg border border-border bg-surface p-6"><h2 className="text-xl font-semibold">Put the review into practice</h2><p className="mt-3 leading-7">Create a role, add resumes, and inspect the evidence in RecruitOS. You decide what happens next.</p><Link className="mt-4 inline-flex min-h-11 items-center font-semibold text-accent underline" href="/sign-up">Create your free RecruitOS account</Link></aside>
    <nav aria-label="Related recruiting resources" className="mt-10 flex flex-col gap-4 text-sm text-accent underline">{([["/resume-analysis","Analyze resumes against a role"],["/compare-candidates","Compare candidates using role evidence"],["/guides/candidate-evaluation-template","Use the candidate evaluation worksheet"]] as const).filter(([href])=>href!==path).map(([href,label])=><Link key={href} href={href}>{label}</Link>)}</nav>
  </article><JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "RecruitOS", item: publicOrigin }, { "@type": "ListItem", position: 2, name: title, item: `${publicOrigin}${path}` }] }} /></main>;
}
