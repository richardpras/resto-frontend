import { Skeleton } from "@/components/ui/skeleton";

export function PaymentStatusCardSkeleton() {
  return (
    <div className="space-y-3 pt-1" aria-hidden>
      <Skeleton className="h-6 w-[40%]" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-4 w-[90%]" />
        <Skeleton className="h-4 w-[70%]" />
        <Skeleton className="h-4 w-[50%]" />
      </div>
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 flex-1 rounded-lg" />
      </div>
    </div>
  );
}
