export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ?? "http://127.0.0.1:8000/api/v1";

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.message ?? `Request failed (${response.status})`;
    throw new Error(message);
  }

  return body as T;
}

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

export type MenuRecipeApi = {
  id?: string | number;
  ingredientId: string;
  qty: number;
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

export async function listMenuItems(): Promise<MenuItemApi[]> {
  const response = await request<ApiListResponse<MenuItemApi>>("/menu-items");
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
  paidAt: string;
  splitBillLabel?: string;
  splitBillGroup?: string;
  allocations?: {
    orderItemId: number;
    qty: number;
    amount: number;
  }[];
};

export type CreateOrderPayload = {
  code: string;
  source: "pos" | "qr";
  orderType: string;
  status: "pending" | "confirmed" | "cooking" | "ready" | "completed" | "cancelled";
  paymentStatus: "unpaid" | "partial" | "paid";
  items: OrderItemPayload[];
  subtotal: number;
  tax: number;
  total: number;
  payments: OrderPaymentPayload[];
  customerName: string;
  customerPhone: string;
  tableNumber: string;
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
  items: OrderItemPayload[];
  subtotal: number;
  tax: number;
  total: number;
  payments: { id: string; method: string; amount: number; paidAt?: string; allocations?: { orderItemId: number; qty: number; amount: number }[] }[];
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
  payload: { status: OrderApi["status"]; paymentStatus?: OrderApi["paymentStatus"] }
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
  }
): Promise<OrderApi> {
  const response = await request<{ data: OrderApi }>(`/orders/${id}/payments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export type ShiftApi = {
  id: string;
  code: string;
  name: string;
  start_time: string;
  end_time: string;
  late_tolerance_minutes: number;
  overtime_after_minutes: number;
  active: boolean;
};

export type ShiftPayload = {
  code: string;
  name: string;
  start_time: string;
  end_time: string;
  late_tolerance_minutes: number;
  overtime_after_minutes: number;
  active?: boolean;
};

export async function listShifts(): Promise<ShiftApi[]> {
  const response = await request<ApiListResponse<ShiftApi>>("/shifts");
  return response.data;
}

export async function createShift(payload: ShiftPayload): Promise<ShiftApi> {
  const response = await request<{ data: ShiftApi }>("/shifts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateShift(id: string, payload: Partial<ShiftPayload>): Promise<ShiftApi> {
  const response = await request<{ data: ShiftApi }>(`/shifts/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export type AttendanceApi = {
  id: string;
  employee_id: string;
  employee_name?: string;
  shift_id?: string | null;
  attendance_date: string;
  check_in?: string | null;
  check_out?: string | null;
  source: "fingerprint" | "manual";
  status: "present" | "late" | "absent";
  notes?: string | null;
};

export type AttendanceSyncPayload = {
  employee_id: string;
  attendance_date: string;
  check_in?: string | null;
  check_out?: string | null;
  shift_id?: string | null;
  sync_key?: string;
  external_ref?: string;
  notes?: string;
};

export type AttendanceManualCorrectionPayload = {
  check_in?: string | null;
  check_out?: string | null;
  status?: AttendanceApi["status"];
  reason: string;
  notes?: string;
};

export async function listAttendances(): Promise<AttendanceApi[]> {
  const response = await request<ApiListResponse<AttendanceApi>>("/attendances");
  return response.data;
}

export async function syncAttendance(payload: AttendanceSyncPayload): Promise<AttendanceApi> {
  const response = await request<{ data: AttendanceApi }>("/attendances/sync", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function manualCorrectAttendance(
  attendanceId: string,
  payload: AttendanceManualCorrectionPayload
): Promise<AttendanceApi> {
  const response = await request<{ data: AttendanceApi }>(`/attendances/${attendanceId}/manual-correction`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export type PayrollAttendanceSummary = {
  lateCount?: number;
  absentCount?: number;
  overtimeMinutes?: number;
};

export type PayrollApi = {
  id: string;
  employee_id: string;
  employee_name?: string;
  period_start: string;
  period_end: string;
  basic_salary: number;
  allowances?: number;
  deductions?: number;
  net_salary?: number;
  attendance_summary?: PayrollAttendanceSummary;
};

export type PayrollPayload = {
  employee_id: string;
  period_start: string;
  period_end: string;
  basic_salary: number;
  allowances?: number;
  deductions?: number;
};

export async function listPayrolls(): Promise<PayrollApi[]> {
  const response = await request<ApiListResponse<PayrollApi>>("/payrolls");
  return response.data;
}

export async function createPayroll(payload: PayrollPayload): Promise<PayrollApi> {
  const response = await request<{ data: PayrollApi }>("/payrolls", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}
