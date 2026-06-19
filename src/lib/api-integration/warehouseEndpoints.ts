import { apiRequest } from "./client";

type ListEnvelope<T> = { data: T[] };
type ItemEnvelope<T> = { message?: string; data: T };

export type WarehouseApiRow = {
  id: string;
  outletId?: string | null;
  code: string;
  name: string;
  type: string;
  isActive: boolean;
};

type WarehouseScopeQuery = { outletId?: number };

function toQuery(params?: WarehouseScopeQuery): string {
  const query = new URLSearchParams();
  if (params?.outletId !== undefined) query.set("outletId", String(params.outletId));
  const queryString = query.toString();
  return queryString.length > 0 ? `?${queryString}` : "";
}

export async function listWarehouses(params?: WarehouseScopeQuery): Promise<WarehouseApiRow[]> {
  const res = await apiRequest<ListEnvelope<WarehouseApiRow>>(`/warehouses${toQuery(params)}`);
  return res.data;
}

export async function createWarehouse(payload: {
  outletId: number;
  code: string;
  name: string;
  type?: string;
  isActive?: boolean;
}): Promise<WarehouseApiRow> {
  const res = await apiRequest<ItemEnvelope<WarehouseApiRow>>("/warehouses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateWarehouse(
  id: string | number,
  payload: Partial<{ code: string; name: string; type: string; isActive: boolean }>,
): Promise<WarehouseApiRow> {
  const res = await apiRequest<ItemEnvelope<WarehouseApiRow>>(`/warehouses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deactivateWarehouse(id: string | number): Promise<WarehouseApiRow> {
  const res = await apiRequest<ItemEnvelope<WarehouseApiRow>>(`/warehouses/${id}`, {
    method: "DELETE",
  });
  return res.data;
}
