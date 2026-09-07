import { Skeleton, Surface } from "@/components/ui/workspace";

export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-bg px-4 pb-16 pt-24 sm:px-6 lg:px-8 lg:pt-10" aria-label="Loading workspace" aria-busy="true">
      <div className="mx-auto max-w-[1180px]">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-4 h-10 w-full max-w-xl" />
        <Skeleton className="mt-3 h-5 w-full max-w-2xl" />
        <Surface className="mt-8 p-5"><Skeleton className="h-5 w-40" /><Skeleton className="mt-4 h-20 w-full" /><Skeleton className="mt-3 h-4 w-2/3" /></Surface>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Surface key={index} className="p-4"><Skeleton className="h-12 w-full" /></Surface>)}</div>
      </div>
      <span className="sr-only">Loading your recruiting workspace…</span>
    </main>
  );
}
