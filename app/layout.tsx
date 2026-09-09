import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Public_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { siteConfig } from "@/lib/site-config";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

import "./globals.css";

export const dynamic = "force-dynamic";

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: siteConfig.url ? new URL(siteConfig.url) : undefined,
  title: {
    default: siteConfig.title,
    template: "%s | RecruitOS",
  },
  description: siteConfig.description,
  keywords: [
    "RecruitOS",
    "recruiting workspace",
    "candidate review",
    "resume analysis",
    "recruiting operations",
    "human reviewed recruiting actions",
  ],
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F4F5F6",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${publicSans.variable} ${ibmPlexSans.variable}`}>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-ink focus:shadow-workspace"
        >
          Skip to content
        </a>
        <Header />
        <PostHogProvider>
          <div id="main-content">{children}</div>
        </PostHogProvider>
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
