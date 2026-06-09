import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  dateRangeLastDays,
} from "@/lib/menu-dashboard/aggregations";
import {
  getBundleOpportunities,
  getCriticalAlerts,
  getDemandForecast,
  getEngineeringMatrix,
  getExecutiveAnalytics,
  getFoodCostTrend,
  getIngredientOpportunities,
  getInventoryAnalytics,
  getMarginTrend,
  getMenuDashboardSnapshots,
  getMenuDashboardSummary,
  getOpenAlerts,
  getPriceOpportunities,
  getProductionForecast,
  getResolvedAlerts,
  getRevenueForecast,
  getStockRiskForecast,
  getYieldOpportunities,
  safeApi,
} from "@/lib/api-integration/menuDashboardEndpoints";

const RANGE = dateRangeLastDays(30);

export function useMenuIntelligenceDashboard(outletId: number | null) {
  const enabled = typeof outletId === "number" && outletId >= 1;
  const oid = outletId ?? 0;

  const summary = useQuery({
    queryKey: ["menu-dashboard-summary", oid],
    queryFn: () => getMenuDashboardSummary(oid),
    enabled,
    staleTime: 60_000,
  });

  const matrix = useQuery({
    queryKey: ["menu-engineering-matrix", oid, RANGE.fromDate, RANGE.toDate],
    queryFn: () => getEngineeringMatrix(oid, RANGE.fromDate, RANGE.toDate),
    enabled,
    staleTime: 60_000,
  });

  const snapshots = useQuery({
    queryKey: ["menu-dashboard-snapshots", oid],
    queryFn: () => getMenuDashboardSnapshots(oid),
    enabled,
    staleTime: 120_000,
  });

  const executive = useQuery({
    queryKey: ["menu-analytics-executive", oid, RANGE.fromDate, RANGE.toDate],
    queryFn: () => safeApi(() => getExecutiveAnalytics(oid, RANGE.fromDate, RANGE.toDate)),
    enabled,
  });

  const foodCostTrend = useQuery({
    queryKey: ["menu-food-cost-trend", oid, RANGE.fromDate, RANGE.toDate],
    queryFn: () => safeApi(() => getFoodCostTrend(oid, RANGE.fromDate, RANGE.toDate)),
    enabled,
  });

  const marginTrend = useQuery({
    queryKey: ["menu-margin-trend", oid, RANGE.fromDate, RANGE.toDate],
    queryFn: () => safeApi(() => getMarginTrend(oid, RANGE.fromDate, RANGE.toDate)),
    enabled,
  });

  const inventory = useQuery({
    queryKey: ["menu-inventory-analytics", oid],
    queryFn: () => safeApi(() => getInventoryAnalytics(oid)),
    enabled,
  });

  const priceOpps = useQuery({
    queryKey: ["menu-price-opportunities", oid],
    queryFn: () => safeApi(() => getPriceOpportunities(oid)),
    enabled,
  });

  const bundleOpps = useQuery({
    queryKey: ["menu-bundle-opportunities", oid],
    queryFn: () => safeApi(() => getBundleOpportunities(oid)),
    enabled,
  });

  const ingredientOpps = useQuery({
    queryKey: ["menu-ingredient-opportunities", oid],
    queryFn: () => safeApi(() => getIngredientOpportunities(oid)),
    enabled,
  });

  const yieldOpps = useQuery({
    queryKey: ["menu-yield-opportunities", oid],
    queryFn: () => safeApi(() => getYieldOpportunities(oid)),
    enabled,
  });

  const openAlerts = useQuery({
    queryKey: ["menu-alerts-open", oid],
    queryFn: () => safeApi(() => getOpenAlerts(oid)),
    enabled,
  });

  const criticalAlerts = useQuery({
    queryKey: ["menu-alerts-critical", oid],
    queryFn: () => safeApi(() => getCriticalAlerts(oid)),
    enabled,
  });

  const resolvedAlerts = useQuery({
    queryKey: ["menu-alerts-resolved", oid],
    queryFn: () => safeApi(() => getResolvedAlerts(oid)),
    enabled,
  });

  const demandForecast = useQuery({
    queryKey: ["menu-forecast-demand", oid],
    queryFn: () => safeApi(() => getDemandForecast(oid)),
    enabled,
  });

  const revenueForecast = useQuery({
    queryKey: ["menu-forecast-revenue", oid],
    queryFn: () => safeApi(() => getRevenueForecast(oid)),
    enabled,
  });

  const productionForecast = useQuery({
    queryKey: ["menu-forecast-production", oid],
    queryFn: () => safeApi(() => getProductionForecast(oid)),
    enabled,
  });

  const stockRisk = useQuery({
    queryKey: ["menu-forecast-stock-risk", oid],
    queryFn: () => safeApi(() => getStockRiskForecast(oid)),
    enabled,
  });

  const isLoading = summary.isLoading;
  const isRefetching =
    summary.isFetching ||
    matrix.isFetching;

  return {
    summary: summary.data,
    matrix: matrix.data,
    snapshots: snapshots.data ?? [],
    executive: executive.data,
    foodCostTrend: foodCostTrend.data ?? [],
    marginTrend: marginTrend.data ?? [],
    inventory: inventory.data,
    priceOpps: priceOpps.data ?? [],
    bundleOpps: bundleOpps.data ?? [],
    ingredientOpps: ingredientOpps.data ?? [],
    yieldOpps: yieldOpps.data ?? [],
    openAlerts: openAlerts.data ?? [],
    criticalAlerts: criticalAlerts.data ?? [],
    resolvedAlerts: resolvedAlerts.data ?? [],
    demandForecast: demandForecast.data,
    revenueForecast: revenueForecast.data,
    productionForecast: productionForecast.data,
    stockRisk: stockRisk.data,
    isLoading,
    isRefetching,
    refetchAlerts: () => {
      void openAlerts.refetch();
      void criticalAlerts.refetch();
      void resolvedAlerts.refetch();
      void summary.refetch();
    },
  };
}

export function useInvalidateMenuDashboard() {
  const qc = useQueryClient();
  return (outletId: number) => {
    void qc.invalidateQueries({ queryKey: ["menu-dashboard-summary", outletId] });
    void qc.invalidateQueries({ queryKey: ["menu-alerts-open", outletId] });
    void qc.invalidateQueries({ queryKey: ["menu-alerts-critical", outletId] });
    void qc.invalidateQueries({ queryKey: ["menu-alerts-resolved", outletId] });
  };
}
