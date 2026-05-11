import { Skeleton } from "@/components/ui/skeleton";

type Props = { columns?: number };

/** Matches Kitchen board (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`). */
export function KitchenTicketBoardSkeleton({ columns = 8 }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[240px]" aria-hidden>
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="bg-card rounded-2xl border border-border/50 overflow-hidden min-h-[200px] flex flex-col">
          <div className="px-4 py-3 border-b bg-muted/30 flex justify-between gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="p-4 space-y-2 flex-1">
            <Skeleton className="h-3 w-[70%]" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-8 w-full rounded-xl mt-4" />
          </div>
        </div>
      ))}
    </div>
  );
}
