import { Skeleton } from "@/components/ui/skeleton";

/** Full-width route transition / lazy-route fallback (sidebar layout assumed outside). */
export function RoutePageSkeleton() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" aria-busy aria-label="Loading page">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 max-w-[50%]" />
        <Skeleton className="h-4 w-96 max-w-[80%]" />
      </div>
      <Skeleton className="h-12 w-full max-w-md rounded-xl" />
      <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[92%]" />
        <Skeleton className="h-4 w-[78%]" />
        <div className="grid sm:grid-cols-2 gap-3 pt-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
