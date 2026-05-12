import { create } from "zustand";
import {
  ApiHttpError,
  createObservabilityHeaders,
  type RequestObservabilityMetadata,
} from "@/lib/api-integration/client";
import {
  approveOrderItemRecovery as apiApproveOrderItemRecovery,
  getOrder as apiGetOrder,
  listOrderPosEvents as apiListOrderPosEvents,
  listOrderRecoveryEvents as apiListOrderRecoveryEvents,
  listOrdersWithMeta as apiListOrdersWithMeta,
  previewOrderItemRecoverySettlement as apiPreviewOrderItemRecoverySettlement,
  recordOrderItemRecoverySettlement as apiRecordOrderItemRecoverySettlement,
  type ListOrdersMeta,
  type ListOrdersParams,
  type OrderApi,
  type OrderItemRecoveryEventApi,
  type PosEventLogApi,
  type RecordRecoverySettlementBody,
  type RecoverySettlementPreviewBody,
  type RecoverySettlementPreviewApi,
} from "@/lib/api-integration/endpoints";
import { listReceiptRenderHistory } from "@/lib/api-integration/receiptDocumentEndpoints";
import type { ReceiptRenderHistoryRow } from "@/domain/receiptDocumentTypes";
import { useOrderPaymentHistoryStore } from "./orderPaymentHistoryStore";
import { useOutletStore } from "./outletStore";
import { useAuthStore } from "./authStore";

const TENANT_ID = Number(import.meta.env.VITE_API_TENANT_ID ?? 1) || 1;

export type OrdersExplorerFilters = Pick<
  ListOrdersParams,
  | "status"
  | "paymentStatus"
  | "source"
  | "search"
  | "dateFrom"
  | "dateTo"
  | "hasVoidedPayment"
>;

export type OrdersExplorerDetailState = {
  order: OrderApi | null;
  events: PosEventLogApi[];
  recoveryEvents: OrderItemRecoveryEventApi[];
  receipts: ReceiptRenderHistoryRow[];
  loading: boolean;
  recoveryRefreshing: boolean;
  error: string | null;
};

export function explorerDetailKey(outletId: number | null, orderId: string): string {
  return `${outletId ?? "none"}:${orderId}`;
}

function mapApiError(error: unknown): string {
  if (error instanceof ApiHttpError) return error.message;
  if (error instanceof Error) return error.message;
  return "Orders request failed";
}

function buildListParams(
  filters: OrdersExplorerFilters,
  outletId: number | null,
  page: number,
  perPage: number,
): ListOrdersParams {
  const params: ListOrdersParams = {
    tenantId: TENANT_ID,
    page,
    perPage,
  };
  if (typeof outletId === "number" && outletId >= 1) {
    params.outletId = outletId;
  }
  if (filters.status) params.status = filters.status;
  if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
  if (filters.source) params.source = filters.source;
  if (filters.search !== undefined && filters.search.trim() !== "") params.search = filters.search.trim();
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.hasVoidedPayment === true) params.hasVoidedPayment = true;
  return params;
}

type OrdersExplorerState = {
  filters: OrdersExplorerFilters;
  perPage: number;
  orders: OrderApi[];
  meta: ListOrdersMeta | null;
  initialLoading: boolean;
  backgroundRefreshing: boolean;
  listError: string | null;
  activeListRequestId: number;
  pollingTimer: ReturnType<typeof setInterval> | null;
  selectedOrderId: string | null;
  detailByKey: Record<string, OrdersExplorerDetailState>;
  detailInflight: Map<string, Promise<void>>;
  recoveryApprovalSubmitting: boolean;
  recoverySettlementSubmitting: boolean;
  setFilters: (patch: Partial<OrdersExplorerFilters>) => void;
  resetForOutletSwitch: () => void;
  fetchList: (opts?: { append?: boolean; background?: boolean }) => Promise<void>;
  loadMore: () => Promise<void>;
  startPolling: (intervalMs?: number) => void;
  stopPolling: () => void;
  openOrderDetail: (orderId: string) => void;
  closeOrderDetail: () => void;
  ensureDetailLoaded: (orderId: string, opts?: { force?: boolean }) => Promise<void>;
  refreshRecoveryEvents: (orderId: string) => Promise<void>;
  approveItemRecovery: (
    orderId: string,
    orderItemId: string | number,
    body: {
      resolution: string;
      notes?: string | null;
      payload?: { replacedByOrderItemId?: number } | null;
    },
  ) => Promise<void>;
  previewRecoverySettlement: (
    orderId: string,
    orderItemId: string | number,
    body: RecoverySettlementPreviewBody,
  ) => Promise<RecoverySettlementPreviewApi>;
  recordRecoverySettlement: (orderId: string, orderItemId: string | number, body: RecordRecoverySettlementBody) => Promise<void>;
};

export const useOrdersExplorerStore = create<OrdersExplorerState>((set, get) => ({
  filters: {},
  perPage: 25,
  orders: [],
  meta: null,
  initialLoading: false,
  backgroundRefreshing: false,
  listError: null,
  activeListRequestId: 0,
  pollingTimer: null,
  selectedOrderId: null,
  detailByKey: {},
  detailInflight: new Map(),
  recoveryApprovalSubmitting: false,
  recoverySettlementSubmitting: false,

  setFilters: (patch) => {
    set((s) => ({
      filters: { ...s.filters, ...patch },
    }));
    void get().fetchList({ append: false, background: false });
  },

  resetForOutletSwitch: () => {
    get().stopPolling();
    get().detailInflight.clear();
    useOrderPaymentHistoryStore.getState().resetForOutletContextChange();
    set({
      orders: [],
      meta: null,
      listError: null,
      initialLoading: false,
      backgroundRefreshing: false,
      activeListRequestId: 0,
      selectedOrderId: null,
      detailByKey: {},
      recoveryApprovalSubmitting: false,
      recoverySettlementSubmitting: false,
    });
  },

  fetchList: async (opts = {}) => {
    const { append = false, background = false } = opts;
    useAuthStore.getState().syncApiBearerForRequests();
    const outletId = useOutletStore.getState().activeOutletId;
    const requestId = get().activeListRequestId + 1;
    set((s) => ({
      activeListRequestId: requestId,
      listError: null,
      initialLoading: !background && !append && s.orders.length === 0,
      backgroundRefreshing: background || append,
    }));

    const page = append ? (get().meta?.currentPage ?? 0) + 1 : 1;
    const params = buildListParams(get().filters, outletId, page, get().perPage);
    const requestMeta: RequestObservabilityMetadata = {
      scope: "orders-explorer",
      action: append ? "list-orders-append" : "list-orders",
      requestId,
      recovery: true,
    };

    try {
      const result = await apiListOrdersWithMeta(params, {
        headers: createObservabilityHeaders(requestMeta),
      });
      if (get().activeListRequestId !== requestId) return;
      set((s) => ({
        orders: append ? [...s.orders, ...result.orders] : result.orders,
        meta: result.meta,
        initialLoading: false,
        backgroundRefreshing: false,
      }));
    } catch (error) {
      if (get().activeListRequestId !== requestId) return;
      set({
        listError: mapApiError(error),
        initialLoading: false,
        backgroundRefreshing: false,
      });
    }
  },

  loadMore: async () => {
    const { meta } = get();
    if (!meta || meta.currentPage >= meta.lastPage) return;
    await get().fetchList({ append: true, background: false });
  },

  startPolling: (intervalMs = 15000) => {
    if (get().pollingTimer) return;
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      void get().fetchList({ append: false, background: true });
    }, intervalMs);
    set({ pollingTimer: timer });
  },

  stopPolling: () => {
    const t = get().pollingTimer;
    if (t) clearInterval(t);
    set({ pollingTimer: null });
  },

  openOrderDetail: (orderId) => {
    set({ selectedOrderId: orderId });
    void get().ensureDetailLoaded(orderId);
  },

  closeOrderDetail: () => set({ selectedOrderId: null }),

  ensureDetailLoaded: async (orderId, opts = {}) => {
    useAuthStore.getState().syncApiBearerForRequests();
    const outletId = useOutletStore.getState().activeOutletId;
    const key = explorerDetailKey(outletId, orderId);
    const existing = get().detailByKey[key];
    if (!opts.force && existing?.order && !existing.error) return;

    const pending = get().detailInflight.get(key);
    if (pending) {
      await pending;
      return;
    }

    const run = async (): Promise<void> => {
      set((s) => ({
        detailByKey: {
          ...s.detailByKey,
          [key]: {
            order: s.detailByKey[key]?.order ?? null,
            events: s.detailByKey[key]?.events ?? [],
            recoveryEvents: s.detailByKey[key]?.recoveryEvents ?? [],
            receipts: s.detailByKey[key]?.receipts ?? [],
            loading: true,
            recoveryRefreshing: false,
            error: null,
          },
        },
      }));
      try {
        const [order, events, recoveryEvents, receipts] = await Promise.all([
          apiGetOrder(orderId),
          apiListOrderPosEvents(orderId),
          apiListOrderRecoveryEvents(orderId).catch(() => [] as OrderItemRecoveryEventApi[]),
          typeof outletId === "number" && outletId >= 1
            ? listReceiptRenderHistory(outletId, { sourceType: "order", sourceId: Number(orderId) })
            : Promise.resolve([] as ReceiptRenderHistoryRow[]),
        ]);
        set((s) => ({
          detailByKey: {
            ...s.detailByKey,
            [key]: {
              order,
              events,
              recoveryEvents,
              receipts,
              loading: false,
              recoveryRefreshing: false,
              error: null,
            },
          },
        }));
        useOrderPaymentHistoryStore.getState().ensureLoaded(outletId, orderId);
      } catch (error) {
        set((s) => ({
          detailByKey: {
            ...s.detailByKey,
            [key]: {
              order: null,
              events: [],
              recoveryEvents: [],
              receipts: [],
              loading: false,
              recoveryRefreshing: false,
              error: mapApiError(error),
            },
          },
        }));
      } finally {
        get().detailInflight.delete(key);
      }
    };

    const p = run();
    get().detailInflight.set(key, p);
    await p;
  },

  refreshRecoveryEvents: async (orderId) => {
    useAuthStore.getState().syncApiBearerForRequests();
    const outletId = useOutletStore.getState().activeOutletId;
    const key = explorerDetailKey(outletId, orderId);
    const bucket = get().detailByKey[key];
    if (!bucket?.order) return;
    set((s) => ({
      detailByKey: {
        ...s.detailByKey,
        [key]: { ...s.detailByKey[key]!, recoveryRefreshing: true },
      },
    }));
    try {
      const recoveryEvents = await apiListOrderRecoveryEvents(orderId).catch(() => [] as OrderItemRecoveryEventApi[]);
      set((s) => ({
        detailByKey: {
          ...s.detailByKey,
          [key]: {
            ...s.detailByKey[key]!,
            recoveryEvents,
            recoveryRefreshing: false,
          },
        },
      }));
    } catch {
      set((s) => ({
        detailByKey: {
          ...s.detailByKey,
          [key]: { ...s.detailByKey[key]!, recoveryRefreshing: false },
        },
      }));
    }
  },

  approveItemRecovery: async (orderId, orderItemId, body) => {
    useAuthStore.getState().syncApiBearerForRequests();
    const outletId = useOutletStore.getState().activeOutletId;
    const key = explorerDetailKey(outletId, orderId);
    const requestMeta: RequestObservabilityMetadata = {
      scope: "orders-explorer",
      action: "approve-item-recovery",
      requestId: Date.now(),
      recovery: true,
    };
    set({ recoveryApprovalSubmitting: true });
    try {
      await apiApproveOrderItemRecovery(orderId, orderItemId, body, {
        headers: createObservabilityHeaders(requestMeta),
      });
      const [order, recoveryEvents] = await Promise.all([
        apiGetOrder(orderId),
        apiListOrderRecoveryEvents(orderId).catch(() => [] as OrderItemRecoveryEventApi[]),
      ]);
      set((s) => ({
        detailByKey: {
          ...s.detailByKey,
          [key]: {
            ...(s.detailByKey[key] ?? {
              order: null,
              events: [],
              recoveryEvents: [],
              receipts: [],
              loading: false,
              recoveryRefreshing: false,
              error: null,
            }),
            order,
            recoveryEvents,
            recoveryRefreshing: false,
          },
        },
      }));
    } finally {
      set({ recoveryApprovalSubmitting: false });
    }
  },

  previewRecoverySettlement: async (orderId, orderItemId, body) => {
    useAuthStore.getState().syncApiBearerForRequests();
    const requestMeta: RequestObservabilityMetadata = {
      scope: "orders-explorer",
      action: "preview-recovery-settlement",
      requestId: Date.now(),
      recovery: true,
    };
    return apiPreviewOrderItemRecoverySettlement(orderId, orderItemId, body, {
      headers: createObservabilityHeaders(requestMeta),
    });
  },

  recordRecoverySettlement: async (orderId, orderItemId, body) => {
    useAuthStore.getState().syncApiBearerForRequests();
    const requestMeta: RequestObservabilityMetadata = {
      scope: "orders-explorer",
      action: "record-recovery-settlement",
      requestId: Date.now(),
      recovery: true,
    };
    set({ recoverySettlementSubmitting: true });
    try {
      await apiRecordOrderItemRecoverySettlement(orderId, orderItemId, body, {
        headers: createObservabilityHeaders(requestMeta),
      });
      await get().refreshRecoveryEvents(orderId);
    } finally {
      set({ recoverySettlementSubmitting: false });
    }
  },
}));
