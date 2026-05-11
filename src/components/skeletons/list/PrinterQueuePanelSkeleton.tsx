import { Skeleton } from "@/components/ui/skeleton";

type Props = { panels?: number };

export function PrinterQueuePanelSkeleton({ panels = 2 }: Props) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: panels }).map((_, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-[75%]" />
          <Skeleton className="h-3 w-[55%]" />
          <Skeleton className="h-8 w-full rounded-md mt-2" />
        </div>
      ))}
    </div>
  );
}
