import { Skeleton } from "@/components/ui/skeleton";

type Props = { items?: number };

/** Matches POS menu grid (`grid-cols-2 md:grid-cols-3 xl:grid-cols-4`, min card height). */
export function PosMenuGridSkeleton({ items = 8 }: Props) {
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 min-h-[12rem]"
      aria-hidden
    >
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="relative bg-card rounded-2xl p-4 border border-border/50 text-left min-h-[118px] flex flex-col gap-2"
        >
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-4 w-[85%]" />
          <Skeleton className="h-4 w-20 mt-auto" />
        </div>
      ))}
    </div>
  );
}
