import { Skeleton } from "@/components/ui/skeleton";

type Props = { cards?: number };

/** Matches Inventory page card grid (`md:grid-cols-2 lg:grid-cols-3`). */
export function InventoryCardGridSkeleton({ cards = 6 }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" aria-hidden>
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm min-h-[140px] flex flex-col gap-3"
        >
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-[72%]" />
          <div className="flex items-end justify-between mt-auto pt-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
