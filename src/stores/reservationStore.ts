import { create } from "zustand";
import { ApiHttpError } from "@/lib/api-integration/client";
import {
  listReservations,
  type ReservationApi,
} from "@/lib/api-integration/reservationEndpoints";
import {
  extractRealtimeSeq,
  getRealtimeAdapter,
  normalizeReservationRealtimePayload,
  type RealtimeConnectionState,
  type RealtimeEnvelope,
} from "@/domain/realtimeAdapter";

export type ReservationRow = ReservationApi;

type ReservationListParams = {
  outletId: number;
  status?: ReservationApi["status"];
};

type ReservationStore = {
  reservations: ReservationRow[];
  isLoading: boolean;
  backgroundRefreshing: boolean;
  error: string | null;
  lastSyncAt: string | null;
  lastListParams: ReservationListParams | null;
  pollingMs: number;
  pollingTimer: ReturnType<typeof setInterval> | null;
  realtimeConnected: boolean;
  realtimeState: RealtimeConnectionState;
  realtimeTransport: "polling" | "websocket";
  lastRealtimeMeta: Record<string, unknown> | null;
  lastRealtimeSeq: number;
  realtimeUnsubscribe: (() => void) | null;
  realtimeConnectionUnsubscribe: (() => void) | null;
  realtimeConsumerCount: number;
  tableProjectionListeners: Set<(payload: Record<string, unknown>) => void>;
  fetchReservations: (
    params: ReservationListParams,
    options?: { mode?: "initial" | "background" },
  ) => Promise<ReservationRow[]>;
  revalidateReservations: () => Promise<ReservationRow[] | null>;
  applyRealtimePatch: (payload: Record<string, unknown>) => void;
  subscribeTableProjection: (listener: (payload: Record<string, unknown>) => void) => () => void;
  acquireRealtime: (outletId: number) => void;
  releaseRealtime: () => void;
  startRealtime: () => void;
  stopRealtime: () => void;
  startPolling: (params: ReservationListParams, intervalMs?: number) => void;
  stopPolling: () => void;
  resetAsync: () => void;
};

function mapApiError(error: unknown): string {
  if (error instanceof ApiHttpError) return error.message;
  if (error instanceof Error) return error.message;
  return "Reservation sync failed";
}

function upsertReservation(rows: ReservationRow[], next: ReservationRow): ReservationRow[] {
  const index = rows.findIndex((row) => row.id === next.id);
  if (index < 0) return [next, ...rows];
  const copy = rows.slice();
  copy[index] = { ...copy[index], ...next };
  return copy;
}

function reservationPatchToRow(
  patch: NonNullable<ReturnType<typeof normalizeReservationRealtimePayload>>,
  existing?: ReservationRow,
): ReservationRow | null {
  if (existing) {
    return {
      ...existing,
      ...(patch.outletId != null ? { outletId: patch.outletId } : {}),
      ...(patch.status != null ? { status: patch.status as ReservationApi["status"] } : {}),
      ...(patch.partySize != null ? { partySize: patch.partySize } : {}),
      ...(patch.reservationAt !== undefined ? { reservationAt: patch.reservationAt ?? existing.reservationAt } : {}),
      ...(patch.linkedOrderId !== undefined ? { linkedOrderId: patch.linkedOrderId } : {}),
    };
  }

  if (
    patch.outletId == null ||
    patch.status == null ||
    patch.partySize == null ||
    patch.reservationAt == null
  ) {
    return null;
  }

  return {
    id: patch.id,
    outletId: patch.outletId,
    tableId: null,
    reservationCode: `RSV-${patch.id}`,
    customerName: "",
    customerPhone: null,
    partySize: patch.partySize,
    reservationAt: patch.reservationAt,
    checkedInAt: null,
    seatedAt: null,
    completedAt: null,
    cancelledAt: null,
    noShowAt: null,
    linkedOrderId: patch.linkedOrderId ?? null,
    serviceStartedAt: null,
    status: patch.status as ReservationApi["status"],
    createdAt: null,
    updatedAt: null,
  };
}

export const useReservationStore = create<ReservationStore>((set, get) => ({
  reservations: [],
  isLoading: false,
  backgroundRefreshing: false,
  error: null,
  lastSyncAt: null,
  lastListParams: null,
  pollingMs: 15000,
  pollingTimer: null,
  realtimeConnected: false,
  realtimeState: "idle",
  realtimeTransport: "polling",
  lastRealtimeMeta: null,
  lastRealtimeSeq: 0,
  realtimeUnsubscribe: null,
  realtimeConnectionUnsubscribe: null,
  realtimeConsumerCount: 0,
  tableProjectionListeners: new Set(),

  fetchReservations: async (params, options = { mode: "initial" }) => {
    const mode = options.mode ?? "initial";
    set({
      isLoading: mode === "initial",
      backgroundRefreshing: mode === "background",
      error: null,
      lastListParams: params,
    });
    try {
      const rows = await listReservations(params.outletId, params.status);
      set({
        reservations: rows,
        lastSyncAt: new Date().toISOString(),
      });
      return rows;
    } catch (error) {
      const message = mapApiError(error);
      set({ error: message });
      throw error;
    } finally {
      set({ isLoading: false, backgroundRefreshing: false });
    }
  },

  revalidateReservations: async () => {
    const params = get().lastListParams;
    if (params === null) return null;
    return get().fetchReservations(params, { mode: "background" });
  },

  applyRealtimePatch: (payload) => {
    const patch = normalizeReservationRealtimePayload(payload);
    if (!patch) return;

    set((state) => {
      const existing = state.reservations.find((row) => row.id === patch.id);
      const merged = reservationPatchToRow(patch, existing);
      if (!merged) return state;

      return {
        reservations: upsertReservation(state.reservations, merged),
        lastSyncAt: new Date().toISOString(),
      };
    });

    for (const listener of get().tableProjectionListeners) {
      listener(payload);
    }
  },

  subscribeTableProjection: (listener) => {
    get().tableProjectionListeners.add(listener);
    return () => {
      get().tableProjectionListeners.delete(listener);
    };
  },

  acquireRealtime: (outletId) => {
    set((state) => ({
      realtimeConsumerCount: state.realtimeConsumerCount + 1,
      lastListParams: state.lastListParams ?? { outletId },
    }));
    get().startRealtime();
  },

  releaseRealtime: () => {
    const nextCount = Math.max(0, get().realtimeConsumerCount - 1);
    set({ realtimeConsumerCount: nextCount });
    if (nextCount === 0) {
      get().stopRealtime();
    }
  },

  startRealtime: () => {
    if (get().realtimeUnsubscribe) return;
    const adapter = getRealtimeAdapter("reservation");
    const connectionUnsubscribe = adapter.onConnectionStateChange((state) => {
      set({
        realtimeState: state,
        realtimeConnected: state === "connected",
        realtimeTransport: state === "connected" ? "websocket" : "polling",
      });
      if (state === "connected") {
        void get().revalidateReservations();
      }
    });
    const unsubscribe = adapter.subscribe({
      channel: "reservation",
      onEvent: (event: RealtimeEnvelope) => {
        const rawPayload = (event.payload ?? event.data) as Record<string, unknown> | undefined;
        if (!rawPayload) return;
        const incomingSeq = extractRealtimeSeq(event);
        const state = get();
        if (incomingSeq > 0 && incomingSeq <= state.lastRealtimeSeq) return;
        set({
          lastRealtimeMeta: event.meta ?? null,
          lastRealtimeSeq: incomingSeq > 0 ? incomingSeq : state.lastRealtimeSeq,
        });
        get().applyRealtimePatch(rawPayload);
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
      realtimeConnected: false,
      realtimeState: "disconnected",
      realtimeTransport: "polling",
      lastRealtimeMeta: null,
      lastRealtimeSeq: 0,
    });
  },

  startPolling: (params, intervalMs = 15000) => {
    const state = get();
    if (state.pollingTimer) clearInterval(state.pollingTimer);
    set({ pollingMs: intervalMs, lastListParams: params });
    get().acquireRealtime(params.outletId);
    void get().fetchReservations(params, { mode: "initial" });
    const timer = setInterval(() => {
      void get().fetchReservations(params, { mode: "background" });
    }, intervalMs);
    set({ pollingTimer: timer });
  },

  stopPolling: () => {
    const timer = get().pollingTimer;
    if (timer) clearInterval(timer);
    set({ pollingTimer: null });
    get().releaseRealtime();
  },

  resetAsync: () => {
    get().stopPolling();
    get().stopRealtime();
    set({
      reservations: [],
      isLoading: false,
      backgroundRefreshing: false,
      error: null,
      lastSyncAt: null,
      lastListParams: null,
      realtimeConsumerCount: 0,
      tableProjectionListeners: new Set(),
    });
  },
}));
