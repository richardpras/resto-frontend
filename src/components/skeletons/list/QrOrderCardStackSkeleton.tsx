import { Skeleton } from "@/components/ui/skeleton";

type Props = { cards?: number };

export function QrOrderCardStackSkeleton({ cards = 3 }: Props) {
  return (
    <div className="grid gap-3" aria-hidden>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="bg-card rounded-2xl p-4 border border-border min-h-[120px] space-y-3">
          <div className="flex justify-between gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-20 rounded-lg" />
          </div>
          <Skeleton className="h-3 w-[60%]" />
          <div className="flex flex-wrap gap-1">
            <Skeleton className="h-6 w-16 rounded-lg" />
            <Skeleton className="h-6 w-20 rounded-lg" />
            <Skeleton className="h-6 w-14 rounded-lg" />
          </div>
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-8 flex-1 rounded-xl" />
            <Skeleton className="h-8 flex-1 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
