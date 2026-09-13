"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  FileSearch,
  Home,
  Palette,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { signOut } from "@/app/auth/actions";
import type { BillingPanelData } from "@/components/recruitos/billing/billing-panel";
import { SettingsModal, type RecruitOSAccountSettings, type SettingsSection } from "@/components/recruitos/settings/settings-modal";
import { RecruitOSBrand } from "@/components/ui/recruitos-brand";
import { getPlanDefinition } from "@/lib/recruitos/commercial";
import { cn } from "@/lib/utils";

const workspaceHref = "/dashboard/agents/recruitos";
const pricingHref = "https://operationos.org/pricing";
const navigation = [
  { label: "Workspace", href: workspaceHref, icon: Home, exact: true },
  { label: "Jobs", href: `${workspaceHref}/jobs`, icon: BriefcaseBusiness },
  { label: "Candidates", href: `${workspaceHref}/candidates`, icon: Users },
  { label: "Resume analysis", href: `${workspaceHref}/analyze`, icon: FileSearch },
];

function RecruitOSMark() {
  return (
    <Link
      href={workspaceHref}
      className="inline-flex min-h-11 min-w-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      aria-label="RecruitOS workspace home"
    >
      <RecruitOSBrand variant="horizontal-white" className="w-[126px]" priority />
    </Link>
  );
}

function WorkspaceNavigation({ pathname, onNavigate, compact = false }: { pathname: string; onNavigate?: () => void; compact?: boolean }) {
  return (
    <nav aria-label="Workspace navigation" className="space-y-1">
      {navigation.map(({ label, href, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            aria-label={compact ? label : undefined}
            title={compact ? label : undefined}
            className={cn(
              "group flex min-h-11 items-center rounded-lg text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              compact ? "justify-center px-2" : "gap-3 px-3",
              active ? "bg-accent-soft text-accent" : "text-ink-dim hover:bg-surface-2 hover:text-ink",
            )}
          >
            <Icon className="size-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
            <span className={compact ? "sr-only" : undefined}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

const accountItemClass = "flex min-h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] font-medium text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

function AccountMenu({
  displayName,
  email,
  billing,
  compact = false,
  restoreFocus,
  onOpenSettings,
}: {
  displayName: string;
  email: string;
  billing: BillingPanelData;
  compact?: boolean;
  restoreFocus?: () => void;
  onOpenSettings: (section: SettingsSection, restoreFocus: () => void) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const plan = getPlanDefinition(billing.effectivePlan);
  const planLabel = plan?.displayName ?? "Free";
  const planAction = billing.effectivePlan === "free" ? "Upgrade plan" : "View plans";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function openSettings(section: SettingsSection) {
    setOpen(false);
    onOpenSettings(section, restoreFocus ?? (() => triggerRef.current?.focus()));
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        data-recruitos-account-trigger
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex min-h-11 w-full items-center rounded-lg text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          compact ? "justify-center px-2" : "gap-3 px-2.5",
        )}
        aria-label={compact ? `Open account menu for ${displayName}` : undefined}
        title={compact ? "Account" : undefined}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface text-xs font-semibold uppercase text-ink" aria-hidden="true">
          {(displayName || email).charAt(0)}
        </span>
        {compact ? null : (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-ink">{displayName}</span>
              <span className="block truncate text-[12px] text-ink-dim">{planLabel}</span>
            </span>
            <ChevronDown className={cn("size-4 text-ink-faint transition-transform", open && "rotate-180")} aria-hidden="true" />
          </>
        )}
      </button>

      {open ? (
        <div
          role="menu"
          data-recruitos-account-popover
          className={cn(
            "absolute z-[70] w-64 rounded-xl border border-border bg-surface p-1.5 shadow-2xl",
            compact ? "bottom-0 left-[calc(100%+10px)]" : "bottom-[calc(100%+8px)] left-0",
          )}
        >
          <div className="px-2.5 pb-2.5 pt-2">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-2 text-xs font-semibold uppercase text-ink" aria-hidden="true">
                {(displayName || email).charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
                <p className="truncate text-xs text-ink-dim">{email}</p>
                <p className="mt-1 text-xs font-medium text-accent">{planLabel}</p>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-1.5">
            <Link href={pricingHref} target="_blank" rel="noreferrer" role="menuitem" className={accountItemClass} onClick={() => setOpen(false)}>
              <Sparkles className="size-4" aria-hidden="true" />{planAction}<ExternalLink className="ml-auto size-3.5 text-ink-faint" aria-hidden="true" />
            </Link>
            <button type="button" role="menuitem" className={accountItemClass} data-settings-target="personalization" onClick={() => openSettings("personalization")}><Palette className="size-4" aria-hidden="true" />Personalization</button>
            <button type="button" role="menuitem" className={accountItemClass} data-settings-target="profile" onClick={() => openSettings("profile")}><UserRound className="size-4" aria-hidden="true" />Profile</button>
            <button type="button" role="menuitem" className={accountItemClass} data-settings-target="general" onClick={() => openSettings("general")}><Settings2 className="size-4" aria-hidden="true" />Settings</button>
          </div>
          <div className="mt-1 border-t border-border pt-1.5">
            <button type="button" role="menuitem" className={accountItemClass} data-settings-target="help" onClick={() => openSettings("help")}><CircleHelp className="size-4" aria-hidden="true" />Help</button>
            <form action={signOut}><button type="submit" role="menuitem" className={accountItemClass}><LogOut className="size-4" aria-hidden="true" />Log out</button></form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DashboardShell({
  children,
  displayName,
  email,
  billing,
}: {
  children: ReactNode;
  displayName: string;
  email: string;
  billing: BillingPanelData;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopPinnedOpen, setDesktopPinnedOpen] = useState(true);
  const [desktopPreviewOpen, setDesktopPreviewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("general");
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const desktopToggleRef = useRef<HTMLButtonElement>(null);
  const settingsRestoreFocusRef = useRef<(() => void) | null>(null);
  const desktopExpanded = desktopPinnedOpen || desktopPreviewOpen;
  const account: RecruitOSAccountSettings = { displayName, email, billing };

  useEffect(() => {
    setMobileOpen(false);
    setDesktopPreviewOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!desktopPreviewOpen || desktopPinnedOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setDesktopPreviewOpen(false);
      desktopToggleRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [desktopPinnedOpen, desktopPreviewOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    if (desktop.matches) {
      setMobileOpen(false);
      return;
    }

    const bodyStyle = document.body.style;
    const previousOverflowY = bodyStyle.getPropertyValue("overflow-y");
    const previousPriority = bodyStyle.getPropertyPriority("overflow-y");
    bodyStyle.setProperty("overflow-y", "hidden");
    let released = false;

    function releaseScrollLock() {
      if (released) return;
      released = true;
      if (bodyStyle.getPropertyValue("overflow-y") !== "hidden" || bodyStyle.getPropertyPriority("overflow-y") !== "") return;
      if (previousOverflowY) bodyStyle.setProperty("overflow-y", previousOverflowY, previousPriority);
      else bodyStyle.removeProperty("overflow-y");
    }

    function closeForDesktop() {
      if (!desktop.matches && window.innerWidth < 1024) return;
      releaseScrollLock();
      setMobileOpen(false);
    }

    function onDesktopChange(event: MediaQueryListEvent) {
      if (!event.matches) return;
      closeForDesktop();
    }

    desktop.addEventListener("change", onDesktopChange);
    window.addEventListener("resize", closeForDesktop);
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
      if (event.key === "Tab") {
        const focusable = Array.from(mobilePanelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])') ?? []).filter((element) => !element.closest("details:not([open])") || element.tagName === "SUMMARY");
        if (!focusable.length) return;
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
      desktop.removeEventListener("change", onDesktopChange);
      window.removeEventListener("resize", closeForDesktop);
      document.removeEventListener("keydown", onKeyDown);
      releaseScrollLock();
    };
  }, [mobileOpen]);

  function toggleDesktopSidebar() {
    if (desktopPinnedOpen) {
      setDesktopPinnedOpen(false);
      setDesktopPreviewOpen(false);
      return;
    }
    setDesktopPinnedOpen(true);
    setDesktopPreviewOpen(false);
  }

  function openSettings(section: SettingsSection, restoreFocus: () => void) {
    settingsRestoreFocusRef.current = restoreFocus;
    setSettingsSection(section);
    setSettingsOpen(true);
    setMobileOpen(false);
  }

  function closeSettings() {
    setSettingsOpen(false);
    window.setTimeout(() => settingsRestoreFocusRef.current?.(), 0);
  }

  return (
    <div
      className={cn(
        "workspace-theme min-h-dvh bg-bg text-ink lg:grid lg:items-start lg:transition-[grid-template-columns] lg:duration-200",
        desktopPinnedOpen ? "lg:grid-cols-[15rem_minmax(0,1fr)]" : "lg:grid-cols-[4.5rem_minmax(0,1fr)]",
      )}
      data-desktop-sidebar={desktopPinnedOpen ? "open" : "collapsed"}
    >
      <aside
        className="relative z-40 hidden min-w-0 self-stretch lg:block"
        aria-label="Desktop workspace navigation"
        onMouseEnter={() => { if (!desktopPinnedOpen) setDesktopPreviewOpen(true); }}
        onMouseLeave={() => { if (!desktopPinnedOpen) setDesktopPreviewOpen(false); }}
      >
        <div className={cn("workspace-sidebar sticky top-0 flex h-dvh flex-col border-r border-border transition-[width,box-shadow] duration-200", desktopExpanded ? "w-60" : "w-[4.5rem]", desktopPreviewOpen && !desktopPinnedOpen ? "shadow-2xl" : undefined)}>
          <div className={cn("flex h-16 shrink-0 items-center border-b border-border", desktopExpanded ? "justify-between gap-2 px-4" : "justify-center px-2")}>
            {desktopExpanded ? <RecruitOSMark /> : null}
            <button
              ref={desktopToggleRef}
              type="button"
              onClick={toggleDesktopSidebar}
              className="flex size-10 shrink-0 items-center justify-center rounded-lg text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={desktopPinnedOpen ? "Collapse workspace sidebar" : "Pin workspace sidebar open"}
              aria-expanded={desktopExpanded}
              title={desktopPinnedOpen ? "Collapse sidebar" : "Open sidebar"}
            >
              {desktopPinnedOpen ? <PanelLeftClose className="size-[18px]" aria-hidden="true" /> : <PanelLeftOpen className="size-[18px]" aria-hidden="true" />}
            </button>
          </div>
          <div className={cn("flex-1 overflow-y-auto py-6", desktopExpanded ? "px-3" : "px-2")}>
            {desktopExpanded ? <p className="mb-3 px-3 text-[13px] text-ink-faint">Recruiting</p> : null}
            <WorkspaceNavigation pathname={pathname} compact={!desktopExpanded} />
          </div>
          <div className={cn("border-t border-border", desktopExpanded ? "p-3" : "p-2")}>
            <AccountMenu
              displayName={displayName}
              email={email}
              billing={billing}
              compact={!desktopExpanded}
              onOpenSettings={openSettings}
            />
          </div>
        </div>
      </aside>

      <header className="workspace-sidebar fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-border px-4 lg:hidden">
        <RecruitOSMark />
        <button ref={menuButtonRef} type="button" onClick={() => setMobileOpen(true)} className="flex size-11 items-center justify-center rounded-lg text-ink-dim hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Open workspace navigation" aria-expanded={mobileOpen} aria-controls="mobile-workspace-navigation"><Menu className="size-5" aria-hidden="true" /></button>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Workspace navigation">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => { setMobileOpen(false); menuButtonRef.current?.focus(); }} aria-label="Close workspace navigation" />
          <div ref={mobilePanelRef} id="mobile-workspace-navigation" className="workspace-sidebar absolute inset-y-0 right-0 flex w-[min(88vw,340px)] flex-col border-l border-border shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-4"><span className="text-sm font-semibold text-ink">Navigation</span><button ref={closeButtonRef} type="button" onClick={() => { setMobileOpen(false); menuButtonRef.current?.focus(); }} className="flex size-11 items-center justify-center rounded-lg text-ink-dim hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Close workspace navigation"><X className="size-5" aria-hidden="true" /></button></div>
            <div className="flex-1 overflow-y-auto px-3 py-5"><WorkspaceNavigation pathname={pathname} onNavigate={() => setMobileOpen(false)} /></div>
            <div className="border-t border-border p-3">
              <AccountMenu
                displayName={displayName}
                email={email}
                billing={billing}
                restoreFocus={() => menuButtonRef.current?.focus()}
                onOpenSettings={openSettings}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "workspace-content min-w-0 lg:transition-[padding-right] lg:duration-200",
          desktopPinnedOpen ? "lg:pr-[7.5rem]" : "lg:pr-[4.5rem]",
        )}
      >
        {children}
      </div>

      <SettingsModal
        open={settingsOpen}
        initialSection={settingsSection}
        account={account}
        onClose={closeSettings}
      />
    </div>
  );
}
