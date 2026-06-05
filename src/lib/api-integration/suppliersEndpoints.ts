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
  paymentTermDays?: number | null;
  leadTimeDays?: number | null;
  taxNumber?: string | null;
  taxName?: string | null;
  taxAddress?: string | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  isActive: boolean;
  createdAt: string;
};

export type SupplierPayload = {
  name: string;
  contact?: string;
  email?: string;
  address?: string;
  notes?: string;
  status: "active" | "inactive";
  paymentTermDays?: number;
  leadTimeDays?: number;
  taxNumber?: string;
  taxName?: string;
  taxAddress?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  isActive?: boolean;
};

export async function listSuppliers(): Promise<SupplierApiRow[]> {
  const res = await apiRequest<ListEnvelope<SupplierApiRow>>("/suppliers");
  return res.data;
}

export async function createSupplier(payload: SupplierPayload): Promise<SupplierApiRow> {
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
    paymentTermDays: number | null;
    leadTimeDays: number | null;
    taxNumber: string | null;
    taxName: string | null;
    taxAddress: string | null;
    contactPerson: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    isActive: boolean;
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
