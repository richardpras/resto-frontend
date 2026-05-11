import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type CardGridSkeletonProps = {
  /** Number of placeholder cards */
  count?: number;
  className?: string;
  /** Tailwind grid classes, e.g. `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` */
  gridClassName?: string;
};

/** Rounded card tiles matching inventory / dashboard card rhythm */
export function CardGridSkeleton({
  count = 6,
  className,
  gridClassName = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3",
}: CardGridSkeletonProps) {
  return (
    <div className={cn(gridClassName, className)} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border/50 bg-card p-4 space-y-3 min-h-[132px]"
        >
          <div className="flex justify-between gap-2">
            <Skeleton className="h-4 w-[55%]" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-[40%]" />
        </div>
      ))}
    </div>
  );
}
