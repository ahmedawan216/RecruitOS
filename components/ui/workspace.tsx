import type { HTMLAttributes, ReactNode } from "react";
import { AlertCircle, Inbox } from "lucide-react";

import { cn } from "@/lib/utils";

export function Surface({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("workspace-surface", className)} {...props} />;
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return <div className="flex items-end justify-between gap-4"><div>{eyebrow ? <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{eyebrow}</p> : null}<h2 className="font-display text-lg font-semibold tracking-[-0.015em] text-ink sm:text-xl">{title}</h2></div>{action}</div>;
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "info" }) {
  const tones = { neutral: "border-border bg-surface-2 text-ink-dim", success: "border-success/20 bg-success/10 text-success", warning: "border-warning/20 bg-warning/10 text-warning", info: "border-info/20 bg-info/10 text-info" };
  return <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium capitalize", tones[tone])}>{children}</span>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="flex flex-col items-start rounded-lg border border-dashed border-border-strong bg-bg/55 p-5 sm:p-6"><span className="mb-4 flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-ink-dim"><Inbox className="size-4" aria-hidden="true" /></span><h3 className="text-sm font-semibold text-ink">{title}</h3><p className="mt-1.5 max-w-md text-sm leading-6 text-ink-dim">{description}</p>{action ? <div className="mt-4">{action}</div> : null}</div>;
}

export function ErrorState({ children }: { children: ReactNode }) {
  return <div role="alert" className="flex gap-3 rounded-lg border border-danger/20 bg-danger/5 p-4 text-sm text-danger"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>{children}</span></div>;
}

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block animate-pulse rounded-md bg-surface-2", className)} />;
}
