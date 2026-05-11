import { create } from "zustand";
import { getOperationalMetrics, normalizeQrQueueMetrics } from "@/lib/api-integration/monitoringEndpoints";
import { getRealtimeAdapter, type RealtimeEnvelope, type RealtimeConnectionState } from "@/domain/realtimeAdapter";
import type { OperationalMetrics } from "@/domain/operationsTypes";
import { EMPTY_OFFLINE_RESILIENCE, EMPTY_QR_QUEUE } from "@/domain/operationsTypes";
import { selectUserCapabilities } from "@/domain/accessControl";
import { ApiHttpError } from "@/lib/api-integration/client";

const EMPTY_METRICS: OperationalMetrics = {
  kitchen: { queued: 0, inProgress: 0, ready: 0 },
  pendingPayments: 0,
  activeSessions: 0,
  qrQueue: EMPTY_QR_QUEUE,
  printerQueue: { pending: 0, failed: 0, printing: 0 },
  reconciliationWarnings: [],
  updatedAt: null,
  offlineResilience: EMPTY_OFFLINE_RESILIENCE,
};

type OperationalDashboardStore = {
  metrics: OperationalMetrics;
  isLoading: boolean;
  initialLoading: boolean;
  switchingOutlet: boolean;
  backgroundRefreshing: boolean;
  realtimeRefreshing: boolean;
  error: string | null;
  lastSyncAt: string | null;
  lastSuccessfulSyncAt: string | null;
  activeOutletId: number | null;
  activeRequestId: number;
  isFetchInFlight: boolean;
  pollingActive: boolean;
  pollTimer: ReturnType<typeof setInterval> | null;
  realtimeState: RealtimeConnectionState;
  realtimeTransport: "polling" | "websocket";
  lastRealtimeSeq: number;
  realtimeUnsubscribe: (() => void) | null;
  realtimeConnectionUnsubscribe: (() => void) | null;
  fetchMetrics: (mode?: "initial" | "outlet-switch" | "background" | "realtime", outletId?: number | null) => Promise<void>;
  startRealtime: () => void;
  stopRealtime: () => void;
  startMonitoring: (intervalMs?: number, outletId?: number | null) => Promise<void>;
  stopMonitoring: () => void;
  reset: () => void;
};

function extractRealtimeSeq(event: RealtimeEnvelope): number {
  return event.sequence ?? event.seq ?? event.version ?? 0;
}

export const useOperationalDashboardStore = create<OperationalDashboardStore>((set, get) => ({
  metrics: EMPTY_METRICS,
  isLoading: false,
  initialLoading: false,
  switchingOutlet: false,
  backgroundRefreshing: false,
  realtimeRefreshing: false,
  error: null,
  lastSyncAt: null,
  lastSuccessfulSyncAt: null,
  activeOutletId: null,
  activeRequestId: 0,
  isFetchInFlight: false,
  pollingActive: false,
  pollTimer: null,
  realtimeState: "idle",
  realtimeTransport: "polling",
  lastRealtimeSeq: 0,
  realtimeUnsubscribe: null,
  realtimeConnectionUnsubscribe: null,

  fetchMetrics: async (mode = "background", outletId) => {
    if (!selectUserCapabilities().monitoring) return;
    if (get().isFetchInFlight && mode !== "realtime") return;
    const requestId = get().activeRequestId + 1;
    const targetOutletId = typeof outletId === "number" && outletId >= 1 ? outletId : get().activeOutletId;
    const isInitial = mode === "initial";
    const isOutletSwitch = mode === "outlet-switch";
    set((state) => ({
      activeRequestId: requestId,
      activeOutletId: targetOutletId ?? null,
      isFetchInFlight: true,
      error: null,
      initialLoading: isInitial,
      switchingOutlet: isOutletSwitch,
      backgroundRefreshing: mode === "background" && !state.initialLoading && !state.switchingOutlet,
      realtimeRefreshing: mode === "realtime",
      isLoading: isInitial || isOutletSwitch,
    }));
    try {
      const metrics = await getOperationalMetrics(targetOutletId);
      set((state) => {
        if (state.activeRequestId !== requestId) return state;
        return {
          metrics,
          lastSyncAt: new Date().toISOString(),
          lastSuccessfulSyncAt: new Date().toISOString(),
        };
      });
    } catch (error) {
      if (error instanceof ApiHttpError && error.status === 403) {
        set({
          isLoading: false,
          isFetchInFlight: false,
          initialLoading: false,
          switchingOutlet: false,
          backgroundRefreshing: false,
          realtimeRefreshing: false,
        });
        return;
      }
      set((state) => {
        if (state.activeRequestId !== requestId) return state;
        return { error: error instanceof Error ? error.message : "Failed to load operational metrics" };
      });
    } finally {
      set((state) => {
        if (state.activeRequestId !== requestId) return state;
        return {
          isLoading: false,
          isFetchInFlight: false,
          initialLoading: false,
          switchingOutlet: false,
          backgroundRefreshing: false,
          realtimeRefreshing: false,
        };
      });
    }
  },

  startRealtime: () => {
    if (!selectUserCapabilities().monitoring) return;
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
            qrQueue:
              payload.qrQueue !== undefined
                ? normalizeQrQueueMetrics(payload.qrQueue)
                : state.metrics.qrQueue,
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
        set({ realtimeRefreshing: true });
        queueMicrotask(() => set({ realtimeRefreshing: false }));
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

  startMonitoring: async (intervalMs = 5000, outletId = null) => {
    if (!selectUserCapabilities().monitoring) return;
    get().stopMonitoring();
    set({ activeOutletId: outletId });
    get().startRealtime();
    await get().fetchMetrics(get().lastSuccessfulSyncAt ? "outlet-switch" : "initial", outletId);
    const timer = setInterval(() => {
      void get().fetchMetrics("background", get().activeOutletId);
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
      initialLoading: false,
      switchingOutlet: false,
      backgroundRefreshing: false,
      realtimeRefreshing: false,
      error: null,
      lastSyncAt: null,
      lastSuccessfulSyncAt: null,
      activeOutletId: null,
      activeRequestId: 0,
      isFetchInFlight: false,
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
