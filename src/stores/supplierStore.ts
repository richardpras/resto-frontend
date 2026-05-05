import { create } from "zustand";
import type { SupplierApiRow } from "@/lib/api-integration/suppliersEndpoints";
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
    createdAt: row.createdAt,
  };
}

interface SupplierStore {
  suppliers: Supplier[];
  loading: boolean;
  fetchSuppliers: () => Promise<void>;
  addSupplier: (s: Omit<Supplier, "id" | "createdAt">) => Promise<void>;
  updateSupplier: (id: string, s: Partial<Supplier>) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
  removeSupplier: (id: string) => Promise<void>;
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
    });
    await get().fetchSuppliers();
  },

  updateSupplier: async (id, s) => {
    const payload: Parameters<typeof apiUpdateSupplier>[1] = {};
    if (s.name !== undefined) payload.name = s.name;
    if (s.contact !== undefined) payload.contact = s.contact || null;
    if (s.email !== undefined) payload.email = s.email || null;
    if (s.address !== undefined) payload.address = s.address || null;
    if (s.notes !== undefined) payload.notes = s.notes || null;
    if (s.status !== undefined) payload.status = s.status;

    await apiUpdateSupplier(id, payload);
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
