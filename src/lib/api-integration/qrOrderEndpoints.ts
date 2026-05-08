import { apiRequest as request } from "./client";

type ApiListResponse<T> = {
  data: T[];
  meta?: {
    current_page?: number;
    currentPage?: number;
    per_page?: number;
    perPage?: number;
    total?: number;
    last_page?: number;
    lastPage?: number;
  };
};

export type QrOrderRequestStatus =
  | "pending_cashier_confirmation"
  | "confirmed"
  | "rejected"
  | "expired";

export type QrOrderRequestItemApi = {
  id: number | string;
  menuItemId: number;
  qty: number;
  notes?: string | null;
};

export type QrOrderRequestApi = {
  id: number | string;
  requestCode: string;
  outletId: number;
  tableId: number;
  tableName: string;
  customerName?: string | null;
  status: QrOrderRequestStatus;
  expiresAt?: string | null;
  confirmedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  orderId?: number | null;
  items: QrOrderRequestItemApi[];
  createdAt: string;
};

export type CreateQrOrderPayload = {
  outletId: number;
  tableId: number;
  customerName?: string;
  expiresInMinutes?: number;
  items: {
    menuItemId: number;
    qty: number;
    notes?: string;
  }[];
};

export type ListQrOrdersParams = {
  outletId?: number;
  status?: QrOrderRequestStatus;
  page?: number;
  perPage?: number;
};

export type ListQrOrdersMeta = {
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
};

export type ListQrOrdersResult = {
  requests: QrOrderRequestApi[];
  meta: ListQrOrdersMeta;
};

type QrOrderRequestOptions = {
  signal?: AbortSignal;
  headers?: HeadersInit;
};

export async function createQrOrder(
  payload: CreateQrOrderPayload,
  options: QrOrderRequestOptions = {},
): Promise<QrOrderRequestApi> {
  const response = await request<{ message: string; data: QrOrderRequestApi }>("/qr-orders", {
    method: "POST",
    body: JSON.stringify(payload),
    signal: options.signal,
    headers: options.headers,
  });
  return response.data;
}

export async function listQrOrdersWithMeta(
  params?: ListQrOrdersParams,
  options: QrOrderRequestOptions = {},
): Promise<ListQrOrdersResult> {
  const query = new URLSearchParams();
  if (params?.outletId !== undefined && params.outletId > 0) query.set("outletId", String(params.outletId));
  if (params?.status) query.set("status", params.status);
  if (params?.page !== undefined) query.set("page", String(params.page));
  if (params?.perPage !== undefined) query.set("perPage", String(params.perPage));

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await request<ApiListResponse<QrOrderRequestApi>>(`/qr-orders${suffix}`, {
    signal: options.signal,
    headers: options.headers,
  });
  const meta = response.meta ?? {};
  return {
    requests: response.data,
    meta: {
      currentPage: Number(meta.currentPage ?? meta.current_page ?? 1),
      perPage: Number(meta.perPage ?? meta.per_page ?? response.data.length),
      total: Number(meta.total ?? response.data.length),
      lastPage: Number(meta.lastPage ?? meta.last_page ?? 1),
    },
  };
}

export async function confirmQrOrder(
  requestId: number | string,
  options: QrOrderRequestOptions = {},
): Promise<QrOrderRequestApi> {
  const response = await request<{ message: string; data: QrOrderRequestApi }>(
    `/qr-orders/${requestId}/confirm`,
    { method: "POST", signal: options.signal, headers: options.headers },
  );
  return response.data;
}

export async function rejectQrOrder(
  requestId: number | string,
  payload?: { reason?: string },
  options: QrOrderRequestOptions = {},
): Promise<QrOrderRequestApi> {
  const response = await request<{ message: string; data: QrOrderRequestApi }>(
    `/qr-orders/${requestId}/reject`,
    {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
      signal: options.signal,
      headers: options.headers,
    },
  );
  return response.data;
}
