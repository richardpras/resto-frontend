import { Skeleton } from "@/components/ui/skeleton";

export function ReceiptPreviewBodySkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-28 rounded-full" />
      </div>
      <Skeleton className="h-40 w-full rounded-md" />
    </div>
  );
}
