import { Skeleton } from "@/components/ui/skeleton";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const CELL_WIDTHS = ["max-w-[180px] w-[88%]", "max-w-[240px] w-[92%]", "max-w-[100px] w-[70%]", "max-w-[220px] w-[80%]", "max-w-[120px] w-[60%]", "max-w-[100px] w-[50%]"] as const;

type Props = {
  columns: number;
  rows?: number;
};

/** Shadcn `<TableBody>` skeleton matching user-management / settings tables. */
export function ShadcnTableSkeletonBody({ columns, rows = 8 }: Props) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={`sk-${i}`} aria-hidden>
          {Array.from({ length: columns }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton className={cn("h-4", CELL_WIDTHS[j % CELL_WIDTHS.length])} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}
