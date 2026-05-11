import { create } from "zustand";
import { mapCrmDashboardMetrics } from "@/domain/crmAdapters";
import type { AsyncState, CrmDashboardMetrics } from "@/domain/crmTypes";
import { getRealtimeAdapter, type RealtimeConnectionState, type RealtimeEnvelope } from "@/domain/realtimeAdapter";
import { getCrmDashboardSnapshot } from "@/lib/api-integration/crmEndpoints";
import { ApiHttpError } from "@/lib/api-integration/client";
import { selectUserCapabilities } from "@/domain/accessControl";

const EMPTY_METRICS: CrmDashboardMetrics = {
  outletId: 0,
  customerCount: 0,
  activeLoyaltyMembers: 0,
  pointsIssued: 0,
  pointsRedeemed: 0,
  redemptionCount: 0,
  giftCardOutstandingValue: 0,
  pendingGiftCardSettlements: 0,
  updatedAt: null,
};
const REALTIME_REFRESH_COOLDOWN_MS = 5000;

function extractRealtimeSeq(event: RealtimeEnvelope): number {
  return event.sequence ?? event.seq ?? event.version ?? 0;
}

type CrmDashboardStore = {
  outletId: number | null;
  metrics: CrmDashboardMetrics;
  lifecycle: AsyncState;
  error: string | null;
  lastSyncAt: string | null;
  pollTimer: ReturnType<typeof setInterval> | null;
  pollingActive: boolean;
  realtimeState: RealtimeConnectionState;
  realtimeTransport: "polling" | "websocket";
  lastRealtimeSeq: number;
  lastRealtimeRefreshAt: number;
  realtimeRefreshInFlight: boolean;
  realtimeUnsubscribe: (() => void) | null;
  realtimeConnectionUnsubscribe: (() => void) | null;
  refreshForOutlet: (outletId: number | null) => Promise<void>;
  startRealtime: () => void;
  stopRealtime: () => void;
  startPollingFallback: (intervalMs?: number) => void;
  stopPollingFallback: () => void;
  reset: () => void;
};

export const useCrmDashboardStore = create<CrmDashboardStore>((set, get) => ({
  outletId: null,
  metrics: EMPTY_METRICS,
  lifecycle: "idle",
  error: null,
  lastSyncAt: null,
  pollTimer: null,
  pollingActive: false,
  realtimeState: "idle",
  realtimeTransport: "polling",
  lastRealtimeSeq: 0,
  lastRealtimeRefreshAt: 0,
  realtimeRefreshInFlight: false,
  realtimeUnsubscribe: null,
  realtimeConnectionUnsubscribe: null,

  refreshForOutlet: async (outletId) => {
    if (!selectUserCapabilities().crm) return;
    if (!outletId || outletId < 1) {
      set({ outletId: null, metrics: EMPTY_METRICS, lifecycle: "success", error: null });
      return;
    }
    set({ lifecycle: "loading", error: null, outletId });
    try {
      const row = await getCrmDashboardSnapshot(outletId);
      set({
        metrics: mapCrmDashboardMetrics(row, outletId),
        lifecycle: "success",
        error: null,
        lastSyncAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof ApiHttpError && error.status === 403) {
        set({ lifecycle: "success" });
        return;
      }
      set({
        lifecycle: "error",
        error: error instanceof Error ? error.message : "Failed to fetch CRM dashboard",
      });
    }
  },

  startRealtime: () => {
    if (!selectUserCapabilities().crm) return;
    if (get().realtimeUnsubscribe) return;
    const adapter = getRealtimeAdapter("crm-dashboard");
    const connectionUnsubscribe = adapter.onConnectionStateChange((state) => {
      set({
        realtimeState: state,
        realtimeTransport: state === "connected" ? "websocket" : "polling",
      });
    });
    const unsubscribe = adapter.subscribe({
      channel: "crm-dashboard",
      onEvent: (event) => {
        const payload = (event.payload ?? event.data) as Record<string, unknown> | undefined;
        if (!payload || !get().outletId) return;
        const incomingSeq = extractRealtimeSeq(event);
        if (incomingSeq > 0 && incomingSeq <= get().lastRealtimeSeq) return;
        const eventOutletId = Number(payload.outletId ?? payload.outlet_id ?? get().outletId);
        if (eventOutletId !== get().outletId) return;
        const state = get();
        const now = Date.now();
        const isCooldown = now - state.lastRealtimeRefreshAt < REALTIME_REFRESH_COOLDOWN_MS;
        set((state) => ({
          metrics: {
            ...state.metrics,
            ...mapCrmDashboardMetrics(payload, eventOutletId),
          },
          lastRealtimeSeq: incomingSeq > 0 ? incomingSeq : state.lastRealtimeSeq,
          lastSyncAt: new Date().toISOString(),
        }));
        if (state.realtimeRefreshInFlight || isCooldown) return;
        set({ realtimeRefreshInFlight: true, lastRealtimeRefreshAt: now });
        void get().refreshForOutlet(eventOutletId).finally(() => {
          set({ realtimeRefreshInFlight: false });
        });
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
      lastRealtimeRefreshAt: 0,
      realtimeRefreshInFlight: false,
    });
  },

  startPollingFallback: (intervalMs = 15000) => {
    if (!selectUserCapabilities().crm) return;
    if (get().pollTimer) return;
    const timer = setInterval(() => {
      if (get().realtimeState === "connected") return;
      void get().refreshForOutlet(get().outletId);
    }, intervalMs);
    set({ pollTimer: timer, pollingActive: true });
  },

  stopPollingFallback: () => {
    if (get().pollTimer) clearInterval(get().pollTimer);
    set({ pollTimer: null, pollingActive: false });
  },

  reset: () => {
    get().stopPollingFallback();
    get().stopRealtime();
    set({
      outletId: null,
      metrics: EMPTY_METRICS,
      lifecycle: "idle",
      error: null,
      lastSyncAt: null,
      lastRealtimeRefreshAt: 0,
      realtimeRefreshInFlight: false,
    });
  },
}));
