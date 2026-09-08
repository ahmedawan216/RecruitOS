import type { ReactNode } from "react";
import { IBM_Plex_Sans, Public_Sans } from "next/font/google";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

// SIL Open Font License fonts, downloaded at build time and served by Next.js.
// Scoped to RecruitOS product UI; public pages keep their existing typography.
const productUI = Public_Sans({ subsets: ["latin"], variable: "--font-product-ui", display: "swap" });
const productDisplay = IBM_Plex_Sans({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-product-display", display: "swap" });

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireAuthenticatedUser();
  return <div className={`${productUI.variable} ${productDisplay.variable}`}><DashboardShell email={user.email ?? "Signed-in recruiter"}>{children}</DashboardShell></div>;
}
