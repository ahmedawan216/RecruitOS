import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireAuthenticatedUser();
  return <DashboardShell email={user.email ?? "Signed-in recruiter"}>{children}</DashboardShell>;
}
