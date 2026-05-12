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

export type KitchenTicketStatus = "queued" | "in_progress" | "ready" | "served" | "cancelled";

export type KitchenTicketItemApi = {
  id: string | number;
  orderItemId: string | number;
  name: string;
  qty: number;
  notes?: string | null;
  status: string;
  recoveryStatus?: string | null;
  recoveryReason?: string | null;
};

export type KitchenTicketApi = {
  id: string | number;
  outletId: number;
  orderId: string | number;
  ticketNo: string;
  status: KitchenTicketStatus;
  queuedAt?: string | null;
  startedAt?: string | null;
  readyAt?: string | null;
  servedAt?: string | null;
  items: KitchenTicketItemApi[];
  createdAt: string;
  updatedAt: string;
};

export type KitchenTicketListMeta = {
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
};

export type ListKitchenTicketsParams = {
  outletId?: number;
  status?: KitchenTicketStatus;
  perPage?: number;
};

export type ListKitchenTicketsResult = {
  tickets: KitchenTicketApi[];
  meta: KitchenTicketListMeta;
};

type KitchenRequestOptions = {
  signal?: AbortSignal;
  headers?: HeadersInit;
};

export async function listKitchenTickets(
  params?: ListKitchenTicketsParams,
  options: KitchenRequestOptions = {},
): Promise<ListKitchenTicketsResult> {
  const query = new URLSearchParams();
  if (typeof params?.outletId === "number" && params.outletId > 0) {
    query.set("outletId", String(params.outletId));
  }
  if (params?.status) query.set("status", params.status);
  if (typeof params?.perPage === "number") query.set("perPage", String(params.perPage));

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await request<ApiListResponse<KitchenTicketApi>>(`/kitchen/tickets${suffix}`, {
    signal: options.signal,
    headers: options.headers,
  });
  const meta = response.meta ?? {};
  return {
    tickets: response.data,
    meta: {
      currentPage: Number(meta.currentPage ?? meta.current_page ?? 1),
      perPage: Number(meta.perPage ?? meta.per_page ?? response.data.length),
      total: Number(meta.total ?? response.data.length),
      lastPage: Number(meta.lastPage ?? meta.last_page ?? 1),
    },
  };
}

export async function updateKitchenTicketStatus(
  ticketId: string,
  status: KitchenTicketStatus,
  options: KitchenRequestOptions = {},
): Promise<KitchenTicketApi> {
  const response = await request<{ message: string; data: KitchenTicketApi }>(
    `/kitchen/tickets/${ticketId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
      signal: options.signal,
      headers: options.headers,
    },
  );
  return response.data;
}
