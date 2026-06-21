import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApiAccessToken } from "@/lib/api-integration/client";
import { listFloorTables } from "@/lib/api-integration/tableEndpoints";
import { deriveRuntimeFloorTables, type Order } from "@/stores/orderStore";

type UsePosLazyFloorTablesOptions = {
  activeOutletId: number | null | undefined;
  orders: Order[];
  replaceFloorTables: (tables: ReturnType<typeof deriveRuntimeFloorTables>) => void;
  orderType: string;
};

export function usePosLazyFloorTables({
  activeOutletId,
  orders,
  replaceFloorTables,
  orderType,
}: UsePosLazyFloorTablesOptions) {
  const [tablesRequested, setTablesRequested] = useState(false);

  const requestTables = useCallback(() => {
    setTablesRequested(true);
  }, []);

  useEffect(() => {
    if (orderType === "Dine-in") return;
    setTablesRequested(false);
  }, [orderType, activeOutletId]);

  const enabled =
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
    if (typeof activeOutletId !== "number" || activeOutletId < 1 || !getApiAccessToken()) {
      replaceFloorTables([]);
      return;
    }
    if (!floorMasters) return;
    replaceFloorTables(deriveRuntimeFloorTables(floorMasters, orders));
  }, [floorMasters, orders, activeOutletId, replaceFloorTables]);

  return {
    tablesRequested,
    requestTables,
    tablesLoading: enabled && tablesLoading,
  };
}
