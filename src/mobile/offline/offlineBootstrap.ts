import { apiRequest } from "@/lib/api-integration/client";
import { hydratePosBootstrapSettings } from "@/stores/settingsStore";
import { usePosSessionStore } from "@/stores/posSessionStore";
import {
  isBootstrapFresh,
  loadOfflineBootstrap,
  saveOfflineBootstrap,
  type OfflineBootstrapSnapshot,
} from "./offlineBootstrapDb";

export type FetchOfflineBootstrapParams = {
  outletId: number;
  tenantId?: number;
  perPage?: number;
};

export async function fetchOfflineBootstrapRemote(
  params: FetchOfflineBootstrapParams,
): Promise<OfflineBootstrapSnapshot> {
  const query = new URLSearchParams();
  query.set("outletId", String(params.outletId));
  if (params.tenantId !== undefined) query.set("tenantId", String(params.tenantId));
  if (params.perPage !== undefined) query.set("perPage", String(params.perPage));
  const response = await apiRequest<{ data: OfflineBootstrapSnapshot }>(
    `/pos/offline-bootstrap?${query.toString()}`,
  );
  return response.data;
}

export function hydrateStoresFromOfflineBootstrap(snapshot: OfflineBootstrapSnapshot): void {
  hydratePosBootstrapSettings(snapshot.merchant as never, snapshot.system as never);
  const float =
    typeof snapshot.defaultCashFloat === "number" && Number.isFinite(snapshot.defaultCashFloat)
      ? snapshot.defaultCashFloat
      : undefined;
  usePosSessionStore
    .getState()
    .hydrateFromBootstrap(snapshot.outletId, snapshot.posSession ?? null, float);
}

export async function runOfflineBootstrap(params: FetchOfflineBootstrapParams): Promise<OfflineBootstrapSnapshot> {
  const snapshot = await fetchOfflineBootstrapRemote(params);
  hydrateStoresFromOfflineBootstrap(snapshot);
  await saveOfflineBootstrap(snapshot);
  if (Array.isArray(snapshot.openOrders)) {
    const { mergeServerOpenOrdersWithLocalCache } = await import("./offlineOrdersCache");
    await mergeServerOpenOrdersWithLocalCache(
      snapshot.outletId,
      snapshot.openOrders as import("./offlineOrdersCache").CachedOpenOrder[],
    );
  }
  return snapshot;
}

export async function getCachedOfflineBootstrap(outletId: number): Promise<OfflineBootstrapSnapshot | null> {
  return loadOfflineBootstrap(outletId);
}

/** Sync peek of in-memory bootstrap (avoids blank/blocker flash on POS remount). */
export { peekOfflineBootstrap } from "./offlineBootstrapDb";

export function canOperateOffline(snapshot: OfflineBootstrapSnapshot | null): boolean {
  return isBootstrapFresh(snapshot);
}

export { isBootstrapFresh, type OfflineBootstrapSnapshot };
