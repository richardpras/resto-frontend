import { create } from "zustand";
import { ApiHttpError } from "@/lib/api-integration/client";
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

type QrOrderStore = {
  requests: QrOrderRequest[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  pagination: ListQrOrdersMeta | null;
  lastSyncAt: string | null;
  lastListParams: ListQrOrdersParams | null;
  pollingMs: number;
  pollingTimer: ReturnType<typeof setInterval> | null;
  fetchRequests: (params?: ListQrOrdersParams) => Promise<QrOrderRequest[]>;
  revalidateRequests: () => Promise<QrOrderRequest[] | null>;
  createRequest: (payload: CreateQrOrderPayload) => Promise<QrOrderRequest>;
  confirmRequest: (id: string) => Promise<QrOrderRequest>;
  rejectRequest: (id: string, reason?: string) => Promise<QrOrderRequest>;
  startPolling: (params: ListQrOrdersParams, intervalMs?: number) => void;
  stopPolling: () => void;
  resetAsync: () => void;
};

export const useQrOrderStore = create<QrOrderStore>((set, get) => ({
  requests: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
  pagination: null,
  lastSyncAt: null,
  lastListParams: null,
  pollingMs: 10000,
  pollingTimer: null,

  fetchRequests: async (params) => {
    set({ isLoading: true, error: null, lastListParams: params ?? null });
    try {
      const response = await apiListQrOrdersWithMeta(params);
      const mapped = response.requests.map(qrOrderApiToStore);
      set({
        requests: mapped,
        pagination: response.meta,
        lastSyncAt: new Date().toISOString(),
      });
      return mapped;
    } catch (error) {
      const message = mapApiError(error);
      set({ error: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  revalidateRequests: async () => {
    const params = get().lastListParams;
    if (params === null) return null;
    return get().fetchRequests(params);
  },

  createRequest: async (payload) => {
    set({ isSubmitting: true, error: null });
    try {
      const created = qrOrderApiToStore(await apiCreateQrOrder(payload));
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
      set({ isSubmitting: false });
    }
  },

  confirmRequest: async (id) => {
    set({ isSubmitting: true, error: null });
    try {
      const updated = qrOrderApiToStore(await apiConfirmQrOrder(id));
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
      set({ isSubmitting: false });
    }
  },

  rejectRequest: async (id, reason) => {
    set({ isSubmitting: true, error: null });
    try {
      const updated = qrOrderApiToStore(await apiRejectQrOrder(id, reason ? { reason } : undefined));
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
      set({ isSubmitting: false });
    }
  },

  startPolling: (params, intervalMs = 10000) => {
    const state = get();
    if (state.pollingTimer) clearInterval(state.pollingTimer);
    set({ pollingMs: intervalMs, lastListParams: params });
    void get().fetchRequests(params);
    const timer = setInterval(() => {
      void get().fetchRequests(params);
    }, intervalMs);
    set({ pollingTimer: timer });
  },

  stopPolling: () => {
    const timer = get().pollingTimer;
    if (timer) clearInterval(timer);
    set({ pollingTimer: null });
  },

  resetAsync: () => {
    get().stopPolling();
    set({
      isLoading: false,
      isSubmitting: false,
      error: null,
      pagination: null,
      lastSyncAt: null,
      lastListParams: null,
    });
  },
}));
