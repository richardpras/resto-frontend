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

export async function listIngredients(): Promise<InventoryItemApi[]> {
  const response = await request<ApiListResponse<InventoryItemApi>>("/ingredients");
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

export type MenuItemApi = {
  id: string;
  name: string;
  category?: string | null;
  price: number;
  available: boolean;
  emoji?: string | null;
  recipes?: MenuRecipeApi[];
};

export type MenuPayload = Omit<MenuItemApi, "id"> & {
  tenantId?: number;
  outletId?: number;
};

export type ListMenuItemsParams = {
  tenantId?: number;
  perPage?: number;
};

export async function listMenuItems(params?: ListMenuItemsParams): Promise<MenuItemApi[]> {
  const query = new URLSearchParams();
  if (params?.tenantId !== undefined) query.set("tenantId", String(params.tenantId));
  if (params?.perPage !== undefined) query.set("perPage", String(params.perPage));
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
  paidAt?: string;
  splitBillLabel?: string;
  splitBillGroup?: string;
  allocations?: {
    orderItemId: number;
    qty: number;
    amount: number;
  }[];
};

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
  tableNumber?: string;
  createdAt?: string;
  confirmedAt?: string;
  splitBill?: unknown;
};

export type OrderApi = {
  id: string;
  code: string;
  source: "pos" | "qr";
  orderType: string;
  status: "pending" | "confirmed" | "cooking" | "ready" | "completed" | "cancelled";
  paymentStatus: "unpaid" | "partial" | "paid";
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
  tableNumber: string;
  createdAt?: string;
  confirmedAt?: string;
  splitBill?: unknown;
};

export type ListOrdersParams = {
  tenantId?: number;
  perPage?: number;
  paymentStatus?: "unpaid" | "partial" | "paid";
  orderType?: string;
  status?: "pending" | "confirmed" | "cooking" | "ready" | "completed" | "cancelled";
  source?: "pos" | "qr";
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
  const query = new URLSearchParams();
  if (params?.tenantId !== undefined) query.set("tenantId", String(params.tenantId));
  if (params?.perPage !== undefined) query.set("perPage", String(params.perPage));
  if (params?.paymentStatus) query.set("paymentStatus", params.paymentStatus);
  if (params?.orderType) query.set("orderType", params.orderType);
  if (params?.status) query.set("status", params.status);
  if (params?.source) query.set("source", params.source);

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await request<ApiListResponse<OrderApi>>(`/orders${suffix}`);
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
