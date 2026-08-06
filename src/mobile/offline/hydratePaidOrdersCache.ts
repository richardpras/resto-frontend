import { listOrdersWithMeta, type OrderApi } from "@/lib/api-integration/endpoints";
import {
  mergeHydratedPaidOrders,
  type CachedPaidOrder,
} from "./offlinePaidOrdersCache";

const TENANT_ID = Number(import.meta.env.VITE_API_TENANT_ID ?? 1) || 1;

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Calendar window covering a rolling ~24h (today + yesterday) for API created_at filters. */
export function paidHydrateDateWindow(now = new Date()): { dateFrom: string; dateTo: string } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return { dateFrom: ymdLocal(yesterday), dateTo: ymdLocal(today) };
}

/**
 * Pull paid orders for the outlet (coarse created_at window) into the local 24h paid cache.
 * Client prune to rolling 24h happens inside mergeHydratedPaidOrders / save.
 */
export async function hydratePaidOrdersCache(outletId: number): Promise<CachedPaidOrder[]> {
  if (!Number.isFinite(outletId) || outletId < 1) return [];
  const { dateFrom, dateTo } = paidHydrateDateWindow();
  const perPage = 200;
  const collected: OrderApi[] = [];
  let page = 1;
  let lastPage = 1;
  do {
    const result = await listOrdersWithMeta({
      tenantId: TENANT_ID,
      outletId,
      paymentStatus: "paid",
      dateFrom,
      dateTo,
      page,
      perPage,
    });
    collected.push(...result.orders);
    lastPage = result.meta.lastPage;
    page += 1;
  } while (page <= lastPage);

  return mergeHydratedPaidOrders(outletId, collected as CachedPaidOrder[]);
}

let hydrateInflight = new Map<number, Promise<CachedPaidOrder[]>>();

/** Debounce-safe fire-and-forget hydrate (one in-flight per outlet). */
export function hydratePaidOrdersCacheDebounced(outletId: number): Promise<CachedPaidOrder[]> {
  const existing = hydrateInflight.get(outletId);
  if (existing) return existing;
  const run = hydratePaidOrdersCache(outletId)
    .catch(() => [] as CachedPaidOrder[])
    .finally(() => {
      hydrateInflight.delete(outletId);
    });
  hydrateInflight.set(outletId, run);
  return run;
}
