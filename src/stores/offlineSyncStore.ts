import { getOrCreateDeviceKeyAsync, getOrCreateDeviceKeySync } from "@/mobile/offline/deviceKey";
import { probeApiReachability } from "@/mobile/offline/apiReachability";
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
import { applyTerminalSyncOutcomeMappings } from "@/mobile/offline/terminalSyncOutcomeMappings";

const DEVICE_KEY_PREFIX = "resto.terminal.device.";

/** Failures before declaring API unreachable while link appears up. */
const REACHABILITY_FAILURE_THRESHOLD = 2;
const REACHABILITY_INTERVAL_MS = 15_000;
const REACHABILITY_TIMEOUT_MS = 4_000;

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
  /** True when navigator says online but API probe failed. */
  apiUnreachable: boolean;
  pendingQueueCount: number;
  syncPhase: "idle" | "syncing";
  lastSyncError: string | null;
  lastBatchConflictCount: number;
  lastRejectedStaleCount: number;
  listenersAttached: boolean;
  consecutiveProbeFailures: number;
  initConnectivityListeners: () => void;
  refreshQueueCounts: (outletId: number | null) => Promise<void>;
  ensureTerminalPresence: (outletId: number | null) => Promise<void>;
  enqueueReplayableOperation: (input: Omit<TerminalSyncBatchOperation, "clientOccurredAt"> & {
    outletId: number;
    clientOccurredAt?: string | null;
  }) => Promise<void>;
  flushQueueForOutlet: (outletId: number) => Promise<void>;
};

let probeTimer: ReturnType<typeof setInterval> | null = null;
let probeInFlight = false;

function recomputeOnline(linkOnline: boolean, consecutiveFailures: number): {
  isOnline: boolean;
  apiUnreachable: boolean;
} {
  if (!linkOnline) {
    return { isOnline: false, apiUnreachable: false };
  }
  const unreachable = consecutiveFailures >= REACHABILITY_FAILURE_THRESHOLD;
  return { isOnline: !unreachable, apiUnreachable: unreachable };
}

export const useOfflineSyncStore = create<OfflineSyncStore>((set, get) => ({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  apiUnreachable: false,
  pendingQueueCount: 0,
  syncPhase: "idle",
  lastSyncError: null,
  lastBatchConflictCount: 0,
  lastRejectedStaleCount: 0,
  listenersAttached: false,
  consecutiveProbeFailures: 0,

  initConnectivityListeners: () => {
    if (typeof window === "undefined" || get().listenersAttached) return;

    const applyLink = () => {
      const linkOnline = navigator.onLine;
      if (!linkOnline) {
        set({
          consecutiveProbeFailures: REACHABILITY_FAILURE_THRESHOLD,
          ...recomputeOnline(false, REACHABILITY_FAILURE_THRESHOLD),
        });
        return;
      }
      // Link restored — reset failures and probe immediately
      set({ consecutiveProbeFailures: 0 });
      void runProbe();
    };

    const runProbe = async () => {
      if (probeInFlight) return;
      if (!navigator.onLine) {
        set({
          consecutiveProbeFailures: REACHABILITY_FAILURE_THRESHOLD,
          ...recomputeOnline(false, REACHABILITY_FAILURE_THRESHOLD),
        });
        return;
      }
      probeInFlight = true;
      try {
        const result = await probeApiReachability({ timeoutMs: REACHABILITY_TIMEOUT_MS });
        if (result.ok) {
          set({
            consecutiveProbeFailures: 0,
            ...recomputeOnline(true, 0),
          });
        } else {
          const next = get().consecutiveProbeFailures + 1;
          set({
            consecutiveProbeFailures: next,
            ...recomputeOnline(true, next),
          });
        }
      } finally {
        probeInFlight = false;
      }
    };

    window.addEventListener("online", applyLink);
    window.addEventListener("offline", applyLink);
    applyLink();
    void runProbe();
    if (probeTimer) clearInterval(probeTimer);
    probeTimer = setInterval(() => {
      void runProbe();
    }, REACHABILITY_INTERVAL_MS);

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
          const op = operations.find((item) => item.fingerprint === r.fingerprint);
          await applyTerminalSyncOutcomeMappings(op, r.outcomeSummary ?? {}).catch(() => undefined);
          const summary = r.outcomeSummary ?? {};
          if (summary.entity === "order" && typeof summary.orderId === "number") {
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
      // Treat flush network failure as reachability signal
      const next = get().consecutiveProbeFailures + 1;
      set({
        consecutiveProbeFailures: next,
        ...recomputeOnline(navigator.onLine, next),
      });
    }
  },
}));

// Preserve legacy export for tests referencing storage key helper
export { storageDeviceKey };
