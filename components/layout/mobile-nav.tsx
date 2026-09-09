"use client";

import { useEffect, useId, useRef, useState } from "react";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

const links = [
  { label: "Product", href: "/#product" },
  { label: "Workflow", href: "/#workflow" },
  { label: "Human control", href: "/#human-control" },
];

export function MobileNav({ isAuthenticated = false }: { isAuthenticated?: boolean; dashboard?: boolean }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  return (
    <div className="lg:hidden">
      <Button ref={toggleRef} type="button" variant="ghost" size="sm" className="relative z-[140] h-11 w-11 border-0 p-0" aria-expanded={open} aria-controls={menuId} aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((value) => !value)}>
        <span className="relative block h-5 w-5" aria-hidden="true">
          <span className={`absolute left-0 top-1/2 block h-[1.5px] w-5 origin-center bg-ink transition-transform duration-[180ms] ${open ? "rotate-45" : "-translate-y-[6px]"}`} />
          <span className={`absolute left-0 top-1/2 block h-[1.5px] w-5 bg-ink transition-opacity duration-[180ms] ${open ? "opacity-0" : "opacity-100"}`} />
          <span className={`absolute left-0 top-1/2 block h-[1.5px] w-5 origin-center bg-ink transition-transform duration-[180ms] ${open ? "-rotate-45" : "translate-y-[6px]"}`} />
        </span>
      </Button>
      {open ? (
        <>
          <button type="button" aria-label="Close navigation" className="fixed inset-0 z-[120] cursor-default bg-[#0f1620]/30" onClick={() => setOpen(false)} />
          <nav id={menuId} aria-label="Mobile navigation" className="fixed inset-x-3 top-[4.5rem] z-[130] rounded-xl border border-border bg-surface p-3 shadow-workspace sm:inset-x-6">
            <div className="space-y-1">
              {links.map((link) => <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="block min-h-11 rounded-lg px-3 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{link.label}</a>)}
            </div>
            <div className="mt-3 border-t border-border pt-3">
              {isAuthenticated ? (
                <div className="grid gap-1"><a href="/dashboard/agents/recruitos" onClick={() => setOpen(false)} className="block min-h-11 rounded-lg px-3 py-3 text-sm font-medium text-accent hover:bg-accent-soft">Open workspace</a><form action={signOut}><button type="submit" className="min-h-11 w-full rounded-lg px-3 py-3 text-left text-sm font-medium text-ink-dim hover:bg-surface-2">Sign out</button></form></div>
              ) : (
                <div className="grid gap-1"><a href="/sign-in" onClick={() => setOpen(false)} className="block min-h-11 rounded-lg px-3 py-3 text-sm font-medium text-ink hover:bg-surface-2">Sign in</a><a href="/sign-up" onClick={() => setOpen(false)} className="block min-h-11 rounded-lg bg-accent px-3 py-3 text-sm font-medium text-white">Create account</a></div>
              )}
            </div>
          </nav>
        </>
      ) : null}
    </div>
  );
}
