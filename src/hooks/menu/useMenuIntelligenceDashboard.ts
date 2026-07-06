import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getMenuIntelligenceBundle } from "@/lib/api-integration/menuDashboardEndpoints";
import { menuQueryKeys } from "@/hooks/menu/menuQueryKeys";
import { createReportDateRange } from "@/lib/reporting/dateRangePresets";

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

export function useMenuIntelligenceDashboard(
  outletId: number | null,
  startDate: string = createReportDateRange("30d").startDate,
  endDate: string = createReportDateRange("30d").endDate,
) {
  const queryClient = useQueryClient();
  const enabled = typeof outletId === "number" && outletId >= 1;
  const oid = outletId ?? 0;

  const bundle = useQuery({
    queryKey: menuQueryKeys.intelligenceBundle(oid, startDate, endDate),
    queryFn: () => getMenuIntelligenceBundle(oid, startDate, endDate),
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
        menuQueryKeys.engineeringMatrix(oid, startDate, endDate),
        bundle.data.matrix,
      );
    }
  }, [bundle.data, enabled, oid, queryClient, startDate, endDate]);

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
