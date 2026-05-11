import { Skeleton } from "@/components/ui/skeleton";

type Props = { cards?: number };

/** Matches Printer Settings hardware bridge device cards. */
export function BridgeDeviceListSkeleton({ cards = 2 }: Props) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-5 w-14 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
          <Skeleton className="h-3 w-[90%]" />
        </div>
      ))}
    </div>
  );
}
