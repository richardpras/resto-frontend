import { apiRequest } from "./client";

type ListEnvelope<T> = { data: T[] };
type MessageItemEnvelope<T> = { message?: string; data: T };

export type ProcurementSettingApiRow = {
  id: string;
  inventoryItemId: string;
  inventoryItemName?: string | null;
  preferredSupplierId?: string | null;
  preferredSupplierName?: string | null;
  minimumOrderQty?: number | null;
  reorderQty?: number | null;
  leadTimeDays?: number | null;
  lastPurchasePrice?: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export async function listProcurementSettings(inventoryItemId?: string): Promise<ProcurementSettingApiRow[]> {
  const query = inventoryItemId ? `?inventoryItemId=${inventoryItemId}` : "";
  const res = await apiRequest<ListEnvelope<ProcurementSettingApiRow>>(`/procurement-settings${query}`);
  return res.data;
}

export async function createProcurementSetting(payload: {
  inventoryItemId: string;
  preferredSupplierId?: string;
  minimumOrderQty?: number;
  reorderQty?: number;
  leadTimeDays?: number;
  lastPurchasePrice?: number;
  isActive?: boolean;
}): Promise<ProcurementSettingApiRow> {
  const res = await apiRequest<MessageItemEnvelope<ProcurementSettingApiRow>>("/procurement-settings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateProcurementSetting(
  id: string | number,
  payload: Partial<{
    preferredSupplierId: string | null;
    minimumOrderQty: number | null;
    reorderQty: number | null;
    leadTimeDays: number | null;
    lastPurchasePrice: number | null;
    isActive: boolean;
  }>,
): Promise<ProcurementSettingApiRow> {
  const res = await apiRequest<MessageItemEnvelope<ProcurementSettingApiRow>>(`/procurement-settings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteProcurementSetting(id: string | number): Promise<void> {
  await apiRequest<{ message: string }>(`/procurement-settings/${id}`, { method: "DELETE" });
}
