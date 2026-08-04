import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApiAccessToken } from "@/lib/api-integration/client";
import { listFloorTables, type FloorTableApi } from "@/lib/api-integration/tableEndpoints";
import { deriveRuntimeFloorTables, type Order } from "@/stores/orderStore";

type UsePosLazyFloorTablesOptions = {
  activeOutletId: number | null | undefined;
  orders: Order[];
  replaceFloorTables: (tables: ReturnType<typeof deriveRuntimeFloorTables>) => void;
  orderType: string;
  /** When true, skip live API and use offlineTables from bootstrap. */
  isOfflineMode?: boolean;
  offlineTables?: unknown[];
};

function asFloorMasters(rows: unknown[]): FloorTableApi[] {
  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    .map((row) => {
      const id = Number(row.id);
      return {
        id: Number.isFinite(id) ? id : 0,
        outletId: Number(row.outletId ?? 0),
        name: String(row.name ?? ""),
        capacity: typeof row.capacity === "number" ? row.capacity : null,
        status: (row.status === "inactive" ? "inactive" : "active") as FloorTableApi["status"],
        tableOperationalStatus: (typeof row.tableOperationalStatus === "string"
          ? row.tableOperationalStatus
          : "available") as FloorTableApi["tableOperationalStatus"],
        tableOperationalSignals:
          row.tableOperationalSignals && typeof row.tableOperationalSignals === "object"
            ? (row.tableOperationalSignals as FloorTableApi["tableOperationalSignals"])
            : undefined,
      };
    })
    .filter((m) => m.id > 0 && m.name);
}

export function usePosLazyFloorTables({
  activeOutletId,
  orders,
  replaceFloorTables,
  orderType,
  isOfflineMode = false,
  offlineTables = [],
}: UsePosLazyFloorTablesOptions) {
  const [tablesRequested, setTablesRequested] = useState(false);

  const requestTables = useCallback(() => {
    setTablesRequested(true);
  }, []);

  useEffect(() => {
    if (orderType === "Dine-in") return;
    setTablesRequested(false);
  }, [orderType, activeOutletId]);

  // Offline: seed floor from bootstrap whenever dine-in / requested
  useEffect(() => {
    if (!isOfflineMode || typeof activeOutletId !== "number" || activeOutletId < 1) return;
    if (!tablesRequested && orderType !== "Dine-in") return;
    const masters = asFloorMasters(offlineTables);
    replaceFloorTables(deriveRuntimeFloorTables(masters, orders));
  }, [isOfflineMode, offlineTables, orders, activeOutletId, replaceFloorTables, tablesRequested, orderType]);

  const enabled =
    !isOfflineMode &&
    tablesRequested &&
    typeof activeOutletId === "number" &&
    activeOutletId >= 1 &&
    Boolean(getApiAccessToken());

  const { data: floorMasters, isFetching: tablesLoading } = useQuery({
    queryKey: ["floor-tables", activeOutletId ?? 0],
    queryFn: () => listFloorTables(activeOutletId!),
    enabled,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (isOfflineMode) return;
    if (typeof activeOutletId !== "number" || activeOutletId < 1 || !getApiAccessToken()) {
      replaceFloorTables([]);
      return;
    }
    if (!floorMasters) return;
    replaceFloorTables(deriveRuntimeFloorTables(floorMasters, orders));
  }, [floorMasters, orders, activeOutletId, replaceFloorTables, isOfflineMode]);

  return {
    tablesRequested,
    requestTables,
    tablesLoading: enabled && tablesLoading,
  };
}
