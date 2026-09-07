"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, ChevronDown, FileSearch, Home, LogOut, Menu, Users, X } from "lucide-react";

import { signOut } from "@/app/auth/actions";
import { cn } from "@/lib/utils";

const workspaceHref = "/dashboard/agents/recruitos";
const navigation = [
  { label: "Workspace", href: workspaceHref, icon: Home, exact: true },
  { label: "Jobs", href: `${workspaceHref}/jobs`, icon: BriefcaseBusiness },
  { label: "Candidates", href: `${workspaceHref}/candidates`, icon: Users },
  { label: "Resume analysis", href: `${workspaceHref}/analyze`, icon: FileSearch },
];

function RecruitOSMark() {
  return (
    <Link href={workspaceHref} className="inline-flex items-center gap-2.5 rounded-md text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4" aria-label="RecruitOS workspace home">
      <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-white" aria-hidden="true">R</span>
      <span className="font-display text-[15px] font-semibold tracking-[-0.01em]">RecruitOS</span>
    </Link>
  );
}

function WorkspaceNavigation({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Workspace navigation" className="space-y-1">
      {navigation.map(({ label, href, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn("group flex min-h-11 items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70", active ? "bg-accent-soft text-accent" : "text-ink-dim hover:bg-surface-2 hover:text-ink")}>
            <Icon className="size-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function AccountMenu({ email }: { email: string }) {
  return (
    <details className="group relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-lg px-2.5 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 [&::-webkit-details-marker]:hidden">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface text-xs font-semibold uppercase text-ink" aria-hidden="true">{email.charAt(0)}</span>
        <span className="min-w-0 flex-1"><span className="block text-xs font-medium text-ink">Your account</span><span className="block truncate text-[11px] text-ink-dim">{email}</span></span>
        <ChevronDown className="size-4 text-ink-faint transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 rounded-lg border border-border bg-surface p-1.5 shadow-workspace">
        <form action={signOut}><button type="submit" className="flex min-h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"><LogOut className="size-4" aria-hidden="true" />Sign out</button></form>
      </div>
    </details>
  );
}

export function DashboardShell({ children, email }: { children: ReactNode; email: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
      if (event.key === "Tab") {
        const focusable = mobilePanelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  return (
    <div className="workspace-theme min-h-screen overflow-x-clip bg-bg text-ink">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-border bg-surface lg:flex lg:flex-col">
        <div className="flex h-16 items-center border-b border-border px-5"><RecruitOSMark /></div>
        <div className="flex-1 overflow-y-auto px-3 py-5"><p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Recruiting</p><WorkspaceNavigation pathname={pathname} /></div>
        <div className="border-t border-border p-3"><AccountMenu email={email} /></div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden">
        <RecruitOSMark />
        <button ref={menuButtonRef} type="button" onClick={() => setMobileOpen(true)} className="flex size-11 items-center justify-center rounded-lg text-ink-dim hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Open workspace navigation" aria-expanded={mobileOpen} aria-controls="mobile-workspace-navigation"><Menu className="size-5" aria-hidden="true" /></button>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Workspace navigation">
          <button type="button" className="absolute inset-0 bg-ink/35" onClick={() => setMobileOpen(false)} aria-label="Close workspace navigation" />
          <div ref={mobilePanelRef} id="mobile-workspace-navigation" className="absolute inset-y-0 right-0 flex w-[min(88vw,340px)] flex-col border-l border-border bg-surface shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-4"><span className="text-sm font-semibold text-ink">Navigation</span><button ref={closeButtonRef} type="button" onClick={() => { setMobileOpen(false); menuButtonRef.current?.focus(); }} className="flex size-11 items-center justify-center rounded-lg text-ink-dim hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Close workspace navigation"><X className="size-5" aria-hidden="true" /></button></div>
            <div className="flex-1 overflow-y-auto px-3 py-5"><WorkspaceNavigation pathname={pathname} onNavigate={() => setMobileOpen(false)} /></div>
            <div className="border-t border-border p-3"><AccountMenu email={email} /></div>
          </div>
        </div>
      ) : null}

      <div className="workspace-content min-w-0 lg:pl-60">{children}</div>
    </div>
  );
}
