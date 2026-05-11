import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const WIDTHS = ["w-[58%]", "w-[72%]", "w-[64%]", "w-[80%]", "w-[48%]", "w-[70%]"] as const;

type Props = {
  columnCount: number;
  rowCount?: number;
};

/** Native `<tbody>` rows for use inside `<table>` (e.g. {@link DataTable}). */
export function SkeletonTableBodyRows({ columnCount, rowCount = 6 }: Props) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, i) => (
        <tr key={`sk-${i}`} className="border-b border-border/50" aria-hidden>
          {Array.from({ length: columnCount }).map((__, j) => (
            <td key={j} className="p-4 align-middle">
              <Skeleton className={cn("h-4 max-w-full", WIDTHS[(i + j) % WIDTHS.length])} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
