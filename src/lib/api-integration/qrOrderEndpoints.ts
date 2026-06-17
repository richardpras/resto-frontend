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
  | "under_review"
  | "confirmed"
  | "rejected"
  | "expired";

export type QrOrderRequestItemApi = {
  id: number | string;
  menuItemId: number;
  qty: number;
  notes?: string | null;
};

export type QrOrderConfirmMode = "confirm_only" | "pay_and_confirm";

export type QrOrderRequestApi = {
  id: number | string;
  requestCode: string;
  outletId: number;
  tableId: number;
  tableName: string;
  customerName?: string | null;
  status: QrOrderRequestStatus;
  statusLabel?: string;
  decisionMode?: QrOrderConfirmMode | null;
  estimatedTotal?: number;
  cashierCalledAt?: string | null;
  cashierCallCount?: number;
  expiresAt?: string | null;
  confirmedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  orderId?: number | null;
  linkedOrder?: {
    id: number;
    orderNo: string;
    status: string;
    paymentStatus: string;
    total: number;
  } | null;
  items: QrOrderRequestItemApi[];
  createdAt: string;
};

export type CreateQrOrderPayload = {
  outletId: number;
  tableId: number;
  guestSessionToken: string;
  qrPublicId: string;
  customerName: string;
  expiresInMinutes?: number;
  appendToRequestCode?: string;
  forceNew?: boolean;
  items: {
    menuItemId: number;
    qty: number;
    notes?: string;
  }[];
};

export type QrOrderCustomerHealth = {
  pendingReviews: number;
  adjustedAwaitingApproval: number;
  callCashierVolume: number;
  averageReviewTimeMinutes: number;
  averageReadyTimeMinutes: number;
};

export type ListQrOrdersParams = {
  outletId?: number;
  status?: QrOrderRequestStatus;
  search?: string;
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
  if (params?.search) query.set("search", params.search);
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

export type ConfirmQrOrderPayload = {
  mode?: QrOrderConfirmMode;
  payments?: { method: string; amount: number }[];
};

export async function confirmQrOrder(
  requestId: number | string,
  payload: ConfirmQrOrderPayload = {},
  options: QrOrderRequestOptions = {},
): Promise<QrOrderRequestApi> {
  const response = await request<{ message: string; data: QrOrderRequestApi }>(
    `/qr-orders/${requestId}/confirm`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      signal: options.signal,
      headers: options.headers,
    },
  );
  return response.data;
}

export async function callQrOrderCashier(
  requestId: number | string,
  payload: { outletId: number; tableId: number; guestSessionToken?: string; reason?: string },
  options: QrOrderRequestOptions = {},
): Promise<QrOrderRequestApi> {
  const response = await request<{ message: string; data: QrOrderRequestApi }>(
    `/qr-orders/${requestId}/call-cashier`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      signal: options.signal,
      headers: options.headers,
    },
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

export async function markQrOrderServed(requestId: number | string): Promise<QrOrderRequestApi> {
  const response = await request<{ message: string; data: QrOrderRequestApi }>(
    `/qr-orders/${requestId}/mark-served`,
    { method: "POST" },
  );
  return response.data;
}

export async function getQrOrderCustomerHealth(outletId?: number): Promise<QrOrderCustomerHealth> {
  const query = outletId ? `?outletId=${encodeURIComponent(String(outletId))}` : "";
  const response = await request<{ data: QrOrderCustomerHealth }>(`/qr-orders/customer-health${query}`);
  return response.data;
}
