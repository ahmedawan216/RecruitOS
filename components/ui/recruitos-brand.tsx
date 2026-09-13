import Image from "next/image";

import { cn } from "@/lib/utils";

const BRAND_ASSETS = {
  "horizontal-black": {
    src: "/brand/recruitos/recruitos-horizontal-black.svg",
    width: 783.19,
    height: 100,
    alt: "RecruitOS",
  },
  "horizontal-white": {
    src: "/brand/recruitos/recruitos-horizontal-white.svg",
    width: 783.19,
    height: 100,
    alt: "RecruitOS",
  },
  "endorsed-black": {
    src: "/brand/recruitos/recruitos-endorsed-black.svg",
    width: 783.19,
    height: 144,
    alt: "RecruitOS by OperationOS",
  },
} as const;

export type RecruitOSBrandVariant = keyof typeof BRAND_ASSETS;

export function RecruitOSBrand({
  variant = "horizontal-black",
  className,
  priority = false,
}: {
  variant?: RecruitOSBrandVariant;
  className?: string;
  priority?: boolean;
}) {
  const asset = BRAND_ASSETS[variant];

  return (
    <Image
      src={asset.src}
      alt={asset.alt}
      width={asset.width}
      height={asset.height}
      className={cn("h-auto max-w-full", className)}
      priority={priority}
    />
  );
}
