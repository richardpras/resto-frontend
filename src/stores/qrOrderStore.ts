import { create } from "zustand";
import {
  ApiHttpError,
  createObservabilityHeaders,
  type RequestObservabilityMetadata,
} from "@/lib/api-integration/client";
import {
  confirmQrOrder as apiConfirmQrOrder,
  createQrOrder as apiCreateQrOrder,
  listQrOrdersWithMeta as apiListQrOrdersWithMeta,
  rejectQrOrder as apiRejectQrOrder,
  type CreateQrOrderPayload,
  type ListQrOrdersMeta,
  type ListQrOrdersParams,
  type QrOrderRequestApi,
  type QrOrderRequestStatus,
} from "@/lib/api-integration/qrOrderEndpoints";
import {
  getRealtimeAdapter,
  type RealtimeConnectionState,
  type RealtimeEnvelope,
} from "@/domain/realtimeAdapter";

export type QrOrderRequest = {
  id: string;
  requestCode: string;
  outletId: number;
  tableId: number;
  tableName: string;
  customerName: string;
  status: QrOrderRequestStatus;
  expiresAt: Date | null;
  confirmedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string;
  orderId: number | null;
  items: {
    id: string;
    menuItemId: number;
    qty: number;
    notes: string;
  }[];
  createdAt: Date;
};

export function qrOrderApiToStore(model: QrOrderRequestApi): QrOrderRequest {
  return {
    id: String(model.id),
    requestCode: model.requestCode,
    outletId: model.outletId,
    tableId: model.tableId,
    tableName: model.tableName,
    customerName: model.customerName ?? "",
    status: model.status,
    expiresAt: model.expiresAt ? new Date(model.expiresAt) : null,
    confirmedAt: model.confirmedAt ? new Date(model.confirmedAt) : null,
    rejectedAt: model.rejectedAt ? new Date(model.rejectedAt) : null,
    rejectionReason: model.rejectionReason ?? "",
    orderId: model.orderId ?? null,
    items: model.items.map((item) => ({
      id: String(item.id),
      menuItemId: item.menuItemId,
      qty: item.qty,
      notes: item.notes ?? "",
    })),
    createdAt: new Date(model.createdAt),
  };
}

function mapApiError(error: unknown): string {
  if (error instanceof ApiHttpError) return error.message;
  if (error instanceof Error) return error.message;
  return "QR order request failed";
}

function upsertRequest(rows: QrOrderRequest[], next: QrOrderRequest): QrOrderRequest[] {
  const index = rows.findIndex((row) => row.id === next.id);
  if (index < 0) return [next, ...rows];
  const copy = rows.slice();
  copy[index] = next;
  return copy;
}

function extractRealtimeSeq(event: RealtimeEnvelope): number {
  return event.sequence ?? event.seq ?? event.version ?? 0;
}

type QrOrderStore = {
  requests: QrOrderRequest[];
  isLoading: boolean;
  initialLoading: boolean;
  backgroundRefreshing: boolean;
  hasLoadedOnce: boolean;
  isSubmitting: boolean;
  error: string | null;
  pagination: ListQrOrdersMeta | null;
  lastSyncAt: string | null;
  lastListParams: ListQrOrdersParams | null;
  pollingMs: number;
  pollingTimer: ReturnType<typeof setInterval> | null;
  activeRequestId: number;
  activeAbortController: AbortController | null;
  lastRequestMeta: RequestObservabilityMetadata | null;
  realtimeConnected: boolean;
  realtimeState: RealtimeConnectionState;
  realtimeTransport: "polling" | "websocket";
  lastRealtimeMeta: Record<string, unknown> | null;
  lastRealtimeSeq: number;
  realtimeUnsubscribe: (() => void) | null;
  realtimeConnectionUnsubscribe: (() => void) | null;
  fetchRequests: (
    params?: ListQrOrdersParams,
    options?: { mode?: "initial" | "background" },
  ) => Promise<QrOrderRequest[]>;
  revalidateRequests: () => Promise<QrOrderRequest[] | null>;
  createRequest: (payload: CreateQrOrderPayload) => Promise<QrOrderRequest>;
  confirmRequest: (id: string) => Promise<QrOrderRequest>;
  rejectRequest: (id: string, reason?: string) => Promise<QrOrderRequest>;
  startRealtime: () => void;
  stopRealtime: () => void;
  startPolling: (params: ListQrOrdersParams, intervalMs?: number) => void;
  stopPolling: () => void;
  resetAsync: () => void;
};

export const useQrOrderStore = create<QrOrderStore>((set, get) => ({
  requests: [],
  isLoading: false,
  initialLoading: false,
  backgroundRefreshing: false,
  hasLoadedOnce: false,
  isSubmitting: false,
  error: null,
  pagination: null,
  lastSyncAt: null,
  lastListParams: null,
  pollingMs: 10000,
  pollingTimer: null,
  activeRequestId: 0,
  activeAbortController: null,
  lastRequestMeta: null,
  realtimeConnected: false,
  realtimeState: "idle",
  realtimeTransport: "polling",
  lastRealtimeMeta: null,
  lastRealtimeSeq: 0,
  realtimeUnsubscribe: null,
  realtimeConnectionUnsubscribe: null,

  fetchRequests: async (params, options = {}) => {
    const requestId = get().activeRequestId + 1;
    const mode = options.mode ?? "initial";
    const isInitialLike = mode === "initial" && !get().hasLoadedOnce;
    const controller = new AbortController();
    const requestMeta: RequestObservabilityMetadata = {
      scope: "qr-order-store",
      action: "fetch-requests",
      requestId,
    };
    set({
      isLoading: isInitialLike,
      initialLoading: isInitialLike,
      backgroundRefreshing: mode === "background" || !isInitialLike,
      error: null,
      lastListParams: params ?? null,
      activeRequestId: requestId,
      activeAbortController: controller,
      lastRequestMeta: requestMeta,
    });
    try {
      const response = await apiListQrOrdersWithMeta(params, {
        signal: controller.signal,
        headers: createObservabilityHeaders(requestMeta),
      });
      const mapped = response.requests.map(qrOrderApiToStore);
      if (get().activeRequestId !== requestId) return mapped;
      set({
        requests: mapped,
        pagination: response.meta,
        lastSyncAt: new Date().toISOString(),
        hasLoadedOnce: true,
      });
      return mapped;
    } catch (error) {
      const message = mapApiError(error);
      set({ error: message });
      throw error;
    } finally {
      if (get().activeRequestId === requestId) {
        set({
          isLoading: false,
          initialLoading: false,
          backgroundRefreshing: false,
          activeAbortController: null,
        });
      }
    }
  },

  revalidateRequests: async () => {
    const params = get().lastListParams;
    if (params === null) return null;
    return get().fetchRequests(params, { mode: "background" });
  },

  createRequest: async (payload) => {
    const requestId = get().activeRequestId + 1;
    const controller = new AbortController();
    const requestMeta: RequestObservabilityMetadata = {
      scope: "qr-order-store",
      action: "create-request",
      requestId,
    };
    set({
      isSubmitting: true,
      error: null,
      activeRequestId: requestId,
      activeAbortController: controller,
      lastRequestMeta: requestMeta,
    });
    try {
      const created = qrOrderApiToStore(
        await apiCreateQrOrder(payload, {
          signal: controller.signal,
          headers: createObservabilityHeaders(requestMeta),
        }),
      );
      if (get().activeRequestId !== requestId) return created;
      set((state) => ({
        requests: upsertRequest(state.requests, created),
        lastSyncAt: new Date().toISOString(),
      }));
      return created;
    } catch (error) {
      const message = mapApiError(error);
      set({ error: message });
      throw error;
    } finally {
      if (get().activeRequestId === requestId) {
        set({ isSubmitting: false, activeAbortController: null });
      }
    }
  },

  confirmRequest: async (id) => {
    const requestId = get().activeRequestId + 1;
    const controller = new AbortController();
    const requestMeta: RequestObservabilityMetadata = {
      scope: "qr-order-store",
      action: "confirm-request",
      requestId,
      recovery: true,
    };
    set({
      isSubmitting: true,
      error: null,
      activeRequestId: requestId,
      activeAbortController: controller,
      lastRequestMeta: requestMeta,
    });
    try {
      const updated = qrOrderApiToStore(
        await apiConfirmQrOrder(id, {
          signal: controller.signal,
          headers: createObservabilityHeaders(requestMeta),
        }),
      );
      if (get().activeRequestId !== requestId) return updated;
      set((state) => ({
        requests: upsertRequest(state.requests, updated),
        lastSyncAt: new Date().toISOString(),
      }));
      return updated;
    } catch (error) {
      const message = mapApiError(error);
      set({ error: message });
      throw error;
    } finally {
      if (get().activeRequestId === requestId) {
        set({ isSubmitting: false, activeAbortController: null });
      }
    }
  },

  rejectRequest: async (id, reason) => {
    const requestId = get().activeRequestId + 1;
    const controller = new AbortController();
    const requestMeta: RequestObservabilityMetadata = {
      scope: "qr-order-store",
      action: "reject-request",
      requestId,
      recovery: true,
    };
    set({
      isSubmitting: true,
      error: null,
      activeRequestId: requestId,
      activeAbortController: controller,
      lastRequestMeta: requestMeta,
    });
    try {
      const updated = qrOrderApiToStore(
        await apiRejectQrOrder(id, reason ? { reason } : undefined, {
          signal: controller.signal,
          headers: createObservabilityHeaders(requestMeta),
        }),
      );
      if (get().activeRequestId !== requestId) return updated;
      set((state) => ({
        requests: upsertRequest(state.requests, updated),
        lastSyncAt: new Date().toISOString(),
      }));
      return updated;
    } catch (error) {
      const message = mapApiError(error);
      set({ error: message });
      throw error;
    } finally {
      if (get().activeRequestId === requestId) {
        set({ isSubmitting: false, activeAbortController: null });
      }
    }
  },

  startRealtime: () => {
    if (get().realtimeUnsubscribe) return;
    const adapter = getRealtimeAdapter("qr");
    const connectionUnsubscribe = adapter.onConnectionStateChange((state) => {
      set({
        realtimeState: state,
        realtimeConnected: state === "connected",
        realtimeTransport: state === "connected" ? "websocket" : "polling",
      });
    });
    const unsubscribe = adapter.subscribe({
      channel: "qr",
      onEvent: (event) => {
        const payload = (event.payload ?? event.data) as Partial<QrOrderRequest> | undefined;
        if (!payload || payload.id == null) return;
        const incomingSeq = extractRealtimeSeq(event);
        const state = get();
        if (incomingSeq > 0 && incomingSeq <= state.lastRealtimeSeq) return;
        set((current) => ({
          requests: upsertRequest(current.requests, {
            ...(current.requests.find((r) => r.id === String(payload.id)) ?? ({} as QrOrderRequest)),
            ...(payload as QrOrderRequest),
            id: String(payload.id),
          }),
          lastSyncAt: new Date().toISOString(),
          lastRealtimeMeta: event.meta ?? null,
          lastRealtimeSeq: incomingSeq > 0 ? incomingSeq : current.lastRealtimeSeq,
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
      realtimeConnected: false,
      realtimeState: "disconnected",
      realtimeTransport: "polling",
      lastRealtimeMeta: null,
      lastRealtimeSeq: 0,
    });
  },

  startPolling: (params, intervalMs = 10000) => {
    const state = get();
    if (state.pollingTimer) clearInterval(state.pollingTimer);
    set({ pollingMs: intervalMs, lastListParams: params });
    get().startRealtime();
    void get().fetchRequests(params, { mode: "initial" });
    const timer = setInterval(() => {
      void get().fetchRequests(params, { mode: "background" });
    }, intervalMs);
    set({ pollingTimer: timer });
  },

  stopPolling: () => {
    const { pollingTimer, activeAbortController } = get();
    const timer = pollingTimer;
    if (timer) clearInterval(timer);
    activeAbortController?.abort();
    set({
      pollingTimer: null,
      activeAbortController: null,
      activeRequestId: get().activeRequestId + 1,
      lastRequestMeta: null,
    });
  },

  resetAsync: () => {
    get().stopRealtime();
    get().stopPolling();
    set({
      isLoading: false,
      initialLoading: false,
      backgroundRefreshing: false,
      hasLoadedOnce: false,
      isSubmitting: false,
      error: null,
      pagination: null,
      lastSyncAt: null,
      lastListParams: null,
      activeAbortController: null,
      lastRequestMeta: null,
      realtimeConnected: false,
      realtimeState: "idle",
      realtimeTransport: "polling",
      lastRealtimeMeta: null,
      lastRealtimeSeq: 0,
    });
  },
}));
