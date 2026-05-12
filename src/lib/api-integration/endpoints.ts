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

type EndpointRequestOptions = {
  signal?: AbortSignal;
  headers?: HeadersInit;
};

export type InventoryItemApi = {
  id: string;
  name: string;
  type: "ingredient" | "atk" | "asset";
  stock: number;
  min: number;
  unit: string;
  price?: number | null;
  notes?: string | null;
};

export type InventoryPayload = Omit<InventoryItemApi, "id"> & {
  tenantId?: number;
  outletId?: number;
};

export type ListIngredientsParams = {
  tenantId?: number;
  perPage?: number;
  /** Numeric outlet → per-outlet ledger stock (`inventory_stocks`) */
  outletId?: number;
};

export async function listIngredients(params?: ListIngredientsParams): Promise<InventoryItemApi[]> {
  const query = new URLSearchParams();
  if (params?.tenantId !== undefined) query.set("tenantId", String(params.tenantId));
  if (params?.perPage !== undefined) query.set("perPage", String(params.perPage));
  if (params?.outletId !== undefined) query.set("outletId", String(params.outletId));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await request<ApiListResponse<InventoryItemApi>>(`/ingredients${suffix}`);
  return response.data;
}

export async function createIngredient(payload: InventoryPayload): Promise<InventoryItemApi> {
  const response = await request<{ data: InventoryItemApi }>("/ingredients", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateIngredient(id: string, payload: Partial<InventoryPayload>): Promise<InventoryItemApi> {
  const response = await request<{ data: InventoryItemApi }>(`/ingredients/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function deleteIngredient(id: string): Promise<void> {
  await request<{ message: string }>(`/ingredients/${id}`, {
    method: "DELETE",
  });
}

export type StockMovementApi = {
  id: number;
  inventory_item_id: number;
  outlet_id?: number | null;
  inventory_item_name?: string | null;
  type: "purchase" | "sale" | "adjustment" | "waste";
  quantity: number;
  source_type: string;
  source_id?: string | null;
  created_at?: string | null;
};

export type StockMovementPayload = {
  inventory_item_id: number;
  type: "purchase" | "sale" | "adjustment" | "waste";
  quantity: number;
  source_type: string;
  source_id?: string;
};

export async function listStockMovements(): Promise<StockMovementApi[]> {
  const response = await request<ApiListResponse<StockMovementApi>>("/stock-movements");
  return response.data;
}

export async function createStockMovement(payload: StockMovementPayload): Promise<StockMovementApi> {
  const response = await request<{ data: StockMovementApi }>("/stock-movements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export type MenuRecipeApi = {
  id?: string | number;
  inventoryItemId: string;
  quantity: number;
};

export type MenuItemOutletApi = {
  outletId: number;
  isActive: boolean;
  priceOverride?: number | null;
  nameOverride?: string | null;
  receiptName?: string | null;
};

export type MenuItemApi = {
  id: string;
  name: string;
  category?: string | null;
  price: number;
  available: boolean;
  emoji?: string | null;
  recipes?: MenuRecipeApi[];
  menuItemOutlets?: MenuItemOutletApi[];
};

export type MenuPayload = Omit<MenuItemApi, "id"> & {
  tenantId?: number;
  outletId?: number;
};

export type ListMenuItemsParams = {
  tenantId?: number;
  perPage?: number;
  /** Numeric outlet PK — filters `menu_item_outlets`; pass with `tenantId` for POS */
  outletId?: number;
};

export async function listMenuItems(params?: ListMenuItemsParams): Promise<MenuItemApi[]> {
  const query = new URLSearchParams();
  if (params?.tenantId !== undefined) query.set("tenantId", String(params.tenantId));
  if (params?.perPage !== undefined) query.set("perPage", String(params.perPage));
  if (params?.outletId !== undefined && params.outletId >= 1) query.set("outletId", String(params.outletId));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await request<ApiListResponse<MenuItemApi>>(`/menu-items${suffix}`);
  return response.data;
}

export async function createMenuItem(payload: MenuPayload): Promise<MenuItemApi> {
  const response = await request<{ data: MenuItemApi }>("/menu-items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateMenuItem(id: string, payload: Partial<MenuPayload>): Promise<MenuItemApi> {
  const response = await request<{ data: MenuItemApi }>(`/menu-items/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export type OrderItemPayload = {
  orderItemId?: string;
  id: string;
  name: string;
  price: number;
  qty: number;
  emoji?: string;
  notes?: string;
  recoveryStatus?: string | null;
  recoveryReason?: string | null;
  recoveryApprovedAt?: string | null;
  recoveryApprovedByUserId?: number | null;
  replacedByOrderItemId?: number | null;
};

export type OrderPaymentPayload = {
  method: string;
  amount: number;
  status?: "paid" | "pending" | "failed" | "void";
  orderSplitId?: number;
  paidAt?: string;
  splitBillLabel?: string;
  splitBillGroup?: string;
  allocations?: {
    orderItemId: number;
    qty: number;
    amount: number;
  }[];
};

export type ServiceMode = "dine_in" | "takeaway";
export type OrderChannel = "dine_in" | "takeaway" | "qr";
export type KitchenStatus =
  | "queued"
  | "in_progress"
  | "ready"
  | "served"
  | "cancelled"
  | "pending_confirmation";

export type CreateOrderPayload = {
  tenantId?: number;
  outletId?: number;
  code: string;
  source: "pos" | "qr";
  orderType: string;
  status: "pending" | "confirmed" | "cooking" | "ready" | "completed" | "cancelled";
  paymentStatus: "unpaid" | "partial" | "paid";
  items: OrderItemPayload[];
  subtotal: number;
  tax: number;
  total: number;
  discountAmount?: number;
  payments: OrderPaymentPayload[];
  customerName?: string;
  customerPhone?: string;
  /** Floor master table PK; server fills `tableName` snapshot. */
  tableId?: number;
  createdAt?: string;
  confirmedAt?: string;
  splitBill?: unknown;
  serviceMode?: ServiceMode;
  orderChannel?: OrderChannel;
  posSessionId?: number;
};

export type UpdateOrderPayload = Partial<{
  items: OrderItemPayload[];
  subtotal: number;
  tax: number;
  total: number;
  discountAmount: number;
  customerName: string | null;
  customerPhone: string | null;
  tableId: number | null;
  notes: string | null;
}>;

export type OrderApi = {
  id: string;
  outletId?: number | null;
  posSessionId?: number | null;
  code: string;
  source: "pos" | "qr";
  orderChannel?: OrderChannel | null;
  serviceMode?: ServiceMode | null;
  orderType: string;
  status: "pending" | "confirmed" | "cooking" | "ready" | "completed" | "cancelled";
  paymentStatus: "unpaid" | "partial" | "paid";
  kitchenStatus?: KitchenStatus | string;
  items: (OrderItemPayload & { orderItemId?: string })[];
  subtotal: number;
  tax: number;
  total: number;
  discountAmount?: number;
  payments: {
    id: string;
    method: string;
    amount: number;
    status?: string;
    orderSplitId?: number | null;
    paidAt?: string;
    allocations?: { orderItemId: number; qty: number; amount: number }[];
  }[];
  customerName: string;
  customerPhone: string;
  tableId?: number | null;
  tableName?: string | null;
  tableNumber: string;
  createdAt?: string;
  confirmedAt?: string;
  splitBill?: unknown;
  isPosted?: boolean;
  splits?: {
    id: number;
    splitType: string;
    label: string;
    status: string;
    items: { orderItemId: number; qty: number; amount: number }[];
  }[];
};

/** Operational audit rows from `GET /orders/{id}/events` (PosEventLogResource). */
export type PosEventLogApi = {
  id: number;
  outletId: number;
  actorUserId: number | null;
  eventType: string;
  entityType: string;
  entityId: number;
  payload: Record<string, unknown> | null;
  occurredAt?: string | null;
};

export type OrderItemRecoveryEventApi = {
  id: number;
  outletId: number | null;
  orderId: number;
  orderItemId: number;
  eventCode: string;
  recoveryStatus: string | null;
  reason: string | null;
  payload: Record<string, unknown> | null;
  actorUserId: number | null;
  managerUserId: number | null;
  createdAt?: string | null;
};

/** Authoritative rows from `GET /orders/{id}/payments` (OrderPaymentResource). */
export type OrderPaymentHistoryItem = {
  id: number | string;
  orderId: number;
  orderSplitId: number | null;
  method: string;
  amount: number;
  status: string;
  paidAt?: string | null;
  createdAt?: string | null;
  splitBillLabel?: string | null;
  splitBillGroup?: string | null;
  splitLabel?: string | null;
  allocations?: { orderItemId: number; qty: number; amount: number }[];
};

export type OrderSplitItemPayload = {
  orderItemId: number;
  qty: number;
  amount: number;
};

export type OrderSplitPayload = {
  splitType: "by_item" | "by_person" | "mixed";
  label: string;
  status?: "open" | "partial" | "paid";
  items: OrderSplitItemPayload[];
};

export type OrderSplitApi = {
  id: number;
  orderId: number;
  splitType: "by_item" | "by_person" | "mixed";
  label: string;
  status: "open" | "partial" | "paid";
  items: OrderSplitItemPayload[];
};

export type ListOrdersMeta = {
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
};

export type ListOrdersResult = {
  orders: OrderApi[];
  meta: ListOrdersMeta;
};

export type ListOrdersParams = {
  tenantId?: number;
  outletId?: number;
  page?: number;
  perPage?: number;
  paymentStatus?: "unpaid" | "partial" | "paid";
  orderType?: string;
  status?: "pending" | "confirmed" | "cooking" | "ready" | "completed" | "cancelled";
  source?: "pos" | "qr";
  serviceMode?: ServiceMode;
  kitchenStatus?: KitchenStatus | string;
  /** Invoice / order code contains (backend `LIKE`). */
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  /** When true, only orders that have at least one voided payment row. */
  hasVoidedPayment?: boolean;
};

export async function createOrder(
  payload: CreateOrderPayload,
  options: EndpointRequestOptions = {},
): Promise<OrderApi> {
  const response = await request<{ data: OrderApi }>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
    signal: options.signal,
    headers: options.headers,
  });
  return response.data;
}

export async function getOrder(id: string, options: EndpointRequestOptions = {}): Promise<OrderApi> {
  const response = await request<{ data: OrderApi }>(`/orders/${id}`, {
    signal: options.signal,
    headers: options.headers,
  });
  return response.data;
}

export async function listOrders(params?: ListOrdersParams): Promise<OrderApi[]> {
  const result = await listOrdersWithMeta(params);
  return result.orders;
}

export async function listOrdersWithMeta(
  params?: ListOrdersParams,
  options: EndpointRequestOptions = {},
): Promise<ListOrdersResult> {
  const query = new URLSearchParams();
  if (params?.tenantId !== undefined) query.set("tenantId", String(params.tenantId));
  if (params?.outletId !== undefined && params.outletId > 0) query.set("outletId", String(params.outletId));
  if (params?.page !== undefined) query.set("page", String(params.page));
  if (params?.perPage !== undefined) query.set("perPage", String(params.perPage));
  if (params?.paymentStatus) query.set("paymentStatus", params.paymentStatus);
  if (params?.orderType) query.set("orderType", params.orderType);
  if (params?.status) query.set("status", params.status);
  if (params?.source) query.set("source", params.source);
  if (params?.serviceMode) query.set("serviceMode", params.serviceMode);
  if (params?.kitchenStatus) query.set("kitchenStatus", String(params.kitchenStatus));
  if (params?.search !== undefined && params.search.trim() !== "") query.set("search", params.search.trim());
  if (params?.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params?.dateTo) query.set("dateTo", params.dateTo);
  if (params?.hasVoidedPayment === true) query.set("hasVoidedPayment", "1");

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await request<ApiListResponse<OrderApi>>(`/orders${suffix}`, {
    signal: options.signal,
    headers: options.headers,
  });
  const meta = response.meta ?? {};
  return {
    orders: response.data,
    meta: {
      currentPage: Number(meta.currentPage ?? meta.current_page ?? 1),
      perPage: Number(meta.perPage ?? meta.per_page ?? response.data.length),
      total: Number(meta.total ?? response.data.length),
      lastPage: Number(meta.lastPage ?? meta.last_page ?? 1),
    },
  };
}

export async function updateOrder(
  id: string,
  payload: UpdateOrderPayload,
  options: EndpointRequestOptions = {},
): Promise<OrderApi> {
  const response = await request<{ data: OrderApi }>(`/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    signal: options.signal,
    headers: options.headers,
  });
  return response.data;
}

export async function updateOrderStatus(
  id: string,
  payload: { status: OrderApi["status"]; paymentStatus?: OrderApi["paymentStatus"] },
): Promise<OrderApi> {
  const response = await request<{ data: OrderApi }>(`/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function addOrderPayments(
  id: string,
  payload: {
    payments: OrderPaymentPayload[];
    cashAccountCode?: string;
    revenueAccountCode?: string;
  },
  options: EndpointRequestOptions = {},
): Promise<OrderApi> {
  const response = await request<{ data: OrderApi }>(`/orders/${id}/payments`, {
    method: "POST",
    body: JSON.stringify(payload),
    signal: options.signal,
    headers: options.headers,
  });
  return response.data;
}

export async function createOrderSplit(
  orderId: string,
  payload: OrderSplitPayload,
  options: EndpointRequestOptions = {},
): Promise<OrderSplitApi> {
  const response = await request<{ data: OrderSplitApi }>(`/orders/${orderId}/splits`, {
    method: "POST",
    body: JSON.stringify(payload),
    signal: options.signal,
    headers: options.headers,
  });
  return response.data;
}

export async function updateOrderSplit(
  orderId: string,
  splitId: number,
  payload: Partial<OrderSplitPayload>,
  options: EndpointRequestOptions = {},
): Promise<OrderSplitApi> {
  const response = await request<{ data: OrderSplitApi }>(`/orders/${orderId}/splits/${splitId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    signal: options.signal,
    headers: options.headers,
  });
  return response.data;
}

export async function listOrderPayments(
  orderId: string,
  options: EndpointRequestOptions = {},
): Promise<OrderPaymentHistoryItem[]> {
  const response = await request<{ data: OrderPaymentHistoryItem[] }>(`/orders/${orderId}/payments`, {
    signal: options.signal,
    headers: options.headers,
  });
  return response.data;
}

export async function listOrderPosEvents(
  orderId: string,
  options: EndpointRequestOptions = {},
): Promise<PosEventLogApi[]> {
  const response = await request<{ data: PosEventLogApi[] }>(`/orders/${orderId}/events`, {
    signal: options.signal,
    headers: options.headers,
  });
  return response.data;
}

export async function listOrderRecoveryEvents(
  orderId: string,
  options: EndpointRequestOptions = {},
): Promise<OrderItemRecoveryEventApi[]> {
  const response = await request<{ data: OrderItemRecoveryEventApi[] }>(`/orders/${orderId}/recovery-events`, {
    signal: options.signal,
    headers: options.headers,
  });
  return response.data;
}

export type ReportOrderItemRecoveryBody = {
  targetStatus: string;
  reason?: string | null;
};

export type OrderItemRecoveryMutationResult = {
  orderItemId: number;
  recoveryStatus: string | null;
  recoveryReason: string | null;
  recoveryApprovedAt?: string | null;
  recoveryApprovedByUserId?: number | null;
  replacedByOrderItemId?: number | null;
};

export async function reportOrderItemRecovery(
  orderId: string,
  orderItemId: string | number,
  body: ReportOrderItemRecoveryBody,
  options: EndpointRequestOptions = {},
): Promise<OrderItemRecoveryMutationResult> {
  const response = await request<{ data: OrderItemRecoveryMutationResult }>(
    `/orders/${orderId}/items/${orderItemId}/recovery/report`,
    {
      method: "POST",
      body: JSON.stringify(body),
      signal: options.signal,
      headers: options.headers,
    },
  );
  return response.data;
}

export async function approveOrderItemRecovery(
  orderId: string,
  orderItemId: string | number,
  body: {
    resolution: string;
    notes?: string | null;
    payload?: { replacedByOrderItemId?: number } | null;
  },
  options: EndpointRequestOptions = {},
): Promise<OrderItemRecoveryMutationResult> {
  const response = await request<{ data: OrderItemRecoveryMutationResult }>(
    `/orders/${orderId}/items/${orderItemId}/recovery/approve`,
    {
      method: "POST",
      body: JSON.stringify(body),
      signal: options.signal,
      headers: options.headers,
    },
  );
  return response.data;
}

export type RecoverySettlementPreviewBody = {
  settlementKind?: string | null;
  partialRefundAmount?: number | null;
  storeCreditAmount?: number | null;
  giftCardAmount?: number | null;
  replacedByOrderItemId?: number | null;
  loyaltyPointsAdjustment?: number | null;
};

export type RecoverySettlementPreviewApi = Record<string, unknown>;

export async function previewOrderItemRecoverySettlement(
  orderId: string,
  orderItemId: string | number,
  body: RecoverySettlementPreviewBody,
  options: EndpointRequestOptions = {},
): Promise<RecoverySettlementPreviewApi> {
  const response = await request<{ data: RecoverySettlementPreviewApi }>(
    `/orders/${orderId}/items/${orderItemId}/recovery/settlement/preview`,
    {
      method: "POST",
      body: JSON.stringify(body),
      signal: options.signal,
      headers: options.headers,
    },
  );
  return response.data;
}

export type RecordRecoverySettlementBody = RecoverySettlementPreviewBody & {
  idempotencyKey: string;
  notes?: string | null;
};

export type RecordRecoverySettlementResultApi = {
  idempotent: boolean;
  eventId: number | null;
  snapshot: RecoverySettlementPreviewApi;
};

export async function recordOrderItemRecoverySettlement(
  orderId: string,
  orderItemId: string | number,
  body: RecordRecoverySettlementBody,
  options: EndpointRequestOptions = {},
): Promise<RecordRecoverySettlementResultApi> {
  const response = await request<{ data: RecordRecoverySettlementResultApi }>(
    `/orders/${orderId}/items/${orderItemId}/recovery/settlement/record`,
    {
      method: "POST",
      body: JSON.stringify(body),
      signal: options.signal,
      headers: options.headers,
    },
  );
  return response.data;
}
