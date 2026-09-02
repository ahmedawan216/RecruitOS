"use client";

import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { cn } from "@/lib/utils";
import { useScrolled } from "@/hooks/use-scrolled";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { MobileNav } from "@/components/layout/mobile-nav";

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

export function HeaderClient({
  isAuthenticated,
  email,
  dashboard = false,
}: {
  isAuthenticated: boolean;
  email?: string;
  dashboard?: boolean;
}) {
  const pathname = usePathname();
  const scrolled = useScrolled(20);

  // The root layout renders the public header on every route, while the
  // dashboard layout renders its authenticated header. Do not render the
  // root copy on dashboard routes or the two fixed headers will overlap.
  if (!dashboard && pathname.startsWith("/dashboard")) {
    return null;
  }

  const links = dashboard ? dashboardLinks : publicLinks;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[100] border-b border-transparent transition-[background-color,border-color] duration-400 ease-out",
        scrolled && "border-border bg-bg/[0.88] backdrop-blur-md backdrop-saturate-[140%]"
      )}
    >
      <nav
        aria-label={dashboard ? "Dashboard" : "Primary"}
        className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-3 px-4 sm:px-6 lg:px-8"
      >
        <div className="flex min-w-0 shrink-0 items-center gap-4 sm:gap-5">
          <Logo />
          {dashboard && <span className="hidden h-5 w-px bg-border md:block" aria-hidden="true" />}
          {dashboard && <span className="hidden font-mono text-[10px] tracking-[0.08em] text-accent md:block">WORKSPACE</span>}
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
          {links.map((link) => {
            const active = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(`${link.href}/`));
            return (
              <a
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-2 text-[13px] transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                  active
                    ? "bg-accent/[0.08] text-ink"
                    : "text-ink-dim hover:bg-ink/[0.04] hover:text-ink"
                )}
              >
                {link.label}
              </a>
            );
          })}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          {isAuthenticated && dashboard && email && (
            <span className="hidden max-w-[220px] truncate text-xs text-ink-dim xl:block" title={email}>
              {email}
            </span>
          )}
          {isAuthenticated ? (
            <form action={signOut} className="hidden lg:block">
              <Button type="submit" variant="ghost" size="sm">Sign out</Button>
            </form>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex">
                <a href="/sign-in">Sign in</a>
              </Button>
              <Button asChild size="sm" className="hidden lg:inline-flex">
                <a href="/sign-up">Create account</a>
              </Button>
            </>
          )}
          <MobileNav isAuthenticated={isAuthenticated} dashboard={dashboard} />
        </div>
      </nav>
    </header>
  );
}
