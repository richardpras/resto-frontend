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
};

export async function createOrder(payload: CreateOrderPayload): Promise<OrderApi> {
  const response = await request<{ data: OrderApi }>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function getOrder(id: string): Promise<OrderApi> {
  const response = await request<{ data: OrderApi }>(`/orders/${id}`);
  return response.data;
}

export async function listOrders(params?: ListOrdersParams): Promise<OrderApi[]> {
  const result = await listOrdersWithMeta(params);
  return result.orders;
}

export async function listOrdersWithMeta(params?: ListOrdersParams): Promise<ListOrdersResult> {
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

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await request<ApiListResponse<OrderApi>>(`/orders${suffix}`);
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

export async function updateOrder(id: string, payload: UpdateOrderPayload): Promise<OrderApi> {
  const response = await request<{ data: OrderApi }>(`/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
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
): Promise<OrderApi> {
  const response = await request<{ data: OrderApi }>(`/orders/${id}/payments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function createOrderSplit(
  orderId: string,
  payload: OrderSplitPayload,
): Promise<OrderSplitApi> {
  const response = await request<{ data: OrderSplitApi }>(`/orders/${orderId}/splits`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateOrderSplit(
  orderId: string,
  splitId: number,
  payload: Partial<OrderSplitPayload>,
): Promise<OrderSplitApi> {
  const response = await request<{ data: OrderSplitApi }>(`/orders/${orderId}/splits/${splitId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function listOrderPayments(orderId: string): Promise<OrderApi["payments"]> {
  const response = await request<{ data: OrderApi["payments"] }>(`/orders/${orderId}/payments`);
  return response.data;
}
