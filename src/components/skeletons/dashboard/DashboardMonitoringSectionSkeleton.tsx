import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  /** When false, only the stat grid + warning strip (parent already shows title / status). */
  showMetaRow?: boolean;
};

/** Matches Dashboard “Operational Monitoring” stat grid (`sm:grid-cols-2 lg:grid-cols-3`). */
export function DashboardMonitoringSectionSkeleton({ showMetaRow = true }: Props) {
  return (
    <div className="space-y-4" aria-hidden>
      {showMetaRow ? (
      <div className="flex flex-wrap justify-between gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-48" />
      </div>
      ) : null}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-3 min-h-[72px] space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-6 w-[80%]" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-full rounded-lg max-w-xl" />
    </div>
  );
}
