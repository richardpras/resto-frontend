import { apiRequest } from "./client";

type ListEnvelope<T> = { data: T[] };

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
