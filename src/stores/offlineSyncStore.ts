import { getOrCreateDeviceKeyAsync, getOrCreateDeviceKeySync } from "@/mobile/offline/deviceKey";
import { isCapacitorNative } from "@/mobile/platform";
import { create } from "zustand";
import { getApiAccessToken } from "@/lib/api-integration/client";
import { heartbeatTerminal, registerTerminal } from "@/lib/api-integration/terminalEndpoints";
import { postTerminalSyncBatch, type TerminalSyncBatchOperation } from "@/lib/api-integration/terminalSyncEndpoints";
import {
  listQueuedOperationsForOutlet,
  queueOfflineOperationDraft,
  removeQueuedOperationsByFingerprints,
} from "@/lib/offline/offlineOperationQueue";
import { saveLocalOrderMapping } from "@/mobile/offline/offlineIdMapping";

const DEVICE_KEY_PREFIX = "resto.terminal.device.";

function storageDeviceKey(outletId: number): string {
  return `${DEVICE_KEY_PREFIX}${outletId}`;
}

/** Stable per-outlet device identity for terminal registration (browser localStorage). */
export function getOrCreateDeviceKey(outletId: number): string {
  return getOrCreateDeviceKeySync(outletId);
}

async function resolveDeviceKey(outletId: number): Promise<string> {
  if (isCapacitorNative()) {
    return getOrCreateDeviceKeyAsync(outletId);
  }
  return getOrCreateDeviceKeySync(outletId);
}

type OfflineSyncStore = {
  isOnline: boolean;
  pendingQueueCount: number;
  syncPhase: "idle" | "syncing";
  lastSyncError: string | null;
  lastBatchConflictCount: number;
  lastRejectedStaleCount: number;
  listenersAttached: boolean;
  initConnectivityListeners: () => void;
  refreshQueueCounts: (outletId: number | null) => Promise<void>;
  ensureTerminalPresence: (outletId: number | null) => Promise<void>;
  enqueueReplayableOperation: (input: Omit<TerminalSyncBatchOperation, "clientOccurredAt"> & {
    outletId: number;
    clientOccurredAt?: string | null;
  }) => Promise<void>;
  flushQueueForOutlet: (outletId: number) => Promise<void>;
};

export const useOfflineSyncStore = create<OfflineSyncStore>((set, get) => ({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  pendingQueueCount: 0,
  syncPhase: "idle",
  lastSyncError: null,
  lastBatchConflictCount: 0,
  lastRejectedStaleCount: 0,
  listenersAttached: false,

  initConnectivityListeners: () => {
    if (typeof window === "undefined" || get().listenersAttached) return;
    const apply = () => set({ isOnline: navigator.onLine });
    window.addEventListener("online", apply);
    window.addEventListener("offline", apply);
    apply();
    set({ listenersAttached: true });
  },

  refreshQueueCounts: async (outletId) => {
    if (outletId === null || outletId < 1) {
      set({ pendingQueueCount: 0 });
      return;
    }
    const rows = await listQueuedOperationsForOutlet(outletId);
    set({ pendingQueueCount: rows.length });
  },

  ensureTerminalPresence: async (outletId) => {
    if (outletId === null || outletId < 1 || !getApiAccessToken() || !get().isOnline) return;
    const deviceKey = await resolveDeviceKey(outletId);
    try {
      await registerTerminal({ outletId, deviceKey, displayLabel: isCapacitorNative() ? "Android POS" : undefined });
      await heartbeatTerminal({
        outletId,
        deviceKey,
        sessionMetadata: { surface: isCapacitorNative() ? "android-pos" : "web-client" },
      });
    } catch {
      /* registration is best-effort; sync batch will still reject unknown devices if required */
    }
  },

  enqueueReplayableOperation: async ({ outletId, fingerprint, operationType, payload, clientOccurredAt }) => {
    const rows = await listQueuedOperationsForOutlet(outletId);
    if (rows.some((r) => r.fingerprint === fingerprint)) {
      await get().refreshQueueCounts(outletId);
      return;
    }
    await queueOfflineOperationDraft({
      outletId,
      fingerprint,
      operationType,
      payload: payload ?? {},
      clientOccurredAt: clientOccurredAt ?? new Date().toISOString(),
    });
    await get().refreshQueueCounts(outletId);
    if (get().isOnline) {
      await get().flushQueueForOutlet(outletId);
    }
  },

  flushQueueForOutlet: async (outletId) => {
    if (!get().isOnline || outletId < 1 || !getApiAccessToken()) return;
    const rows = await listQueuedOperationsForOutlet(outletId);
    if (rows.length === 0) {
      set({ pendingQueueCount: 0, lastBatchConflictCount: 0, lastRejectedStaleCount: 0 });
      return;
    }

    set({ syncPhase: "syncing", lastSyncError: null });
    const deviceKey = await resolveDeviceKey(outletId);
    try {
      await get().ensureTerminalPresence(outletId);
      const operations: TerminalSyncBatchOperation[] = rows.map((r) => ({
        fingerprint: r.fingerprint,
        operationType: r.operationType,
        payload: r.payload,
        clientOccurredAt: r.clientOccurredAt,
      }));
      const response = await postTerminalSyncBatch({ outletId, deviceKey, operations });

      const toDrop = new Set<string>();
      let conflicts = 0;
      let rejectedStale = 0;
      for (const r of response.results) {
        if (r.status === "applied" || r.status === "duplicate") {
          toDrop.add(r.fingerprint);
          const summary = r.outcomeSummary ?? {};
          if (summary.entity === "order" && typeof summary.orderId === "number") {
            const op = operations.find((item) => item.fingerprint === r.fingerprint);
            const clientLocalRef = String(op?.payload?.clientLocalRef ?? summary.clientLocalRef ?? "");
            if (clientLocalRef.startsWith("local:")) {
              const code = String(op?.payload?.code ?? "");
              const items = Array.isArray(summary.items) ? summary.items : [];
              const itemMap: Record<string, number> = {};
              for (const row of items) {
                if (row && typeof row === "object") {
                  const clientItemId = String((row as { clientItemId?: string }).clientItemId ?? "");
                  const orderItemId = Number((row as { orderItemId?: number }).orderItemId);
                  if (clientItemId && Number.isFinite(orderItemId)) {
                    itemMap[clientItemId] = orderItemId;
                  }
                }
              }
              await saveLocalOrderMapping(clientLocalRef, code, summary.orderId as number, itemMap).catch(() => undefined);
            }
          }
        }
        if (r.status === "conflict") conflicts += 1;
        if (r.status === "rejected_stale") rejectedStale += 1;
      }
      if (toDrop.size > 0) {
        await removeQueuedOperationsByFingerprints(outletId, toDrop);
      }
      await get().refreshQueueCounts(outletId);
      set({ lastBatchConflictCount: conflicts, lastRejectedStaleCount: rejectedStale, syncPhase: "idle" });
    } catch (error) {
      set({
        syncPhase: "idle",
        lastSyncError: error instanceof Error ? error.message : "Sync failed",
      });
    }
  },
}));

// Preserve legacy export for tests referencing storage key helper
export { storageDeviceKey };
