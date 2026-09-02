import Link from "next/link";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-3 font-display text-base font-semibold text-ink",
        className
      )}
      aria-label="RecruitOS — home"
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-accent/30 bg-accent/[0.1] font-mono text-xs text-accent"
        aria-hidden="true"
      >
        R
      </span>
      <span>RecruitOS</span>
    </Link>
  );
}
