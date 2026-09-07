"use client";

import { usePathname } from "next/navigation";
import { siteConfig } from "@/lib/site-config";
import { Logo } from "@/components/ui/logo";

const footerLinks = [
  { label: "Product", href: "/" },
  { label: "Sign in", href: "/sign-in" },
  { label: "Create account", href: "/sign-up" },
];

export function Footer() {
  const pathname = usePathname();
  const year = new Date().getFullYear();

  if (pathname.startsWith("/dashboard")) return null;

  return (
    <footer className="border-t border-border py-[46px]">
      <div className="mx-auto flex max-w-wrap flex-col items-center gap-6 px-5 text-center sm:flex-row sm:flex-wrap sm:justify-between sm:text-left sm:px-8">
        <Logo />

        <nav
          aria-label="Footer"
          className="flex flex-wrap justify-center gap-[26px]"
        >
          {footerLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[13px] text-ink-dim transition-colors duration-200 ease-out-expo hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <p className="text-xs text-ink-dim">© {year} {siteConfig.name}</p>
      </div>
    </footer>
  );
}
