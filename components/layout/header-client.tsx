"use client";

import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { cn } from "@/lib/utils";
import { useScrolled } from "@/hooks/use-scrolled";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { MobileNav } from "@/components/layout/mobile-nav";

const publicLinks = [
  { label: "Product", href: "/#product" },
  { label: "Workflow", href: "/#workflow" },
  { label: "Human control", href: "/#human-control" },
];

export function HeaderClient({ isAuthenticated }: { isAuthenticated: boolean; email?: string; dashboard?: boolean }) {
  const pathname = usePathname();
  const scrolled = useScrolled(20);

  if (pathname.startsWith("/dashboard")) return null;

  const authRoute = pathname === "/sign-in" || pathname === "/sign-up";

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[100] border-b border-transparent bg-bg/95 transition-[background-color,border-color] duration-[180ms]",
        scrolled && "border-border bg-bg/90 backdrop-blur-md"
      )}
    >
      <nav aria-label="Primary" className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />
        {!authRoute ? (
          <div className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {publicLinks.map((link) => (
              <a key={link.href} href={link.href} className="rounded-lg px-3 py-2 text-[13px] font-medium text-ink-dim transition-colors duration-[180ms] hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                {link.label}
              </a>
            ))}
          </div>
        ) : <div className="flex-1" />}
        <div className="ml-auto flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Button asChild size="sm" className="hidden sm:inline-flex"><a href="/dashboard/agents/recruitos">Open workspace</a></Button>
              <form action={signOut} className="hidden lg:block"><Button type="submit" variant="ghost" size="sm">Sign out</Button></form>
            </>
          ) : authRoute ? (
            <Button asChild variant="ghost" size="sm"><a href={pathname === "/sign-in" ? "/sign-up" : "/sign-in"}>{pathname === "/sign-in" ? "Create account" : "Sign in"}</a></Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex"><a href="/sign-in">Sign in</a></Button>
              <Button asChild size="sm" className="hidden lg:inline-flex"><a href="/sign-up">Create account</a></Button>
            </>
          )}
          {!authRoute ? <MobileNav isAuthenticated={isAuthenticated} /> : null}
        </div>
      </nav>
    </header>
  );
}
