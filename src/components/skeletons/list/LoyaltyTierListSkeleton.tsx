import { Skeleton } from "@/components/ui/skeleton";

export function LoyaltyTierListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-1" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  );
}
