import { create } from "zustand";
import type { SupplierApiRow, SupplierPayload } from "@/lib/api-integration/suppliersEndpoints";
import {
  createSupplier as apiCreateSupplier,
  deleteSupplier,
  listSuppliers,
  toggleSupplierStatus as apiToggleSupplierStatus,
  updateSupplier as apiUpdateSupplier,
} from "@/lib/api-integration/suppliersEndpoints";

export type SupplierStatus = "active" | "inactive";

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  address: string;
  notes?: string;
  status: SupplierStatus;
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
}

function mapSupplier(row: SupplierApiRow): Supplier {
  return {
    id: String(row.id),
    name: row.name,
    contact: row.contact ?? "",
    email: row.email ?? "",
    address: row.address ?? "",
    notes: row.notes ?? undefined,
    status: row.status,
    paymentTermDays: row.paymentTermDays ?? null,
    leadTimeDays: row.leadTimeDays ?? null,
    taxNumber: row.taxNumber ?? null,
    taxName: row.taxName ?? null,
    taxAddress: row.taxAddress ?? null,
    contactPerson: row.contactPerson ?? null,
    contactPhone: row.contactPhone ?? null,
    contactEmail: row.contactEmail ?? null,
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}

interface SupplierStore {
  suppliers: Supplier[];
  loading: boolean;
  fetchSuppliers: () => Promise<void>;
  addSupplier: (s: Omit<Supplier, "id" | "createdAt" | "isActive"> & { isActive?: boolean }) => Promise<void>;
  updateSupplier: (id: string, s: Partial<Supplier>) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
  removeSupplier: (id: string) => Promise<void>;
}

function toApiPayload(s: Partial<Supplier>): Partial<SupplierPayload> & Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (s.name !== undefined) payload.name = s.name;
  if (s.contact !== undefined) payload.contact = s.contact || undefined;
  if (s.email !== undefined) payload.email = s.email || undefined;
  if (s.address !== undefined) payload.address = s.address || undefined;
  if (s.notes !== undefined) payload.notes = s.notes || undefined;
  if (s.status !== undefined) payload.status = s.status;
  if (s.paymentTermDays !== undefined) payload.paymentTermDays = s.paymentTermDays ?? undefined;
  if (s.leadTimeDays !== undefined) payload.leadTimeDays = s.leadTimeDays ?? undefined;
  if (s.taxNumber !== undefined) payload.taxNumber = s.taxNumber || undefined;
  if (s.taxName !== undefined) payload.taxName = s.taxName || undefined;
  if (s.taxAddress !== undefined) payload.taxAddress = s.taxAddress || undefined;
  if (s.contactPerson !== undefined) payload.contactPerson = s.contactPerson || undefined;
  if (s.contactPhone !== undefined) payload.contactPhone = s.contactPhone || undefined;
  if (s.contactEmail !== undefined) payload.contactEmail = s.contactEmail || undefined;
  if (s.isActive !== undefined) payload.isActive = s.isActive;
  return payload;
}

export const useSupplierStore = create<SupplierStore>((set, get) => ({
  suppliers: [],
  loading: false,

  fetchSuppliers: async () => {
    set({ loading: true });
    try {
      const rows = await listSuppliers();
      set({ suppliers: rows.map(mapSupplier), loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  addSupplier: async (s) => {
    await apiCreateSupplier({
      name: s.name.trim(),
      contact: s.contact?.trim() || undefined,
      email: s.email?.trim() || undefined,
      address: s.address?.trim() || undefined,
      notes: s.notes?.trim() || undefined,
      status: s.status,
      paymentTermDays: s.paymentTermDays ?? undefined,
      leadTimeDays: s.leadTimeDays ?? undefined,
      taxNumber: s.taxNumber ?? undefined,
      taxName: s.taxName ?? undefined,
      taxAddress: s.taxAddress ?? undefined,
      contactPerson: s.contactPerson ?? undefined,
      contactPhone: s.contactPhone ?? undefined,
      contactEmail: s.contactEmail ?? undefined,
      isActive: s.isActive ?? s.status === "active",
    });
    await get().fetchSuppliers();
  },

  updateSupplier: async (id, s) => {
    await apiUpdateSupplier(id, toApiPayload(s));
    await get().fetchSuppliers();
  },

  toggleStatus: async (id) => {
    await apiToggleSupplierStatus(id);
    await get().fetchSuppliers();
  },

  removeSupplier: async (id) => {
    await deleteSupplier(id);
    await get().fetchSuppliers();
  },
}));
