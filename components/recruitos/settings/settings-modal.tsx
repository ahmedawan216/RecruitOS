"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CircleHelp,
  CreditCard,
  Palette,
  Settings2,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";

import { BillingPanel, type BillingPanelData } from "@/components/recruitos/billing/billing-panel";
import { cn } from "@/lib/utils";

export type SettingsSection = "general" | "personalization" | "profile" | "billing" | "help";

export type RecruitOSAccountSettings = Readonly<{
  displayName: string;
  email: string;
  billing: BillingPanelData;
}>;

const SETTINGS_NAVIGATION: Array<{
  key: SettingsSection;
  label: string;
  icon: LucideIcon;
}> = [
  { key: "general", label: "General", icon: Settings2 },
  { key: "personalization", label: "Personalization", icon: Palette },
  { key: "profile", label: "Profile", icon: UserRound },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "help", label: "Help", icon: CircleHelp },
];

function PlaceholderSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="max-w-2xl">
      <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
      <div className="mt-5 rounded-xl border border-border bg-surface p-5 text-sm leading-6 text-ink-dim">
        {children}
      </div>
    </section>
  );
}

export function SettingsModal({
  open,
  initialSection,
  account,
  onClose,
}: {
  open: boolean;
  initialSection: SettingsSection;
  account: RecruitOSAccountSettings;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<SettingsSection>(initialSection);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (open) setSelected(initialSection);
  }, [initialSection, open]);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => !element.hasAttribute("aria-hidden"));

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

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6" data-recruitos-settings-modal>
      <div className="absolute inset-0 bg-[#0f1620]/55 backdrop-blur-[1px]" aria-hidden="true" onMouseDown={() => onCloseRef.current()} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recruitos-settings-title"
        className="relative flex h-[min(760px,calc(100dvh-1.5rem))] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-[#f4f5f6] shadow-2xl sm:h-[min(760px,calc(100dvh-3rem))]"
      >
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-5 sm:px-6">
          <div>
            <p className="text-xs font-medium text-ink-dim">RecruitOS account</p>
            <h1 id="recruitos-settings-title" className="font-display text-lg font-semibold text-ink">Settings</h1>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => onCloseRef.current()}
            className="flex size-10 items-center justify-center rounded-lg text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Close settings"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 md:grid-cols-[220px_minmax(0,1fr)]">
          <nav
            aria-label="Settings navigation"
            className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-surface px-3 py-3 md:block md:overflow-y-auto md:border-b-0 md:border-r md:px-3 md:py-5"
          >
            {SETTINGS_NAVIGATION.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                aria-current={selected === key ? "page" : undefined}
                className={cn(
                  "flex min-h-11 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:mb-1 md:w-full",
                  selected === key ? "bg-accent-soft text-accent" : "text-ink-dim hover:bg-surface-2 hover:text-ink",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>

          <div className="min-h-0 overflow-y-auto p-5 sm:p-7 md:p-8" data-settings-section={selected}>
            {selected === "general" ? (
              <PlaceholderSection title="General">
                RecruitOS does not currently expose configurable general account preferences. New settings will appear here only when they are backed by real product behavior.
              </PlaceholderSection>
            ) : null}

            {selected === "personalization" ? (
              <PlaceholderSection title="Personalization">
                Personalization controls are not available yet. RecruitOS will not show switches or preferences that are not saved and enforced by the product.
              </PlaceholderSection>
            ) : null}

            {selected === "profile" ? (
              <section className="max-w-2xl">
                <h2 className="font-display text-2xl font-semibold text-ink">Profile</h2>
                <div className="mt-5 rounded-xl border border-border bg-surface p-5">
                  <dl className="grid gap-4 text-sm">
                    <div>
                      <dt className="font-medium text-ink">Name</dt>
                      <dd className="mt-1 text-ink-dim">{account.displayName}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-ink">Email</dt>
                      <dd className="mt-1 break-all text-ink-dim">{account.email}</dd>
                    </div>
                  </dl>
                  <p className="mt-5 border-t border-border pt-4 text-sm leading-6 text-ink-dim">
                    Profile editing is not available in RecruitOS yet.
                  </p>
                </div>
              </section>
            ) : null}

            {selected === "billing" ? (
              <section>
                <div className="mb-5">
                  <h2 className="font-display text-2xl font-semibold text-ink">Billing</h2>
                  <p className="mt-2 text-sm leading-6 text-ink-dim">
                    Manage the verified RecruitOS plan connected to your account.
                  </p>
                </div>
                <BillingPanel data={account.billing} />
              </section>
            ) : null}

            {selected === "help" ? (
              <PlaceholderSection title="Help">
                A dedicated RecruitOS help center is not available yet. Product and plan information is available on the OperationOS website.
                <a
                  href="https://operationos.org"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex min-h-11 items-center font-medium text-accent underline-offset-4 hover:underline"
                >
                  Visit OperationOS
                </a>
              </PlaceholderSection>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
