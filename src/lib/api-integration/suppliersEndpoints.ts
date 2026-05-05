import { apiRequest } from "./client";

type ListEnvelope<T> = { data: T[] };
type MessageItemEnvelope<T> = { message?: string; data: T };

export type SupplierApiRow = {
  id: string;
  name: string;
  contact: string;
  email: string;
  address: string;
  notes?: string | null;
  status: "active" | "inactive";
  createdAt: string;
};

export async function listSuppliers(): Promise<SupplierApiRow[]> {
  const res = await apiRequest<ListEnvelope<SupplierApiRow>>("/suppliers");
  return res.data;
}

export async function createSupplier(payload: {
  name: string;
  contact?: string;
  email?: string;
  address?: string;
  notes?: string;
  status: "active" | "inactive";
}): Promise<SupplierApiRow> {
  const res = await apiRequest<MessageItemEnvelope<SupplierApiRow>>("/suppliers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateSupplier(
  id: string | number,
  payload: Partial<{
    name: string;
    contact: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    status: "active" | "inactive";
  }>,
): Promise<SupplierApiRow> {
  const res = await apiRequest<MessageItemEnvelope<SupplierApiRow>>(`/suppliers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function toggleSupplierStatus(id: string | number): Promise<SupplierApiRow> {
  const res = await apiRequest<MessageItemEnvelope<SupplierApiRow>>(`/suppliers/${id}/status`, {
    method: "PATCH",
  });
  return res.data;
}

export async function deleteSupplier(id: string | number): Promise<void> {
  await apiRequest<{ message: string }>(`/suppliers/${id}`, {
    method: "DELETE",
  });
}
