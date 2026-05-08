import { create } from "zustand";
import { getApiAccessToken } from "@/lib/api-integration/client";
import { heartbeatTerminal, registerTerminal } from "@/lib/api-integration/terminalEndpoints";
import { postTerminalSyncBatch, type TerminalSyncBatchOperation } from "@/lib/api-integration/terminalSyncEndpoints";
import {
  listQueuedOperationsForOutlet,
  queueOfflineOperationDraft,
  removeQueuedOperationsByFingerprints,
} from "@/lib/offline/offlineOperationQueue";

const DEVICE_KEY_PREFIX = "resto.terminal.device.";

function storageDeviceKey(outletId: number): string {
  return `${DEVICE_KEY_PREFIX}${outletId}`;
}

/** Stable per-outlet device identity for terminal registration (browser localStorage). */
export function getOrCreateDeviceKey(outletId: number): string {
  if (typeof localStorage === "undefined") {
    return `ephemeral-${outletId}`;
  }
  const key = storageDeviceKey(outletId);
  let existing = localStorage.getItem(key);
  if (!existing) {
    existing = crypto.randomUUID();
    localStorage.setItem(key, existing);
  }
  return existing;
}

type OfflineSyncStore = {
  isOnline: boolean;
  pendingQueueCount: number;
  syncPhase: "idle" | "syncing";
  lastSyncError: string | null;
  lastBatchConflictCount: number;
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
    const deviceKey = getOrCreateDeviceKey(outletId);
    try {
      await registerTerminal({ outletId, deviceKey });
      await heartbeatTerminal({ outletId, deviceKey, sessionMetadata: { surface: "web-client" } });
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
      set({ pendingQueueCount: 0, lastBatchConflictCount: 0 });
      return;
    }

    set({ syncPhase: "syncing", lastSyncError: null });
    const deviceKey = getOrCreateDeviceKey(outletId);
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
      for (const r of response.results) {
        if (r.status === "applied" || r.status === "duplicate") {
          toDrop.add(r.fingerprint);
        }
        if (r.status === "conflict") conflicts += 1;
        if (r.status === "rejected_stale") {
          /* keep for operator review */
        }
      }
      if (toDrop.size > 0) {
        await removeQueuedOperationsByFingerprints(outletId, toDrop);
      }
      await get().refreshQueueCounts(outletId);
      set({ lastBatchConflictCount: conflicts, syncPhase: "idle" });
    } catch (error) {
      set({
        syncPhase: "idle",
        lastSyncError: error instanceof Error ? error.message : "Sync failed",
      });
    }
  },
}));
