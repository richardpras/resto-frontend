import { Skeleton } from "@/components/ui/skeleton";

/** Matches Kitchen workflow board (3 columns). */
export function KitchenTicketBoardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[240px]" aria-hidden data-testid="kitchen-board-skeleton">
      {Array.from({ length: 3 }).map((_, columnIndex) => (
        <div key={columnIndex} className="rounded-2xl border border-border/50 bg-muted/10 p-3 space-y-3">
          <Skeleton className="h-5 w-24" />
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden min-h-[180px] p-4 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-8 w-full rounded-xl mt-4" />
          </div>
        </div>
      ))}
    </div>
  );
}
