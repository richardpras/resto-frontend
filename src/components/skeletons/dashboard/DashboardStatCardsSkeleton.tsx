import { Skeleton } from "@/components/ui/skeleton";

type Props = { cards?: number; className?: string };

/** Generic CRM / KPI stat row (`sm:grid-cols-2 lg:grid-cols-4`). */
export function DashboardStatCardsSkeleton({ cards = 4, className }: Props) {
  return (
    <div className={`grid sm:grid-cols-2 lg:grid-cols-4 gap-3 ${className ?? ""}`} aria-hidden>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/50 bg-card p-4 min-h-[88px]">
          <Skeleton className="h-3 w-24 mb-3" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}
