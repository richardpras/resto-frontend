import type { FloorTableApi } from "@/lib/api-integration/tableEndpoints";
import type { Order } from "@/stores/orderStore";

export type TableOperationalStatus = FloorTableApi["tableOperationalStatus"];
export type TableStatusFilter = "all" | TableOperationalStatus;

export const statusColorConfig = {
  available: { color: "bg-success/10 text-success border-success/20", dot: "bg-success" },
  occupied: { color: "bg-info/10 text-info border-info/20", dot: "bg-info" },
  reserved: { color: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20", dot: "bg-violet-500" },
  cleaning: { color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20", dot: "bg-amber-500" },
  disabled: { color: "bg-muted text-muted-foreground border-border/40", dot: "bg-muted-foreground/50" },
} as const;

export type TableStatusStyle = (typeof statusColorConfig)[keyof typeof statusColorConfig] & { label: string };

export function formatTableRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export function qrStatusClass(status?: FloorTableApi["qrStatus"]): string {
  if (status === "ready") return "text-success font-medium";
  if (status === "invalid_url") return "text-destructive font-medium";
  return "text-amber-600 dark:text-amber-400 font-medium";
}

export function linkedOrderForTable(tableIdStr: string, orders: Order[]): Order | null {
  return (
    orders.find(
      (o) => o.tableId === tableIdStr && o.status !== "completed" && o.status !== "cancelled",
    ) ?? null
  );
}

export function getTableTileBorderClass(runtimeKey: TableOperationalStatus): string {
  if (runtimeKey === "disabled") return "border-border/60 opacity-80";
  if (runtimeKey === "available") return "border-success/20";
  if (runtimeKey === "occupied") return "border-info/20";
  if (runtimeKey === "reserved") return "border-violet-500/20";
  if (runtimeKey === "cleaning") return "border-amber-500/20";
  return "border-border/40";
}

export function getTableTileHeaderClass(runtimeKey: TableOperationalStatus): string {
  if (runtimeKey === "disabled") return "bg-muted/30";
  if (runtimeKey === "available") return "bg-success/5";
  if (runtimeKey === "occupied") return "bg-info/5";
  if (runtimeKey === "reserved") return "bg-violet-500/5";
  if (runtimeKey === "cleaning") return "bg-amber-500/5";
  return "bg-muted/40";
}

export type FilterTablesOptions = {
  searchQuery: string;
  statusFilter: TableStatusFilter;
};

export function filterTables(rows: FloorTableApi[], options: FilterTablesOptions): FloorTableApi[] {
  const query = options.searchQuery.trim().toLowerCase();
  return rows.filter((row) => {
    if (options.statusFilter !== "all" && row.tableOperationalStatus !== options.statusFilter) {
      return false;
    }
    if (!query) return true;
    return row.name.toLowerCase().includes(query);
  });
}

export function countTablesByStatus(rows: FloorTableApi[]) {
  let available = 0;
  let occupied = 0;
  let reserved = 0;
  let cleaning = 0;
  let disabled = 0;
  for (const row of rows) {
    const key = row.tableOperationalStatus;
    if (key === "available") available++;
    else if (key === "occupied") occupied++;
    else if (key === "reserved") reserved++;
    else if (key === "cleaning") cleaning++;
    else disabled++;
  }
  return { available, occupied, reserved, cleaning, disabled };
}

export const TABLES_GRID_CLASS =
  "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4";
