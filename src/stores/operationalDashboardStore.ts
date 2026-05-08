import { create } from "zustand";
import { getOperationalMetrics } from "@/lib/api-integration/monitoringEndpoints";
import { getRealtimeAdapter, type RealtimeEnvelope, type RealtimeConnectionState } from "@/domain/realtimeAdapter";
import type { OperationalMetrics } from "@/domain/operationsTypes";
import { EMPTY_OFFLINE_RESILIENCE } from "@/domain/operationsTypes";

const EMPTY_METRICS: OperationalMetrics = {
  kitchen: { queued: 0, inProgress: 0, ready: 0 },
  pendingPayments: 0,
  activeSessions: 0,
  qrQueue: 0,
  printerQueue: { pending: 0, failed: 0, printing: 0 },
  reconciliationWarnings: [],
  updatedAt: null,
  offlineResilience: EMPTY_OFFLINE_RESILIENCE,
};

type OperationalDashboardStore = {
  metrics: OperationalMetrics;
  isLoading: boolean;
  error: string | null;
  lastSyncAt: string | null;
  pollingActive: boolean;
  pollTimer: ReturnType<typeof setInterval> | null;
  realtimeState: RealtimeConnectionState;
  realtimeTransport: "polling" | "websocket";
  lastRealtimeSeq: number;
  realtimeUnsubscribe: (() => void) | null;
  realtimeConnectionUnsubscribe: (() => void) | null;
  fetchMetrics: () => Promise<void>;
  startRealtime: () => void;
  stopRealtime: () => void;
  startMonitoring: (intervalMs?: number) => Promise<void>;
  stopMonitoring: () => void;
  reset: () => void;
};

function extractRealtimeSeq(event: RealtimeEnvelope): number {
  return event.sequence ?? event.seq ?? event.version ?? 0;
}

export const useOperationalDashboardStore = create<OperationalDashboardStore>((set, get) => ({
  metrics: EMPTY_METRICS,
  isLoading: false,
  error: null,
  lastSyncAt: null,
  pollingActive: false,
  pollTimer: null,
  realtimeState: "idle",
  realtimeTransport: "polling",
  lastRealtimeSeq: 0,
  realtimeUnsubscribe: null,
  realtimeConnectionUnsubscribe: null,

  fetchMetrics: async () => {
    set({ isLoading: true, error: null });
    try {
      const metrics = await getOperationalMetrics();
      set({ metrics, lastSyncAt: new Date().toISOString() });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to load operational metrics" });
    } finally {
      set({ isLoading: false });
    }
  },

  startRealtime: () => {
    if (get().realtimeUnsubscribe) return;
    const adapter = getRealtimeAdapter("operations");
    const connectionUnsubscribe = adapter.onConnectionStateChange((state) => {
      set({
        realtimeState: state,
        realtimeTransport: state === "connected" ? "websocket" : "polling",
      });
    });
    const unsubscribe = adapter.subscribe({
      channel: "operations",
      onEvent: (event) => {
        const payload = (event.payload ?? event.data) as Partial<OperationalMetrics> | undefined;
        if (!payload) return;
        const incomingSeq = extractRealtimeSeq(event);
        if (incomingSeq > 0 && incomingSeq <= get().lastRealtimeSeq) return;
        set((state) => ({
          metrics: {
            ...state.metrics,
            ...payload,
            kitchen: { ...state.metrics.kitchen, ...(payload.kitchen ?? {}) },
            printerQueue: { ...state.metrics.printerQueue, ...(payload.printerQueue ?? {}) },
            reconciliationWarnings: payload.reconciliationWarnings ?? state.metrics.reconciliationWarnings,
            offlineResilience: payload.offlineResilience
              ? {
                  ...(state.metrics.offlineResilience ?? EMPTY_OFFLINE_RESILIENCE),
                  ...payload.offlineResilience,
                }
              : state.metrics.offlineResilience,
            updatedAt: payload.updatedAt ?? new Date().toISOString(),
          },
          lastRealtimeSeq: incomingSeq > 0 ? incomingSeq : state.lastRealtimeSeq,
          lastSyncAt: new Date().toISOString(),
        }));
      },
    });
    set({ realtimeUnsubscribe: unsubscribe, realtimeConnectionUnsubscribe: connectionUnsubscribe });
    adapter.connect();
  },

  stopRealtime: () => {
    get().realtimeUnsubscribe?.();
    get().realtimeConnectionUnsubscribe?.();
    set({
      realtimeUnsubscribe: null,
      realtimeConnectionUnsubscribe: null,
      realtimeState: "disconnected",
      realtimeTransport: "polling",
      lastRealtimeSeq: 0,
    });
  },

  startMonitoring: async (intervalMs = 5000) => {
    get().stopMonitoring();
    get().startRealtime();
    await get().fetchMetrics();
    const timer = setInterval(() => {
      void get().fetchMetrics();
    }, intervalMs);
    set({ pollTimer: timer, pollingActive: true });
  },

  stopMonitoring: () => {
    if (get().pollTimer) clearInterval(get().pollTimer as ReturnType<typeof setInterval>);
    set({ pollTimer: null, pollingActive: false });
    get().stopRealtime();
  },

  reset: () => {
    get().stopMonitoring();
    set({
      metrics: EMPTY_METRICS,
      isLoading: false,
      error: null,
      lastSyncAt: null,
      pollingActive: false,
      pollTimer: null,
      realtimeState: "idle",
      realtimeTransport: "polling",
      lastRealtimeSeq: 0,
      realtimeUnsubscribe: null,
      realtimeConnectionUnsubscribe: null,
    });
  },
}));
