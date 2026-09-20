"use client";

import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";

const footerLinks = [
  { label: "Resume analysis", href: "/resume-analysis" },
  { label: "Candidate comparison", href: "/compare-candidates" },
  { label: "Evaluation template", href: "/guides/candidate-evaluation-template" },
  { label: "About OperationOS", href: "https://operationos.org/about" },
  { label: "Analytics privacy", href: "/analytics-privacy" },
  { label: "Product", href: "/#product" },
  { label: "Human control", href: "/#human-control" },
  { label: "Sign in", href: "/sign-in" },
];

export function Footer() {
  const pathname = usePathname();
  const year = new Date().getFullYear();

  if (pathname.startsWith("/dashboard") || pathname === "/sign-in" || pathname === "/sign-up") return null;

  return (
    <footer className="border-t border-border bg-surface py-10">
      <div className="mx-auto flex max-w-wrap flex-col gap-6 px-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div><Logo /><p className="mt-2 max-w-md text-xs leading-5 text-ink-dim">Operational recruiting software with explicit human control over consequential actions.</p></div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3">{footerLinks.map((link) => <a key={link.label} href={link.href} className="text-[13px] font-medium text-ink-dim transition-colors duration-[180ms] hover:text-ink">{link.label}</a>)}</nav>
        <p className="text-xs text-ink-faint">© {year} RecruitOS</p>
      </div>
    </footer>
  );
}
