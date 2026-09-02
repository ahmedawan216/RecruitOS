"use client";

import { useEffect, useId, useRef, useState } from "react";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

const publicLinks = [
  { label: "Product", href: "/" },
  { label: "Workspace", href: "/dashboard/agents/recruitos" },
];

const dashboardLinks = [
  { label: "Workspace", href: "/dashboard/agents/recruitos" },
  { label: "Jobs", href: "/dashboard/agents/recruitos/jobs" },
  { label: "Candidates", href: "/dashboard/agents/recruitos/candidates" },
  { label: "Analyze", href: "/dashboard/agents/recruitos/analyze" },
];

export function MobileNav({ isAuthenticated = false, dashboard = false }: { isAuthenticated?: boolean; dashboard?: boolean }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const links = dashboard ? dashboardLinks : publicLinks;

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
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <div className="lg:hidden">
      <Button
        ref={toggleRef}
        type="button"
        variant="ghost"
        size="sm"
        className="relative z-[140] h-10 w-10 border-0 p-0"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="relative block h-5 w-5" aria-hidden="true">
          <span className={`absolute left-0 top-1/2 block h-[1.5px] w-5 origin-center bg-ink transition-transform duration-200 ${open ? "rotate-45" : "-translate-y-[6px]"}`} />
          <span className={`absolute left-0 top-1/2 block h-[1.5px] w-5 bg-ink transition-opacity duration-150 ${open ? "opacity-0" : "opacity-100"}`} />
          <span className={`absolute left-0 top-1/2 block h-[1.5px] w-5 origin-center bg-ink transition-transform duration-200 ${open ? "-rotate-45" : "translate-y-[6px]"}`} />
        </span>
      </Button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-[120] cursor-default bg-black/80 backdrop-blur-md"
            onClick={closeMenu}
          />
          <nav
            id={menuId}
            aria-label={dashboard ? "Dashboard mobile navigation" : "Mobile navigation"}
            className="fixed inset-x-0 top-16 z-[130] max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-border bg-[#08090c] px-4 py-5 shadow-2xl sm:px-6"
          >
            {dashboard && (
              <div className="mb-4 border-b border-border pb-4">
                <p className="font-mono text-[10px] tracking-[0.08em] text-accent">RECRUITOS WORKSPACE</p>
                <p className="mt-1 text-xs text-ink-dim">Recruiting command center</p>
              </div>
            )}

            <div className="space-y-1">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className="block rounded-lg px-3 py-3.5 text-sm font-medium text-ink transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:bg-white/[0.06] focus-visible:text-white focus-visible:outline-none"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {isAuthenticated ? (
              <form action={signOut} className="mt-4 border-t border-border pt-4">
                <button
                  type="submit"
                  onClick={closeMenu}
                  className="block w-full rounded-lg px-3 py-3.5 text-left text-sm font-medium text-ink transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:bg-white/[0.06] focus-visible:outline-none"
                >
                  Sign out
                </button>
              </form>
            ) : (
              <div className="mt-4 border-t border-border pt-4">
                <a href="/sign-in" onClick={closeMenu} className="block rounded-lg px-3 py-3.5 text-sm font-medium text-ink hover:bg-white/[0.06]">Sign in</a>
                <a href="/sign-up" onClick={closeMenu} className="block rounded-lg px-3 py-3.5 text-sm font-medium text-accent hover:bg-accent/[0.08]">Create an account</a>
              </div>
            )}
          </nav>
        </>
      )}
    </div>
  );
}
