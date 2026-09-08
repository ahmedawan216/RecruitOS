import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The same region can later widen for real results and inspection. */
export function TaskSurface({ children, width = "focused" }: { children: ReactNode; width?: "focused" | "expanded" }) {
  return <div className={cn("mx-auto w-full min-w-0", width === "expanded" ? "workspace-frame-expanded" : "workspace-frame")}>{children}</div>;
}
