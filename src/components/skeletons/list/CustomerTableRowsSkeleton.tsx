import { Skeleton } from "@/components/ui/skeleton";

const ROWS = 6;

/** Matches Customers list 5-column grid header + rows. */
export function CustomerTableRowsSkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      <div className="grid grid-cols-5 gap-2 border-b pb-2">
        {Array.from({ length: 5 }).map((_, j) => (
          <Skeleton key={j} className="h-3 w-[70%]" />
        ))}
      </div>
      {Array.from({ length: ROWS }).map((_, i) => (
        <div key={i} className="grid grid-cols-5 gap-2 rounded-lg px-2 py-2">
          {Array.from({ length: 5 }).map((__, j) => (
            <Skeleton key={j} className="h-4 w-[85%]" />
          ))}
        </div>
      ))}
    </div>
  );
}
