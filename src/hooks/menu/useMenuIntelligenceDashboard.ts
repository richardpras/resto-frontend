import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { dateRangeLastDays } from "@/lib/menu-dashboard/aggregations";
import { getMenuIntelligenceBundle } from "@/lib/api-integration/menuDashboardEndpoints";
import { menuQueryKeys } from "@/hooks/menu/menuQueryKeys";

const RANGE = dateRangeLastDays(30);

const emptyDashboardData = {
  summary: undefined,
  matrix: undefined,
  snapshots: [],
  executive: null,
  foodCostTrend: [],
  marginTrend: [],
  inventory: null,
  priceOpps: [],
  bundleOpps: [],
  ingredientOpps: [],
  yieldOpps: [],
  openAlerts: [],
  criticalAlerts: [],
  resolvedAlerts: [],
  demandForecast: null,
  revenueForecast: null,
  productionForecast: null,
  stockRisk: null,
};

export function useMenuIntelligenceDashboard(outletId: number | null) {
  const queryClient = useQueryClient();
  const enabled = typeof outletId === "number" && outletId >= 1;
  const oid = outletId ?? 0;

  const bundle = useQuery({
    queryKey: menuQueryKeys.intelligenceBundle(oid, RANGE.fromDate, RANGE.toDate),
    queryFn: () => getMenuIntelligenceBundle(oid, RANGE.fromDate, RANGE.toDate),
    enabled,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!enabled || bundle.data?.summary === undefined) {
      return;
    }

    queryClient.setQueryData(menuQueryKeys.summary(oid), bundle.data.summary);
    queryClient.setQueryData(menuQueryKeys.snapshots(oid), bundle.data.snapshots);
    if (bundle.data.matrix) {
      queryClient.setQueryData(
        menuQueryKeys.engineeringMatrix(oid, RANGE.fromDate, RANGE.toDate),
        bundle.data.matrix,
      );
    }
  }, [bundle.data, enabled, oid, queryClient]);

  const data = bundle.data ?? emptyDashboardData;

  return {
    ...data,
    isLoading: bundle.isLoading,
    isRefetching: bundle.isFetching,
    refetchAlerts: () => {
      void bundle.refetch();
    },
  };
}

export function useInvalidateMenuDashboard() {
  const qc = useQueryClient();
  return (outletId: number) => {
    void qc.invalidateQueries({ queryKey: menuQueryKeys.summary(outletId) });
    void qc.invalidateQueries({ queryKey: menuQueryKeys.snapshots(outletId) });
    void qc.invalidateQueries({ queryKey: ["menu-alerts-open", outletId] });
    void qc.invalidateQueries({ queryKey: ["menu-alerts-critical", outletId] });
    void qc.invalidateQueries({ queryKey: ["menu-alerts-resolved", outletId] });
    void qc.invalidateQueries({ queryKey: ["menu-intelligence-bundle", outletId] });
  };
}
