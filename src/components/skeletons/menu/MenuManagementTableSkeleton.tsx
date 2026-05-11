import { Skeleton } from "@/components/ui/skeleton";

/** Matches Menu Management table (`w-full`, 6 columns). */
export function MenuManagementTableSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden" aria-hidden>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs border-b bg-muted/30">
            {Array.from({ length: 6 }).map((_, j) => (
              <th key={j} className="p-4">
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, i) => (
            <tr key={i} className="border-b border-border/30">
              {Array.from({ length: 6 }).map((__, j) => (
                <td key={j} className="p-4">
                  <Skeleton className="h-4 w-[80%]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
