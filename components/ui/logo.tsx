import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showEndorsement?: boolean;
}

export function Logo({ className, showEndorsement = true }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn("inline-flex min-h-11 items-center gap-2 rounded-md text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent", className)}
      aria-label="RecruitOS home"
    >
      <span className="font-display text-[17px] font-semibold tracking-[-0.02em]">RecruitOS</span>
      {showEndorsement ? <span className="hidden text-[11px] font-medium text-ink-faint sm:inline">by OperationOS</span> : null}
    </Link>
  );
}
