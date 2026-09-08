import { Skeleton } from "@/components/ui/workspace";
import { TaskSurface } from "@/components/recruitos/workspace/task-surface";

export default function DashboardLoading() {
  return (
    <main className="bg-bg px-4 pb-14 pt-24 sm:px-6 lg:pb-16 lg:pl-12 lg:pr-10 lg:pt-10 xl:pl-14 xl:pr-12" aria-label="Loading workspace" aria-busy="true">
      <TaskSurface>
        <Skeleton className="mb-8 h-11 w-full" />
        <Skeleton className="h-10 w-full max-w-xl" />
        <Skeleton className="mt-3 h-5 w-full max-w-2xl" />
        <div className="command-surface mt-7 p-6"><Skeleton className="h-5 w-48" /><Skeleton className="mt-5 h-20 w-full" /><Skeleton className="mt-5 h-11 w-full" /></div>
        <Skeleton className="mt-6 h-5 w-2/3" />
        <Skeleton className="mt-4 h-5 w-1/2" />
        <div className="mt-9 border-t border-border pt-6"><Skeleton className="h-6 w-36" /><Skeleton className="mt-4 h-12 w-full" /></div>
      </TaskSurface>
      <span className="sr-only">Loading your recruiting workspace…</span>
    </main>
  );
}
