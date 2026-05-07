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

export type InventoryListMeta = {
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
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

export type ListInventoryParams = {
  tenantId?: number;
  outletId?: number;
  page?: number;
  perPage?: number;
};

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

export type ListStockMovementsParams = {
  tenantId?: number;
  outletId?: number;
  page?: number;
  perPage?: number;
};

function mapMeta(meta: ApiListResponse<unknown>["meta"], fallbackCount: number): InventoryListMeta {
  return {
    currentPage: Number(meta?.currentPage ?? meta?.current_page ?? 1),
    perPage: Number(meta?.perPage ?? meta?.per_page ?? fallbackCount),
    total: Number(meta?.total ?? fallbackCount),
    lastPage: Number(meta?.lastPage ?? meta?.last_page ?? 1),
  };
}

function toQuery(params?: ListInventoryParams | ListStockMovementsParams): string {
  const query = new URLSearchParams();
  if (params?.tenantId !== undefined) query.set("tenantId", String(params.tenantId));
  if (params?.outletId !== undefined && params.outletId >= 1) query.set("outletId", String(params.outletId));
  if (params?.page !== undefined) query.set("page", String(params.page));
  if (params?.perPage !== undefined) query.set("perPage", String(params.perPage));
  const text = query.toString();
  return text.length > 0 ? `?${text}` : "";
}

export async function listInventoryWithMeta(
  params?: ListInventoryParams,
): Promise<{ items: InventoryItemApi[]; meta: InventoryListMeta }> {
  const response = await request<ApiListResponse<InventoryItemApi>>(`/ingredients${toQuery(params)}`);
  return {
    items: response.data,
    meta: mapMeta(response.meta, response.data.length),
  };
}

export async function createInventoryItem(payload: InventoryPayload): Promise<InventoryItemApi> {
  const response = await request<{ data: InventoryItemApi }>("/ingredients", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateInventoryItem(
  id: string,
  payload: Partial<InventoryPayload>,
): Promise<InventoryItemApi> {
  const response = await request<{ data: InventoryItemApi }>(`/ingredients/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await request<{ message: string }>(`/ingredients/${id}`, {
    method: "DELETE",
  });
}

export async function listStockMovementsWithMeta(
  params?: ListStockMovementsParams,
): Promise<{ movements: StockMovementApi[]; meta: InventoryListMeta }> {
  const response = await request<ApiListResponse<StockMovementApi>>(`/stock-movements${toQuery(params)}`);
  return {
    movements: response.data,
    meta: mapMeta(response.meta, response.data.length),
  };
}

export async function createStockMovement(payload: StockMovementPayload): Promise<StockMovementApi> {
  const response = await request<{ data: StockMovementApi }>("/stock-movements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}
