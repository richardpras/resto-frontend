import { create } from "zustand";
import { mapLoyaltyRedemption, mapLoyaltyTier, mapPaginationMeta, mapPointsLedgerEntry } from "@/domain/crmAdapters";
import type {
  AsyncState,
  LoyaltyPointsLedgerEntry,
  LoyaltyRedemption,
  LoyaltyTier,
  PaginationMeta,
  RedemptionQueueItem,
} from "@/domain/crmTypes";
import { getRealtimeAdapter, type RealtimeConnectionState, type RealtimeEnvelope } from "@/domain/realtimeAdapter";
import {
  listLoyaltyRedemptions,
  listLoyaltyTiers,
  listPointsLedger,
  redeemLoyaltyPoints,
} from "@/lib/api-integration/crmEndpoints";
import { ApiHttpError } from "@/lib/api-integration/client";
import { selectUserCapabilities } from "@/domain/accessControl";

const EMPTY_META: PaginationMeta = { currentPage: 1, perPage: 20, total: 0, lastPage: 1 };
const REALTIME_REFRESH_COOLDOWN_MS = 5000;

function extractRealtimeSeq(event: RealtimeEnvelope): number {
  return event.sequence ?? event.seq ?? event.version ?? 0;
}

function queueId(): string {
  return `rq-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type LoyaltyStoreState = {
  outletId: number | null;
  tiers: LoyaltyTier[];
  pointsLedger: LoyaltyPointsLedgerEntry[];
  redemptions: LoyaltyRedemption[];
  pointsLedgerMeta: PaginationMeta;
  redemptionsMeta: PaginationMeta;
  pointsBalanceByCustomer: Record<string, number>;
  redemptionQueue: RedemptionQueueItem[];
  lifecycle: AsyncState;
  processingQueue: boolean;
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
  fetchPointsLedger: (params?: { customerId?: string; page?: number; perPage?: number }) => Promise<void>;
  fetchRedemptions: (params?: { customerId?: string; page?: number; perPage?: number }) => Promise<void>;
  enqueueRedemption: (payload: {
    customerId: string;
    pointsUsed: number;
    amountValue: number;
    replayFingerprint: string;
  }) => Promise<void>;
  processRedemptionQueue: () => Promise<void>;
  retryQueuedRedemption: (queueItemId: string) => Promise<void>;
  startRealtime: () => void;
  stopRealtime: () => void;
  startPollingFallback: (intervalMs?: number) => void;
  stopPollingFallback: () => void;
  reset: () => void;
};

export const useLoyaltyStore = create<LoyaltyStoreState>((set, get) => ({
  outletId: null,
  tiers: [],
  pointsLedger: [],
  redemptions: [],
  pointsLedgerMeta: EMPTY_META,
  redemptionsMeta: EMPTY_META,
  pointsBalanceByCustomer: {},
  redemptionQueue: [],
  lifecycle: "idle",
  processingQueue: false,
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
      set({
        outletId: null,
        tiers: [],
        pointsLedger: [],
        redemptions: [],
        pointsLedgerMeta: EMPTY_META,
        redemptionsMeta: EMPTY_META,
        lifecycle: "success",
      });
      return;
    }
    set({ lifecycle: "loading", outletId, error: null });
    try {
      const [tiersRows, pointsLedgerResult, redemptionsResult] = await Promise.all([
        listLoyaltyTiers(outletId),
        listPointsLedger({ outletId, page: 1, perPage: get().pointsLedgerMeta.perPage || 20 }),
        listLoyaltyRedemptions({ outletId, page: 1, perPage: get().redemptionsMeta.perPage || 20 }),
      ]);
      const pointsLedger = pointsLedgerResult.rows.map(mapPointsLedgerEntry);
      const balances = pointsLedger.reduce<Record<string, number>>((acc, row) => {
        acc[row.customerId] = (acc[row.customerId] ?? 0) + row.deltaPoints;
        return acc;
      }, {});
      set({
        tiers: tiersRows.map(mapLoyaltyTier),
        pointsLedger,
        redemptions: redemptionsResult.rows.map(mapLoyaltyRedemption),
        pointsLedgerMeta: mapPaginationMeta(pointsLedgerResult.meta),
        redemptionsMeta: mapPaginationMeta(redemptionsResult.meta),
        pointsBalanceByCustomer: balances,
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
        error: error instanceof Error ? error.message : "Failed to refresh loyalty data",
      });
    }
  },

  fetchPointsLedger: async (params = {}) => {
    const outletId = get().outletId;
    if (!outletId) return;
    const response = await listPointsLedger({
      outletId,
      customerId: params.customerId,
      page: params.page ?? get().pointsLedgerMeta.currentPage,
      perPage: params.perPage ?? get().pointsLedgerMeta.perPage,
    });
    const pointsLedger = response.rows.map(mapPointsLedgerEntry);
    const balances = pointsLedger.reduce<Record<string, number>>((acc, row) => {
      acc[row.customerId] = (acc[row.customerId] ?? 0) + row.deltaPoints;
      return acc;
    }, {});
    set({
      pointsLedger,
      pointsLedgerMeta: mapPaginationMeta(response.meta),
      pointsBalanceByCustomer: balances,
      lastSyncAt: new Date().toISOString(),
    });
  },

  fetchRedemptions: async (params = {}) => {
    const outletId = get().outletId;
    if (!outletId) return;
    const response = await listLoyaltyRedemptions({
      outletId,
      customerId: params.customerId,
      page: params.page ?? get().redemptionsMeta.currentPage,
      perPage: params.perPage ?? get().redemptionsMeta.perPage,
    });
    set({
      redemptions: response.rows.map(mapLoyaltyRedemption),
      redemptionsMeta: mapPaginationMeta(response.meta),
      lastSyncAt: new Date().toISOString(),
    });
  },

  enqueueRedemption: async ({ customerId, pointsUsed, amountValue, replayFingerprint }) => {
    const outletId = get().outletId;
    if (!outletId || outletId < 1) throw new Error("Outlet context is required");
    set((state) => ({
      redemptionQueue: [
        ...state.redemptionQueue.filter((item) => item.replayFingerprint !== replayFingerprint),
        {
          id: queueId(),
          customerId,
          outletId,
          pointsUsed,
          amountValue,
          replayFingerprint,
          status: "pending",
          retryCount: 0,
          lastError: null,
          createdAt: new Date().toISOString(),
          lastAttemptAt: null,
        },
      ],
      pointsBalanceByCustomer: {
        ...state.pointsBalanceByCustomer,
        [customerId]: (state.pointsBalanceByCustomer[customerId] ?? 0) - pointsUsed,
      },
    }));
    await get().processRedemptionQueue();
  },

  processRedemptionQueue: async () => {
    if (get().processingQueue) return;
    set({ processingQueue: true, error: null });
    try {
      for (const queueItem of get().redemptionQueue) {
        if (queueItem.status === "applied" || queueItem.status === "duplicate") continue;
        set((state) => ({
          redemptionQueue: state.redemptionQueue.map((item) =>
            item.id === queueItem.id
              ? {
                  ...item,
                  status: item.retryCount > 0 ? "retrying" : "pending",
                  retryCount: item.retryCount + 1,
                  lastAttemptAt: new Date().toISOString(),
                }
              : item,
          ),
        }));
        try {
          const row = await redeemLoyaltyPoints({
            outletId: queueItem.outletId,
            customerId: queueItem.customerId,
            pointsUsed: queueItem.pointsUsed,
            amountValue: queueItem.amountValue,
            replayFingerprint: queueItem.replayFingerprint,
          });
          const mapped = mapLoyaltyRedemption(row);
          const status = mapped.status === "duplicate" ? "duplicate" : "applied";
          set((state) => ({
            redemptions: [mapped, ...state.redemptions],
            redemptionQueue: state.redemptionQueue.map((item) =>
              item.id === queueItem.id ? { ...item, status, lastError: null } : item,
            ),
          }));
          await get().fetchPointsLedger({ page: 1, perPage: get().pointsLedgerMeta.perPage || 20 });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Redemption replay failed";
          set((state) => ({
            redemptionQueue: state.redemptionQueue.map((item) =>
              item.id === queueItem.id
                ? {
                    ...item,
                    status: "failed",
                    lastError: message,
                  }
                : item,
            ),
            pointsBalanceByCustomer: {
              ...state.pointsBalanceByCustomer,
              [queueItem.customerId]:
                (state.pointsBalanceByCustomer[queueItem.customerId] ?? 0) + queueItem.pointsUsed,
            },
            error: message,
          }));
        }
      }
      set((state) => ({
        redemptionQueue: state.redemptionQueue.filter((item) => item.status !== "applied" && item.status !== "duplicate"),
      }));
    } finally {
      set({ processingQueue: false, lastSyncAt: new Date().toISOString() });
    }
  },

  retryQueuedRedemption: async (queueItemId) => {
    set((state) => ({
      redemptionQueue: state.redemptionQueue.map((item) =>
        item.id === queueItemId ? { ...item, status: "retrying", lastError: null } : item,
      ),
    }));
    await get().processRedemptionQueue();
  },

  startRealtime: () => {
    if (!selectUserCapabilities().crm) return;
    if (get().realtimeUnsubscribe) return;
    const adapter = getRealtimeAdapter("crm-loyalty");
    const connectionUnsubscribe = adapter.onConnectionStateChange((state) => {
      set({
        realtimeState: state,
        realtimeTransport: state === "connected" ? "websocket" : "polling",
      });
    });
    const unsubscribe = adapter.subscribe({
      channel: "crm-loyalty",
      onEvent: (event) => {
        const payload = (event.payload ?? event.data) as Record<string, unknown> | undefined;
        if (!payload) return;
        const incomingSeq = extractRealtimeSeq(event);
        if (incomingSeq > 0 && incomingSeq <= get().lastRealtimeSeq) return;
        const eventOutlet = Number(payload.outletId ?? payload.outlet_id ?? 0);
        if (eventOutlet > 0 && get().outletId && eventOutlet !== get().outletId) return;
        const state = get();
        const now = Date.now();
        const isCooldown = now - state.lastRealtimeRefreshAt < REALTIME_REFRESH_COOLDOWN_MS;
        set({ lastRealtimeSeq: incomingSeq > 0 ? incomingSeq : state.lastRealtimeSeq });
        if (state.realtimeRefreshInFlight || isCooldown) return;
        set({ realtimeRefreshInFlight: true, lastRealtimeRefreshAt: now });
        void Promise.all([
          get().fetchPointsLedger({ page: 1, perPage: get().pointsLedgerMeta.perPage || 20 }),
          get().fetchRedemptions({ page: 1, perPage: get().redemptionsMeta.perPage || 20 }),
        ]).finally(() => {
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

  startPollingFallback: (intervalMs = 12000) => {
    if (!selectUserCapabilities().crm) return;
    if (get().pollTimer) return;
    const timer = setInterval(() => {
      if (get().realtimeState === "connected") return;
      void get().fetchPointsLedger({ page: get().pointsLedgerMeta.currentPage, perPage: get().pointsLedgerMeta.perPage });
      void get().fetchRedemptions({ page: get().redemptionsMeta.currentPage, perPage: get().redemptionsMeta.perPage });
      void get().processRedemptionQueue();
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
      tiers: [],
      pointsLedger: [],
      redemptions: [],
      pointsLedgerMeta: EMPTY_META,
      redemptionsMeta: EMPTY_META,
      pointsBalanceByCustomer: {},
      redemptionQueue: [],
      lifecycle: "idle",
      processingQueue: false,
      error: null,
      lastSyncAt: null,
      lastRealtimeRefreshAt: 0,
      realtimeRefreshInFlight: false,
    });
  },
}));
