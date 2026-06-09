import { apiRequest as request } from "./client";
import type { MenuItemApi } from "./endpoints";

type ApiListResponse<T> = {
  data: T[];
  meta?: {
    current_page?: number;
    currentPage?: number;
    per_page?: number;
    perPage?: number;
    total?: number;
    last_page?: number;
    lastPage?: number;
  };
};

export type ListMeta = {
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
};

function mapMeta(meta: ApiListResponse<unknown>["meta"], fallbackCount: number): ListMeta {
  return {
    currentPage: meta?.current_page ?? meta?.currentPage ?? 1,
    perPage: meta?.per_page ?? meta?.perPage ?? fallbackCount,
    total: meta?.total ?? fallbackCount,
    lastPage: meta?.last_page ?? meta?.lastPage ?? 1,
  };
}

function outletQuery(outletId: number, extra?: Record<string, string | number>): string {
  const query = new URLSearchParams({ outletId: String(outletId) });
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      query.set(key, String(value));
    }
  }
  return `?${query.toString()}`;
}

export type MenuCostIngredientLine = {
  inventoryItemId: string;
  ingredientName: string | null;
  unit: string | null;
  quantity: number;
  averageCost: number;
  lineCost: number;
};

export type MenuCostBreakdown = {
  menuItemId: string;
  menuItemName: string;
  outletId: number;
  yieldPercent: number;
  wastePercent: number;
  ingredients: MenuCostIngredientLine[];
  rawCost: number;
  yieldAdjustedCost: number;
  wasteAdjustedCost: number;
  finalTheoreticalCost: number;
  sellingPrice: number;
};

export type MenuProfitability = {
  menuItemId: string;
  menuItemName: string;
  outletId: number;
  sellingPrice: number;
  cost: number;
  margin: number;
  marginPercent: number;
  contributionMargin: number;
  classification: string;
};

export type MenuCostHistoryRow = {
  orderItemId: string;
  snapshotCost: number;
  snapshotTotalCost: number;
  currentCost: number;
  difference: number;
  variancePercent: number;
  averageCostVersion: string | null;
  snapshotAt: string | null;
};

export type MenuCostHistory = {
  menuItemId: string;
  outletId: number;
  currentCost: number;
  history: MenuCostHistoryRow[];
};

export type MenuProfitabilityHistory = {
  menuItemId: string;
  outletId: number;
  sellingPrice: number;
  historicalCost: number | null;
  currentCost: number;
  costVariance: number;
  variancePercent: number;
  historicalMargin: number | null;
  currentMargin: number;
  historicalMarginPercent: number | null;
  currentMarginPercent: number;
  comparisons: Array<{
    orderItemId: string;
    historicalCost: number;
    currentCost: number;
    costVariance: number;
    variancePercent: number;
    historicalMargin: number;
    historicalMarginPercent: number;
    currentMargin: number;
    currentMarginPercent: number;
    marginVariance: number;
    snapshotAt: string | null;
  }>;
};

export type RecipeVersionItem = {
  ingredientId: string;
  ingredientName: string | null;
  quantity: number;
  unit: string | null;
};

export type RecipeVersion = {
  id: string;
  menuItemId: string;
  versionNumber: number;
  name: string | null;
  notes: string | null;
  status: string;
  activatedAt: string | null;
  items: RecipeVersionItem[];
};

export type ListMenuItemsPaginatedParams = {
  tenantId?: number;
  outletId?: number;
  page?: number;
  perPage?: number;
};

export async function listMenuItemsPaginated(
  params: ListMenuItemsPaginatedParams,
): Promise<{ items: MenuItemApi[]; meta: ListMeta }> {
  const query = new URLSearchParams();
  if (params.tenantId !== undefined) query.set("tenantId", String(params.tenantId));
  if (params.outletId !== undefined && params.outletId >= 1) query.set("outletId", String(params.outletId));
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.perPage !== undefined) query.set("perPage", String(params.perPage));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await request<ApiListResponse<MenuItemApi>>(`/menu-items${suffix}`);
  return {
    items: response.data,
    meta: mapMeta(response.meta, response.data.length),
  };
}

export async function fetchAllMenuItemsForOutlet(
  tenantId: number,
  outletId: number,
  perPage = 100,
): Promise<MenuItemApi[]> {
  const first = await listMenuItemsPaginated({ tenantId, outletId, page: 1, perPage });
  const all = [...first.items];
  for (let page = 2; page <= first.meta.lastPage; page += 1) {
    const next = await listMenuItemsPaginated({ tenantId, outletId, page, perPage });
    all.push(...next.items);
  }
  return all;
}

export async function getMenuCostBreakdown(menuItemId: string | number, outletId: number): Promise<MenuCostBreakdown> {
  const response = await request<{ data: MenuCostBreakdown }>(
    `/menu-costing/menu-items/${menuItemId}/breakdown${outletQuery(outletId)}`,
  );
  return response.data;
}

export async function getMenuCostHistory(
  menuItemId: string | number,
  outletId: number,
  fromDate?: string,
  toDate?: string,
): Promise<MenuCostHistory> {
  const extra: Record<string, string> = {};
  if (fromDate) extra.fromDate = fromDate;
  if (toDate) extra.toDate = toDate;
  const response = await request<{ data: MenuCostHistory }>(
    `/menu-costing/menu-items/${menuItemId}/history${outletQuery(outletId, extra)}`,
  );
  return response.data;
}

export async function getMenuProfitability(menuItemId: string | number, outletId: number): Promise<MenuProfitability> {
  const response = await request<{ data: MenuProfitability }>(
    `/menu-profitability/menu-items/${menuItemId}${outletQuery(outletId)}`,
  );
  return response.data;
}

export async function getMenuProfitabilityHistory(
  menuItemId: string | number,
  outletId: number,
  fromDate?: string,
  toDate?: string,
): Promise<MenuProfitabilityHistory> {
  const extra: Record<string, string> = {};
  if (fromDate) extra.fromDate = fromDate;
  if (toDate) extra.toDate = toDate;
  const response = await request<{ data: MenuProfitabilityHistory }>(
    `/menu-profitability/menu-items/${menuItemId}/history${outletQuery(outletId, extra)}`,
  );
  return response.data;
}

export async function recalculateMenuCost(menuItemId: string | number, outletId: number): Promise<MenuCostBreakdown> {
  const response = await request<{ data: MenuCostBreakdown; message: string }>(
    `/menu-costing/menu-items/${menuItemId}/recalculate${outletQuery(outletId)}`,
    { method: "POST" },
  );
  return response.data;
}

export async function listRecipeVersions(menuItemId: string | number, outletId: number): Promise<RecipeVersion[]> {
  const response = await request<{ data: RecipeVersion[] }>(
    `/menu-production/menu-items/${menuItemId}/versions${outletQuery(outletId)}`,
  );
  return response.data;
}

export async function getRecipeVersion(
  menuItemId: string | number,
  versionId: string | number,
  outletId: number,
): Promise<RecipeVersion> {
  const response = await request<{ data: RecipeVersion }>(
    `/menu-production/menu-items/${menuItemId}/versions/${versionId}${outletQuery(outletId)}`,
  );
  return response.data;
}

export type MenuCostRow = {
  menuItemId: string;
  menuItemName: string;
  category: string | null;
  sellingPrice: number;
  foodCost: number;
  contributionMargin: number;
  marginPercent: number;
  classification: string;
  lastUpdated: string | null;
};

export async function enrichMenuItemsWithProfitability(
  items: MenuItemApi[],
  outletId: number,
): Promise<MenuCostRow[]> {
  const rows = await Promise.all(
    items.map(async (item) => {
      try {
        const profit = await getMenuProfitability(item.id, outletId);
        return {
          menuItemId: item.id,
          menuItemName: item.name,
          category: item.category ?? null,
          sellingPrice: profit.sellingPrice,
          foodCost: profit.cost,
          contributionMargin: profit.contributionMargin,
          marginPercent: profit.marginPercent,
          classification: profit.classification,
          lastUpdated: item.createdAt ?? null,
        } satisfies MenuCostRow;
      } catch {
        return {
          menuItemId: item.id,
          menuItemName: item.name,
          category: item.category ?? null,
          sellingPrice: item.price,
          foodCost: 0,
          contributionMargin: item.price,
          marginPercent: 0,
          classification: "LOW",
          lastUpdated: item.createdAt ?? null,
        } satisfies MenuCostRow;
      }
    }),
  );
  return rows;
}
