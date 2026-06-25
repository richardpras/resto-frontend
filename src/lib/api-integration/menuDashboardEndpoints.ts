import { apiRequest as request } from "./client";

function outletQuery(outletId: number, extra?: Record<string, string | number>): string {
  const query = new URLSearchParams({ outletId: String(outletId) });
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value !== undefined && value !== "") query.set(key, String(value));
    }
  }
  return `?${query.toString()}`;
}

export type DashboardKpis = {
  revenue: number;
  foodCostPercent: number;
  averageMarginPercent: number;
  forecastRevenue: number;
  forecastMargin: number;
};

export type DashboardHealth = {
  score: number;
  band: string;
  penalties: {
    criticalAlerts: number;
    dogItems: number;
    criticalStockRisks: number;
    foodCostAboveThreshold: boolean;
    marginErosionDetected: boolean;
  };
};

export type DashboardSummary = {
  outletId: number;
  generatedAt: string;
  kpis: DashboardKpis;
  engineering: {
    starCount: number;
    puzzleCount: number;
    plowhorseCount: number;
    dogCount: number;
    benchmarks?: Record<string, number>;
  };
  optimization: {
    priceOpportunities: number;
    ingredientOpportunities: number;
    yieldOpportunities: number;
    bundleOpportunities: number;
    totalOpportunities: number;
  };
  automation: {
    openAlerts: number;
    criticalAlerts: number;
    resolvedToday: number;
  };
  forecasting: {
    demand: { itemCount: number; peakPeriods: unknown[] };
    revenue: Record<string, number>;
    stockRisks: number;
    criticalStockRisks: number;
  };
  inventory: {
    inventoryValue: number;
    deadStockCount: number;
    criticalStockRisks: number;
  };
  health: DashboardHealth;
};

export type EngineeringMatrixItem = {
  menuItemId: string;
  menuItemName: string;
  quantitySold: number;
  popularityPercent: number;
  contributionMargin: number;
  marginPercent: number;
  classification: string;
};

export type EngineeringMatrix = {
  outletId: number;
  fromDate?: string;
  toDate?: string;
  benchmarks: {
    averagePopularityPercent: number;
    averageContributionMargin: number;
  };
  items: EngineeringMatrixItem[];
  summary: Record<string, number>;
  analytics: {
    topStars: EngineeringMatrixItem[];
    highestMargin: EngineeringMatrixItem[];
    highestPopularity: EngineeringMatrixItem[];
  };
};

export type AutomationAlert = {
  id: number;
  outlet_id: number;
  alert_type: string;
  severity: string;
  title: string;
  description: string | null;
  status: string;
  triggered_at: string | null;
  resolved_at: string | null;
};

export type PriceOpportunity = {
  menuItemId: string;
  menuItemName: string;
  classification: string;
  currentPrice: number;
  suggestedPrice: number;
  suggestedDirection: string;
  projectedMonthlyProfitIncrease: number;
  currentMarginPercent: number;
  projectedMarginPercent: number;
};

export type BundleOpportunity = {
  bundleName?: string;
  menuItemIds?: string[];
  projectedRevenue?: number;
  projectedMargin?: number;
  [key: string]: unknown;
};

export type IngredientOpportunity = {
  ingredientId?: string;
  ingredientName?: string;
  menuItemId?: string;
  menuItemName?: string;
  potentialSavings?: number;
  [key: string]: unknown;
};

export type YieldOpportunity = {
  menuItemId?: string;
  menuItemName?: string;
  currentYieldPercent?: number;
  suggestedYieldPercent?: number;
  projectedSavings?: number;
  [key: string]: unknown;
};

export type TrendPoint = { date: string; value: number; label?: string };

export type DashboardSnapshot = {
  id: number;
  snapshot_date: string;
  outlet_id: number;
  total_revenue: number;
  food_cost_percent: number;
  average_margin_percent: number;
  active_alerts: number;
  critical_alerts: number;
  forecast_revenue: number;
  forecast_margin: number;
  inventory_value: number;
  health_score: number;
};

export async function getMenuDashboardSummary(outletId: number): Promise<DashboardSummary> {
  const response = await request<{ data: DashboardSummary }>(`/menu-dashboard/summary${outletQuery(outletId)}`);
  return response.data;
}

export type MenuIntelligenceBundleRaw = {
  summary: DashboardSummary;
  matrix: EngineeringMatrix | null;
  snapshots: DashboardSnapshot[];
  executive: Record<string, unknown> | null;
  foodCostTrend: Array<Record<string, unknown>> | null;
  marginTrend: Array<Record<string, unknown>> | null;
  inventory: Record<string, unknown> | null;
  priceOpportunities: PriceOpportunity[] | null;
  bundleOpportunities: BundleOpportunity[] | null;
  ingredientOpportunities: IngredientOpportunity[] | null;
  yieldOpportunities: YieldOpportunity[] | null;
  openAlerts: AutomationAlert[] | null;
  criticalAlerts: AutomationAlert[] | null;
  resolvedAlerts: AutomationAlert[] | null;
  demandForecast: Record<string, unknown> | null;
  revenueForecast: Record<string, unknown> | null;
  productionForecast: Record<string, unknown> | null;
  stockRisk: Record<string, unknown> | null;
};

export type MenuIntelligenceDashboardData = {
  summary: DashboardSummary | undefined;
  matrix: EngineeringMatrix | undefined;
  snapshots: DashboardSnapshot[];
  executive: Awaited<ReturnType<typeof getExecutiveAnalytics>> | null;
  foodCostTrend: Awaited<ReturnType<typeof getFoodCostTrend>>;
  marginTrend: Awaited<ReturnType<typeof getMarginTrend>>;
  inventory: Awaited<ReturnType<typeof getInventoryAnalytics>> | null;
  priceOpps: PriceOpportunity[];
  bundleOpps: BundleOpportunity[];
  ingredientOpps: IngredientOpportunity[];
  yieldOpps: YieldOpportunity[];
  openAlerts: AutomationAlert[];
  criticalAlerts: AutomationAlert[];
  resolvedAlerts: AutomationAlert[];
  demandForecast: Awaited<ReturnType<typeof getDemandForecast>> | null;
  revenueForecast: Awaited<ReturnType<typeof getRevenueForecast>> | null;
  productionForecast: Awaited<ReturnType<typeof getProductionForecast>> | null;
  stockRisk: Awaited<ReturnType<typeof getStockRiskForecast>> | null;
};

function mapExecutiveAnalytics(data: Record<string, unknown>) {
  return {
    totalRevenue: Number(data.totalRevenue ?? 0),
    averageFoodCostPercent: Number(data.averageFoodCostPercent ?? 0),
    averageMarginPercent: Number(data.averageMarginPercent ?? 0),
    inventoryValue: Number(data.inventoryValue ?? 0),
    salesTrend: (data.salesTrend as Array<{ sale_date: string; total_sales: number; order_count: number }>) ?? [],
  };
}

function mapFoodCostTrendRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => ({
    date: String(row.snapshot_date ?? row.date ?? ""),
    totalCost: Number(row.total_cost ?? row.totalCost ?? 0),
    totalRevenue: Number(row.total_revenue ?? row.totalRevenue ?? 0),
    foodCostPercent: Number(row.foodCostPercent ?? 0),
  }));
}

function mapMarginTrendRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => ({
    date: String(row.date ?? ""),
    marginPercent: Number(row.marginPercent ?? 0),
    totalMargin: Number(row.totalMargin ?? 0),
  }));
}

function mapInventorySummary(data: Record<string, unknown>) {
  const deadStock = (data.deadStock as Array<Record<string, unknown>>) ?? [];
  return {
    inventoryValue: Number(data.inventoryValue ?? 0),
    deadStock: deadStock.map((row) => ({
      ingredientId: String(row.ingredientId ?? ""),
      ingredientName: (row.ingredientName as string | null) ?? null,
      inventoryValue: Number(row.inventoryValue ?? 0),
    })),
  };
}

function mapDemandForecast(data: Record<string, unknown>) {
  return {
    forecastDate: String(data.forecastDate ?? ""),
    items:
      (data.items as Array<{ menuItemId: string; menuItemName?: string; predictedQuantity: number }>) ?? [],
  };
}

function mapRevenueForecast(data: Record<string, unknown>) {
  const totals = (data.totals as Record<string, number>) ?? {};
  return {
    forecastDate: String(data.forecastDate ?? ""),
    totals: {
      predictedRevenue: Number(totals.predictedRevenue ?? 0),
      predictedMargin: Number(totals.predictedMargin ?? 0),
    },
    items:
      (data.items as Array<Record<string, unknown>>)?.map((row) => ({
        menuItemId: String(row.menuItemId ?? ""),
        menuItemName: row.menuItemName as string | undefined,
        predictedRevenue: Number(row.predictedRevenue ?? 0),
        predictedMargin: Number(row.predictedMargin ?? 0),
      })) ?? [],
  };
}

function mapProductionForecast(data: Record<string, unknown>) {
  return {
    items:
      (data.items as Array<{ menuItemId: string; menuItemName?: string; predictedQuantity: number }>) ?? [],
  };
}

function mapStockRisk(data: Record<string, unknown>) {
  return {
    risks:
      (data.risks as Array<Record<string, unknown>>)?.map((row) => ({
        ingredientId: String(row.ingredientId ?? ""),
        ingredientName: row.ingredientName as string | undefined,
        riskLevel: String(row.riskLevel ?? ""),
        daysUntilStockout: row.daysUntilStockout !== undefined ? Number(row.daysUntilStockout) : undefined,
      })) ?? [],
  };
}

export function parseMenuIntelligenceBundle(raw: MenuIntelligenceBundleRaw): MenuIntelligenceDashboardData {
  return {
    summary: raw.summary,
    matrix: raw.matrix ?? undefined,
    snapshots: raw.snapshots ?? [],
    executive: raw.executive ? mapExecutiveAnalytics(raw.executive) : null,
    foodCostTrend: raw.foodCostTrend ? mapFoodCostTrendRows(raw.foodCostTrend) : [],
    marginTrend: raw.marginTrend ? mapMarginTrendRows(raw.marginTrend) : [],
    inventory: raw.inventory ? mapInventorySummary(raw.inventory) : null,
    priceOpps: raw.priceOpportunities ?? [],
    bundleOpps: raw.bundleOpportunities ?? [],
    ingredientOpps: raw.ingredientOpportunities ?? [],
    yieldOpps: raw.yieldOpportunities ?? [],
    openAlerts: raw.openAlerts ?? [],
    criticalAlerts: raw.criticalAlerts ?? [],
    resolvedAlerts: raw.resolvedAlerts ?? [],
    demandForecast: raw.demandForecast ? mapDemandForecast(raw.demandForecast) : null,
    revenueForecast: raw.revenueForecast ? mapRevenueForecast(raw.revenueForecast) : null,
    productionForecast: raw.productionForecast ? mapProductionForecast(raw.productionForecast) : null,
    stockRisk: raw.stockRisk ? mapStockRisk(raw.stockRisk) : null,
  };
}

export async function getMenuIntelligenceBundle(
  outletId: number,
  fromDate?: string,
  toDate?: string,
): Promise<MenuIntelligenceDashboardData> {
  const extra: Record<string, string> = {};
  if (fromDate) extra.fromDate = fromDate;
  if (toDate) extra.toDate = toDate;
  const response = await request<{ data: MenuIntelligenceBundleRaw }>(
    `/menu-dashboard/intelligence${outletQuery(outletId, extra)}`,
  );
  return parseMenuIntelligenceBundle(response.data);
}

export async function getMenuDashboardSnapshots(outletId: number): Promise<DashboardSnapshot[]> {
  const response = await request<{ data: DashboardSnapshot[] }>(`/menu-dashboard/snapshots${outletQuery(outletId)}`);
  return response.data;
}

export async function getEngineeringMatrix(
  outletId: number,
  fromDate?: string,
  toDate?: string,
): Promise<EngineeringMatrix> {
  const extra: Record<string, string> = {};
  if (fromDate) extra.fromDate = fromDate;
  if (toDate) extra.toDate = toDate;
  const response = await request<{ data: EngineeringMatrix }>(
    `/menu-engineering/matrix${outletQuery(outletId, extra)}`,
  );
  return response.data;
}

export async function getExecutiveAnalytics(
  outletId: number,
  fromDate?: string,
  toDate?: string,
): Promise<{
  totalRevenue: number;
  averageFoodCostPercent: number;
  averageMarginPercent: number;
  inventoryValue: number;
  salesTrend: Array<{ sale_date: string; total_sales: number; order_count: number }>;
}> {
  const extra: Record<string, string> = {};
  if (fromDate) extra.fromDate = fromDate;
  if (toDate) extra.toDate = toDate;
  const response = await request<{ data: Record<string, unknown> }>(
    `/menu-analytics/executive${outletQuery(outletId, extra)}`,
  );
  const d = response.data;
  return {
    totalRevenue: Number(d.totalRevenue ?? 0),
    averageFoodCostPercent: Number(d.averageFoodCostPercent ?? 0),
    averageMarginPercent: Number(d.averageMarginPercent ?? 0),
    inventoryValue: Number(d.inventoryValue ?? 0),
    salesTrend: (d.salesTrend as Array<{ sale_date: string; total_sales: number; order_count: number }>) ?? [],
  };
}

export async function getFoodCostTrend(
  outletId: number,
  fromDate?: string,
  toDate?: string,
): Promise<Array<{ date: string; totalCost: number; totalRevenue: number; foodCostPercent: number }>> {
  const extra: Record<string, string> = {};
  if (fromDate) extra.fromDate = fromDate;
  if (toDate) extra.toDate = toDate;
  const response = await request<{ data: Array<Record<string, unknown>> }>(
    `/menu-analytics/food-cost/trend${outletQuery(outletId, extra)}`,
  );
  return response.data.map((row) => ({
    date: String(row.snapshot_date ?? row.date ?? ""),
    totalCost: Number(row.total_cost ?? row.totalCost ?? 0),
    totalRevenue: Number(row.total_revenue ?? row.totalRevenue ?? 0),
    foodCostPercent: Number(row.foodCostPercent ?? 0),
  }));
}

export async function getMarginTrend(
  outletId: number,
  fromDate?: string,
  toDate?: string,
): Promise<Array<{ date: string; marginPercent: number; totalMargin: number }>> {
  const extra: Record<string, string> = {};
  if (fromDate) extra.fromDate = fromDate;
  if (toDate) extra.toDate = toDate;
  const response = await request<{ data: Array<Record<string, unknown>> }>(
    `/menu-analytics/profitability/trend${outletQuery(outletId, extra)}`,
  );
  return response.data.map((row) => ({
    date: String(row.date ?? ""),
    marginPercent: Number(row.marginPercent ?? 0),
    totalMargin: Number(row.totalMargin ?? 0),
  }));
}

export async function getInventoryAnalytics(outletId: number): Promise<{
  inventoryValue: number;
  deadStock: Array<{ ingredientId: string; ingredientName: string | null; inventoryValue: number }>;
}> {
  const response = await request<{ data: Record<string, unknown> }>(
    `/menu-analytics/inventory${outletQuery(outletId)}`,
  );
  const deadStock = (response.data.deadStock as Array<Record<string, unknown>>) ?? [];
  return {
    inventoryValue: Number(response.data.inventoryValue ?? 0),
    deadStock: deadStock.map((row) => ({
      ingredientId: String(row.ingredientId ?? ""),
      ingredientName: (row.ingredientName as string | null) ?? null,
      inventoryValue: Number(row.inventoryValue ?? 0),
    })),
  };
}

export async function getPriceOpportunities(outletId: number): Promise<PriceOpportunity[]> {
  const response = await request<{ data: PriceOpportunity[] }>(
    `/menu-optimization/pricing/opportunities${outletQuery(outletId)}`,
  );
  return response.data;
}

export async function getBundleOpportunities(outletId: number): Promise<BundleOpportunity[]> {
  const response = await request<{ data: BundleOpportunity[] }>(
    `/menu-optimization/bundles/top${outletQuery(outletId)}`,
  );
  return response.data;
}

export async function getIngredientOpportunities(outletId: number): Promise<IngredientOpportunity[]> {
  const response = await request<{ data: { opportunities?: IngredientOpportunity[] } | IngredientOpportunity[] }>(
    `/menu-optimization/ingredients/opportunities${outletQuery(outletId)}`,
  );
  const data = response.data;
  if (Array.isArray(data)) return data;
  return data.opportunities ?? [];
}

export async function getYieldOpportunities(outletId: number): Promise<YieldOpportunity[]> {
  const response = await request<{ data: { opportunities?: YieldOpportunity[] } | YieldOpportunity[] }>(
    `/menu-optimization/yield/opportunities${outletQuery(outletId)}`,
  );
  const data = response.data;
  if (Array.isArray(data)) return data;
  return data.opportunities ?? [];
}

export async function getOpenAlerts(outletId: number): Promise<AutomationAlert[]> {
  const response = await request<{ data: AutomationAlert[] }>(
    `/menu-automation/alerts/open${outletQuery(outletId)}`,
  );
  return response.data;
}

export async function getCriticalAlerts(outletId: number): Promise<AutomationAlert[]> {
  const response = await request<{ data: AutomationAlert[] }>(
    `/menu-automation/alerts/critical${outletQuery(outletId)}`,
  );
  return response.data;
}

export async function getResolvedAlerts(outletId: number): Promise<AutomationAlert[]> {
  const response = await request<{ data: AutomationAlert[] }>(
    `/menu-automation/alerts/history${outletQuery(outletId)}`,
  );
  return response.data;
}

export async function resolveAutomationAlert(outletId: number, alertId: number): Promise<AutomationAlert> {
  const response = await request<{ data: AutomationAlert }>(
    `/menu-automation/alerts/${alertId}/resolve${outletQuery(outletId)}`,
    { method: "POST" },
  );
  return response.data;
}

export async function getDemandForecast(outletId: number): Promise<{
  forecastDate: string;
  items: Array<{ menuItemId: string; menuItemName?: string; predictedQuantity: number }>;
}> {
  const response = await request<{ data: Record<string, unknown> }>(
    `/menu-forecasting/demand${outletQuery(outletId)}`,
  );
  return {
    forecastDate: String(response.data.forecastDate ?? ""),
    items: (response.data.items as Array<{ menuItemId: string; menuItemName?: string; predictedQuantity: number }>) ?? [],
  };
}

export async function getRevenueForecast(outletId: number): Promise<{
  forecastDate: string;
  totals: { predictedRevenue: number; predictedMargin: number };
  items: Array<{ menuItemId: string; menuItemName?: string; predictedRevenue: number; predictedMargin: number }>;
}> {
  const response = await request<{ data: Record<string, unknown> }>(
    `/menu-forecasting/revenue${outletQuery(outletId)}`,
  );
  const totals = (response.data.totals as Record<string, number>) ?? {};
  return {
    forecastDate: String(response.data.forecastDate ?? ""),
    totals: {
      predictedRevenue: Number(totals.predictedRevenue ?? 0),
      predictedMargin: Number(totals.predictedMargin ?? 0),
    },
    items: (response.data.items as Array<Record<string, unknown>>)?.map((row) => ({
      menuItemId: String(row.menuItemId ?? ""),
      menuItemName: row.menuItemName as string | undefined,
      predictedRevenue: Number(row.predictedRevenue ?? 0),
      predictedMargin: Number(row.predictedMargin ?? 0),
    })) ?? [],
  };
}

export async function getProductionForecast(outletId: number): Promise<{
  items: Array<{ menuItemId: string; menuItemName?: string; predictedQuantity: number }>;
}> {
  const response = await request<{ data: Record<string, unknown> }>(
    `/menu-forecasting/production${outletQuery(outletId)}`,
  );
  return {
    items: (response.data.items as Array<{ menuItemId: string; menuItemName?: string; predictedQuantity: number }>) ?? [],
  };
}

export async function getStockRiskForecast(outletId: number): Promise<{
  risks: Array<{
    ingredientId: string;
    ingredientName?: string;
    riskLevel: string;
    daysUntilStockout?: number;
  }>;
}> {
  const response = await request<{ data: Record<string, unknown> }>(
    `/menu-forecasting/stock-risk${outletQuery(outletId)}`,
  );
  return {
    risks: (response.data.risks as Array<Record<string, unknown>>)?.map((row) => ({
      ingredientId: String(row.ingredientId ?? ""),
      ingredientName: row.ingredientName as string | undefined,
      riskLevel: String(row.riskLevel ?? ""),
      daysUntilStockout: row.daysUntilStockout !== undefined ? Number(row.daysUntilStockout) : undefined,
    })) ?? [],
  };
}

export async function safeApi<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}
