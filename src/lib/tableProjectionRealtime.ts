import type { QueryClient } from "@tanstack/react-query";
import { listFloorTables, type FloorTableApi } from "@/lib/api-integration/tableEndpoints";

const TABLE_QUERY_PREFIXES = ["floor-tables", "tables-master", "floor-tables-reservations"] as const;

export function tableQueryKeysForOutlet(outletId: number): string[][] {
  return TABLE_QUERY_PREFIXES.map((prefix) => [prefix, outletId]);
}

export function extractAffectedTableIds(payload: Record<string, unknown>): number[] {
  const ids = new Set<number>();
  const tableRaw = payload.tableId ?? payload.table_id;
  if (typeof tableRaw === "number" && tableRaw > 0) ids.add(tableRaw);

  const allocated = payload.allocatedTableIds ?? payload.allocated_table_ids;
  if (Array.isArray(allocated)) {
    for (const value of allocated) {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) ids.add(parsed);
    }
  }

  return [...ids];
}

export function patchTableRowsInCache(
  previous: FloorTableApi[] | undefined,
  freshRows: FloorTableApi[],
  affectedTableIds: number[],
): FloorTableApi[] | undefined {
  if (affectedTableIds.length === 0) return previous;
  const affected = new Set(affectedTableIds);
  const freshById = new Map(freshRows.map((row) => [row.id, row]));

  if (!previous) {
    return freshRows.filter((row) => affected.has(row.id));
  }

  return previous.map((row) => (affected.has(row.id) && freshById.has(row.id) ? freshById.get(row.id)! : row));
}

export async function refreshAffectedTableProjection(
  queryClient: QueryClient,
  outletId: number,
  affectedTableIds: number[],
): Promise<void> {
  if (affectedTableIds.length === 0 || outletId < 1) return;

  const freshRows = await listFloorTables(outletId);
  for (const key of tableQueryKeysForOutlet(outletId)) {
    queryClient.setQueryData<FloorTableApi[]>(key, (previous) =>
      patchTableRowsInCache(previous, freshRows, affectedTableIds),
    );
  }
}
