import { useQuery } from "@tanstack/react-query";
import {
  enrichMenuItemsWithProfitability,
  fetchAllMenuItemsForOutlet,
  type MenuCostRow,
} from "@/lib/api-integration/menuCostingEndpoints";

const TENANT_ID = Number(import.meta.env.VITE_API_TENANT_ID ?? 1) || 1;

export function useMenuCostCatalog(outletId: number | null) {
  return useQuery({
    queryKey: ["menu-cost-catalog", TENANT_ID, outletId],
    queryFn: async (): Promise<MenuCostRow[]> => {
      if (typeof outletId !== "number" || outletId < 1) return [];
      const items = await fetchAllMenuItemsForOutlet(TENANT_ID, outletId);
      return enrichMenuItemsWithProfitability(items, outletId);
    },
    enabled: typeof outletId === "number" && outletId >= 1,
    staleTime: 60_000,
  });
}

export type MenuCostSortKey = "foodCost" | "contributionMargin" | "marginPercent" | "sellingPrice" | "menuItemName";

export function sortMenuCostRows(rows: MenuCostRow[], sortBy: MenuCostSortKey, desc: boolean): MenuCostRow[] {
  const sorted = [...rows].sort((a, b) => {
    const av = sortBy === "menuItemName" ? a.menuItemName.toLowerCase() : a[sortBy];
    const bv = sortBy === "menuItemName" ? b.menuItemName.toLowerCase() : b[sortBy];
    if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv);
    return Number(av) - Number(bv);
  });
  return desc ? sorted.reverse() : sorted;
}

export function filterMenuCostRows(
  rows: MenuCostRow[],
  search: string,
  category: string,
): MenuCostRow[] {
  const q = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (category !== "all" && (row.category ?? "") !== category) return false;
    if (q && !row.menuItemName.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function paginateRows<T>(rows: T[], page: number, perPage: number): { rows: T[]; total: number; lastPage: number } {
  const total = rows.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), lastPage);
  const start = (safePage - 1) * perPage;
  return {
    rows: rows.slice(start, start + perPage),
    total,
    lastPage,
  };
}
