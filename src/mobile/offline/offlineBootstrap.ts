import { apiRequest } from "@/lib/api-integration/client";
import { hydratePosBootstrapSettings } from "@/stores/settingsStore";
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

export async function runOfflineBootstrap(params: FetchOfflineBootstrapParams): Promise<OfflineBootstrapSnapshot> {
  const snapshot = await fetchOfflineBootstrapRemote(params);
  hydratePosBootstrapSettings(snapshot.merchant as never, snapshot.system as never);
  await saveOfflineBootstrap(snapshot);
  return snapshot;
}

export async function getCachedOfflineBootstrap(outletId: number): Promise<OfflineBootstrapSnapshot | null> {
  return loadOfflineBootstrap(outletId);
}

export function canOperateOffline(snapshot: OfflineBootstrapSnapshot | null): boolean {
  return isBootstrapFresh(snapshot);
}

export { isBootstrapFresh, type OfflineBootstrapSnapshot };
