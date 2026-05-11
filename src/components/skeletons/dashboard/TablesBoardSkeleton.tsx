import { Skeleton } from "@/components/ui/skeleton";

/** Matches Tables page card grid (`grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6`). */
export function TablesBoardSkeleton({ tiles = 12 }: { tiles?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 min-h-[200px]" aria-hidden>
      {Array.from({ length: tiles }).map((_, i) => (
        <div key={i} className="bg-card rounded-2xl border overflow-hidden min-h-[160px] flex flex-col">
          <div className="px-4 py-3 border-b bg-muted/30 flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-6 rounded-md" />
          </div>
          <div className="p-4 space-y-2 flex-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
