import { create } from "zustand";
import {
  ApiHttpError,
  createObservabilityHeaders,
  getApiAccessToken,
  type RequestObservabilityMetadata,
} from "@/lib/api-integration/client";
import { createVisibilityAwareInterval } from "@/lib/pollingVisibility";
import {
  listFloorTables,
  resolveLegacyTableQr,
  resolveTableQrPublicId,
  type QrResolvedTableApi,
} from "@/lib/api-integration/tableEndpoints";
import { getGuestSessionToken } from "@/lib/qrOrderSession";
import {
  callQrOrderCashier as apiCallQrOrderCashier,
  confirmQrOrder as apiConfirmQrOrder,
  createQrOrder as apiCreateQrOrder,
  getQrOrderPendingSummary as apiGetQrOrderPendingSummary,
  listQrOrdersWithMeta as apiListQrOrdersWithMeta,
  rejectQrOrder as apiRejectQrOrder,
  type ConfirmQrOrderPayload,
  type CreateQrOrderPayload,
  type ListQrOrdersMeta,
  type ListQrOrdersParams,
  type QrOrderPendingSummaryApi,
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
  decisionMode: "confirm_only" | "pay_and_confirm" | null;
  statusLabel: string;
  estimatedTotal: number;
  cashierCalledAt: Date | null;
  cashierCallCount: number;
  expiresAt: Date | null;
  confirmedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string;
  orderId: number | null;
  linkedOrder: {
    id: number;
    orderNo: string;
    status: string;
    paymentStatus: string;
    total: number;
  } | null;
  items: {
    id: string;
    menuItemId: number;
    name: string;
    qty: number;
    notes: string;
  }[];
  createdAt: Date;
};

export type QrOrderPendingSummaryEntry = {
  id: string;
  requestCode: string;
  outletId: number;
  tableId: number;
  tableName: string;
  customerName: string;
  cashierCallCount: number;
  cashierCalledAt: Date | null;
  createdAt: Date;
};

export type QrOrderPendingSummary = {
  count: number;
  ids: string[];
  entries: QrOrderPendingSummaryEntry[];
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
    decisionMode: model.decisionMode ?? null,
    statusLabel: model.statusLabel ?? model.status,
    estimatedTotal: model.estimatedTotal ?? 0,
    cashierCalledAt: model.cashierCalledAt ? new Date(model.cashierCalledAt) : null,
    cashierCallCount: model.cashierCallCount ?? 0,
    expiresAt: model.expiresAt ? new Date(model.expiresAt) : null,
    confirmedAt: model.confirmedAt ? new Date(model.confirmedAt) : null,
    rejectedAt: model.rejectedAt ? new Date(model.rejectedAt) : null,
    rejectionReason: model.rejectionReason ?? "",
    orderId: model.orderId ?? null,
    linkedOrder: model.linkedOrder ?? null,
    items: model.items.map((item) => ({
      id: String(item.id),
      menuItemId: item.menuItemId,
      name: item.name?.trim() ? item.name : "Unknown item",
      qty: item.qty,
      notes: item.notes ?? "",
    })),
    createdAt: new Date(model.createdAt),
  };
}

export function pendingSummaryApiToStore(model: QrOrderPendingSummaryApi): QrOrderPendingSummary {
  return {
    count: model.count,
    ids: model.ids.map((id) => String(id)),
    entries: model.entries.map((entry) => ({
      id: String(entry.id),
      requestCode: entry.requestCode,
      outletId: entry.outletId,
      tableId: entry.tableId,
      tableName: entry.tableName ?? "",
      customerName: entry.customerName ?? "",
      cashierCallCount: entry.cashierCallCount ?? 0,
      cashierCalledAt: entry.cashierCalledAt ? new Date(entry.cashierCalledAt) : null,
      createdAt: new Date(entry.createdAt),
    })),
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
  const metaSeq =
    event.meta && typeof event.meta.sequence === "number" ? (event.meta.sequence as number) : undefined;
  return event.sequence ?? event.seq ?? metaSeq ?? event.version ?? 0;
}

function sameQrListParams(a: ListQrOrdersParams | null, b: ListQrOrdersParams): boolean {
  if (a === null) return false;
  return (
    a.outletId === b.outletId &&
    a.status === b.status &&
    (a.perPage ?? 20) === (b.perPage ?? 20) &&
    (a.page ?? 1) === (b.page ?? 1)
  );
}

function normalizeRealtimePayload(payload: Record<string, unknown>): Partial<QrOrderRequest> | null {
  const id = payload.id ?? payload.request_id;
  if (id == null) return null;
  const normalized: Partial<QrOrderRequest> = {
    id: String(id),
  };
  if (typeof payload.requestCode === "string") normalized.requestCode = payload.requestCode;
  if (typeof payload.request_code === "string") normalized.requestCode = payload.request_code;
  if (typeof payload.tableId === "number") normalized.tableId = payload.tableId;
  if (typeof payload.table_id === "number") normalized.tableId = payload.table_id;
  if (typeof payload.cashierCallCount === "number") normalized.cashierCallCount = payload.cashierCallCount;
  if (typeof payload.cashier_call_count === "number") normalized.cashierCallCount = payload.cashier_call_count;
  if (typeof payload.cashierCalledAt === "string") normalized.cashierCalledAt = new Date(payload.cashierCalledAt);
  if (typeof payload.cashier_called_at === "string") normalized.cashierCalledAt = new Date(payload.cashier_called_at);
  if (typeof payload.status === "string") normalized.status = payload.status as QrOrderRequestStatus;
  if (typeof payload.statusLabel === "string") normalized.statusLabel = payload.statusLabel;
  if (typeof payload.status_label === "string") normalized.statusLabel = payload.status_label;
  return normalized;
}

export type QrTableOperationalStatus =
  | "unknown"
  | "available"
  | "occupied"
  | "reserved"
  | "cleaning"
  | "disabled";

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
  pollingVisibilityCleanup: (() => void) | null;
  activeRequestId: number;
  activeAbortController: AbortController | null;
  fetchInFlight: boolean;
  lastRequestMeta: RequestObservabilityMetadata | null;
  realtimeConnected: boolean;
  realtimeState: RealtimeConnectionState;
  realtimeTransport: "polling" | "websocket";
  lastRealtimeMeta: Record<string, unknown> | null;
  lastRealtimeSeq: number;
  realtimeUnsubscribe: (() => void) | null;
  realtimeConnectionUnsubscribe: (() => void) | null;
  pendingSummary: QrOrderPendingSummary | null;
  pendingSummaryLoadedOnce: boolean;
  pendingSummaryRefreshing: boolean;
  summaryPollingOutletId: number | null;
  summaryPollingMs: number;
  summaryPollingVisibilityCleanup: (() => void) | null;
  summaryActiveRequestId: number;
  summaryAbortController: AbortController | null;
  summaryFetchInFlight: boolean;
  fetchRequests: (
    params?: ListQrOrdersParams,
    options?: { mode?: "initial" | "background"; append?: boolean },
  ) => Promise<QrOrderRequest[]>;
  revalidateRequests: () => Promise<QrOrderRequest[] | null>;
  createRequest: (payload: CreateQrOrderPayload) => Promise<QrOrderRequest>;
  confirmRequest: (id: string, payload?: ConfirmQrOrderPayload) => Promise<QrOrderRequest>;
  callCashier: (id: string, payload: { outletId: number; tableId: number; guestSessionToken?: string; reason?: string }) => Promise<QrOrderRequest>;
  rejectRequest: (id: string, reason?: string) => Promise<QrOrderRequest>;
  startRealtime: () => void;
  stopRealtime: () => void;
  startPolling: (params: ListQrOrdersParams, intervalMs?: number) => void;
  stopPolling: () => void;
  fetchPendingSummary: (
    outletId: number,
    options?: { mode?: "initial" | "background" },
  ) => Promise<QrOrderPendingSummary | null>;
  startSummaryPolling: (outletId: number, intervalMs?: number) => void;
  stopSummaryPolling: () => void;
  hasApiAccess: () => boolean;
  resolveTableFromPublicId: (qrPublicId: string) => Promise<QrResolvedTableApi>;
  resolveLegacyTable: (outletId: number, tableId: number) => Promise<QrResolvedTableApi>;
  fetchTableOperationalStatus: (outletId: number, tableId: number) => Promise<QrTableOperationalStatus>;
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
  pollingVisibilityCleanup: null,
  activeRequestId: 0,
  activeAbortController: null,
  fetchInFlight: false,
  lastRequestMeta: null,
  realtimeConnected: false,
  realtimeState: "idle",
  realtimeTransport: "polling",
  lastRealtimeMeta: null,
  lastRealtimeSeq: 0,
  realtimeUnsubscribe: null,
  realtimeConnectionUnsubscribe: null,
  pendingSummary: null,
  pendingSummaryLoadedOnce: false,
  pendingSummaryRefreshing: false,
  summaryPollingOutletId: null,
  summaryPollingMs: 10000,
  summaryPollingVisibilityCleanup: null,
  summaryActiveRequestId: 0,
  summaryAbortController: null,
  summaryFetchInFlight: false,

  fetchRequests: async (params, options = {}) => {
    const mode = options.mode ?? "initial";
    const listParams = params ?? get().lastListParams;
    if (!listParams) return get().requests;

    const state = get();
    if (state.fetchInFlight && state.lastListParams && sameQrListParams(state.lastListParams, listParams)) {
      return state.requests;
    }

    get().activeAbortController?.abort();

    const requestId = get().activeRequestId + 1;
    const append = options.append ?? false;
    const isInitialLike = mode === "initial" && !get().hasLoadedOnce && !append;
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
      fetchInFlight: true,
      error: null,
      lastListParams: listParams,
      activeRequestId: requestId,
      activeAbortController: controller,
      lastRequestMeta: requestMeta,
    });
    try {
      const response = await apiListQrOrdersWithMeta(listParams, {
        signal: controller.signal,
        headers: createObservabilityHeaders(requestMeta),
      });
      const mapped = response.requests.map(qrOrderApiToStore);
      if (get().activeRequestId !== requestId) return mapped;
      set((state) => ({
        requests: append ? [...state.requests, ...mapped] : mapped,
        pagination: response.meta,
        lastSyncAt: new Date().toISOString(),
        hasLoadedOnce: true,
      }));
      return mapped;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return get().requests;
      }
      const message = mapApiError(error);
      set({ error: message });
      throw error;
    } finally {
      if (get().activeRequestId === requestId) {
        set({
          isLoading: false,
          initialLoading: false,
          backgroundRefreshing: false,
          fetchInFlight: false,
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

  confirmRequest: async (id, payload = {}) => {
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
        await apiConfirmQrOrder(id, payload, {
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

  callCashier: async (id, payload) => {
    const requestId = get().activeRequestId + 1;
    const controller = new AbortController();
    const requestMeta: RequestObservabilityMetadata = {
      scope: "qr-order-store",
      action: "call-cashier",
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
      const updated = qrOrderApiToStore(
        await apiCallQrOrderCashier(id, payload, {
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
        const rawPayload = (event.payload ?? event.data) as Record<string, unknown> | undefined;
        if (!rawPayload) return;
        const payload = normalizeRealtimePayload(rawPayload);
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
        const summaryOutletId = get().summaryPollingOutletId;
        if (summaryOutletId !== null) {
          void get().fetchPendingSummary(summaryOutletId, { mode: "background" });
        }
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

  fetchPendingSummary: async (outletId, options = {}) => {
    if (outletId < 1) return get().pendingSummary;

    const mode = options.mode ?? "initial";
    const state = get();
    if (state.summaryFetchInFlight && state.summaryPollingOutletId === outletId) {
      return state.pendingSummary;
    }

    get().summaryAbortController?.abort();

    const requestId = get().summaryActiveRequestId + 1;
    const controller = new AbortController();
    const requestMeta: RequestObservabilityMetadata = {
      scope: "qr-order-store",
      action: "fetch-pending-summary",
      requestId,
    };
    const isInitialLike = mode === "initial" && !get().pendingSummaryLoadedOnce;
    set({
      pendingSummaryRefreshing: !isInitialLike,
      summaryFetchInFlight: true,
      summaryPollingOutletId: outletId,
      summaryActiveRequestId: requestId,
      summaryAbortController: controller,
      lastRequestMeta: requestMeta,
    });

    try {
      const response = await apiGetQrOrderPendingSummary(outletId, {
        signal: controller.signal,
        headers: createObservabilityHeaders(requestMeta),
      });
      const mapped = pendingSummaryApiToStore(response);
      if (get().summaryActiveRequestId !== requestId) return mapped;
      set({
        pendingSummary: mapped,
        pendingSummaryLoadedOnce: true,
        lastSyncAt: new Date().toISOString(),
      });
      return mapped;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return get().pendingSummary;
      }
      const message = mapApiError(error);
      set({ error: message });
      throw error;
    } finally {
      if (get().summaryActiveRequestId === requestId) {
        set({
          pendingSummaryRefreshing: false,
          summaryFetchInFlight: false,
          summaryAbortController: null,
        });
      }
    }
  },

  startSummaryPolling: (outletId, intervalMs = 10000) => {
    const state = get();
    if (
      state.summaryPollingVisibilityCleanup &&
      state.summaryPollingOutletId === outletId &&
      state.summaryPollingMs === intervalMs
    ) {
      return;
    }
    get().stopSummaryPolling();
    set({ summaryPollingMs: intervalMs, summaryPollingOutletId: outletId });
    get().startRealtime();
    void get().fetchPendingSummary(outletId, { mode: "initial" });
    const visibilityInterval = createVisibilityAwareInterval(() => {
      void get().fetchPendingSummary(outletId, { mode: "background" });
    }, intervalMs);
    set({ summaryPollingVisibilityCleanup: visibilityInterval.clear });
  },

  stopSummaryPolling: () => {
    const { summaryPollingVisibilityCleanup, summaryAbortController } = get();
    if (summaryPollingVisibilityCleanup) {
      summaryPollingVisibilityCleanup();
    }
    summaryAbortController?.abort();
    get().stopRealtime();
    set({
      summaryPollingVisibilityCleanup: null,
      summaryPollingOutletId: null,
      summaryAbortController: null,
      summaryActiveRequestId: get().summaryActiveRequestId + 1,
      summaryFetchInFlight: false,
    });
  },

  startPolling: (params, intervalMs = 10000) => {
    const state = get();
    if (
      state.pollingVisibilityCleanup &&
      state.lastListParams &&
      sameQrListParams(state.lastListParams, params) &&
      state.pollingMs === intervalMs
    ) {
      return;
    }
    get().stopPolling();
    set({ pollingMs: intervalMs, lastListParams: params });
    get().startRealtime();
    void get().fetchRequests(params, { mode: "initial" });
    const visibilityInterval = createVisibilityAwareInterval(() => {
      void get().fetchRequests(params, { mode: "background" });
    }, intervalMs);
    set({ pollingTimer: null, pollingVisibilityCleanup: visibilityInterval.clear });
  },

  stopPolling: () => {
    const { pollingTimer, pollingVisibilityCleanup, activeAbortController } = get();
    if (pollingVisibilityCleanup) {
      pollingVisibilityCleanup();
    }
    if (pollingTimer) clearInterval(pollingTimer);
    activeAbortController?.abort();
    set({
      pollingTimer: null,
      pollingVisibilityCleanup: null,
      activeAbortController: null,
      activeRequestId: get().activeRequestId + 1,
      fetchInFlight: false,
      lastRequestMeta: null,
    });
  },

  hasApiAccess: () => Boolean(getApiAccessToken()),

  resolveTableFromPublicId: (qrPublicId) =>
    resolveTableQrPublicId(qrPublicId, { guestSessionToken: getGuestSessionToken() }),
  resolveLegacyTable: (outletId, tableId) =>
    resolveLegacyTableQr(outletId, tableId, { guestSessionToken: getGuestSessionToken() }),

  fetchTableOperationalStatus: async (outletId, tableId) => {
    if (!getApiAccessToken() || outletId < 1 || tableId < 1) return "unknown";
    try {
      const tables = await listFloorTables(outletId);
      const table = tables.find((row) => row.id === tableId);
      if (!table) return "disabled";
      return table.tableOperationalStatus;
    } catch {
      return "unknown";
    }
  },

  resetAsync: () => {
    get().stopRealtime();
    get().stopPolling();
    get().stopSummaryPolling();
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
      pendingSummary: null,
      pendingSummaryLoadedOnce: false,
      pendingSummaryRefreshing: false,
      summaryPollingOutletId: null,
      summaryAbortController: null,
      summaryFetchInFlight: false,
    });
  },
}));
