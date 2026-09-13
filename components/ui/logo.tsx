import Link from "next/link";
import { RecruitOSBrand } from "@/components/ui/recruitos-brand";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showEndorsement?: boolean;
}

export function Logo({ className, showEndorsement = true }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn("inline-flex min-h-11 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent", className)}
      aria-label="RecruitOS home"
    >
      <RecruitOSBrand
        variant={showEndorsement ? "endorsed-black" : "horizontal-black"}
        className={showEndorsement ? "w-[142px] sm:w-[154px]" : "w-[124px]"}
        priority
      />
    </Link>
  );
}
