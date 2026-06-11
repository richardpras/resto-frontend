import { apiRequest } from "./client";

export type ProductionStationApi = {
  id: number;
  tenantId?: number | null;
  outletId: number;
  code: string;
  name: string;
  type: string;
  displayOrder: number;
  isActive: boolean;
  kdsEnabled: boolean;
  printEnabled: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ProductionStationPayload = {
  outletId: number;
  tenantId?: number;
  code?: string;
  name: string;
  type?: string;
  displayOrder?: number;
  isActive?: boolean;
  kdsEnabled?: boolean;
  printEnabled?: boolean;
};

export async function listProductionStations(
  outletId: number,
  options?: { activeOnly?: boolean },
): Promise<ProductionStationApi[]> {
  const query = new URLSearchParams({ outletId: String(outletId) });
  if (options?.activeOnly) {
    query.set("activeOnly", "1");
  }
  const response = await apiRequest<{ data: ProductionStationApi[] }>(`/production-stations?${query.toString()}`);
  return response.data;
}

export async function createProductionStation(payload: ProductionStationPayload): Promise<ProductionStationApi> {
  const response = await apiRequest<{ data: ProductionStationApi }>("/production-stations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateProductionStation(
  id: number,
  payload: Partial<Omit<ProductionStationPayload, "outletId">>,
): Promise<ProductionStationApi> {
  const response = await apiRequest<{ data: ProductionStationApi }>(`/production-stations/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateProductionStationStatus(id: number, isActive: boolean): Promise<ProductionStationApi> {
  const response = await apiRequest<{ data: ProductionStationApi }>(`/production-stations/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
  return response.data;
}
