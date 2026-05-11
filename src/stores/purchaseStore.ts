import { create } from "zustand";
import {
  createPurchaseInvoicePayment,
  createGoodsReceipt,
  createPurchaseInvoice,
  createPurchaseOrder,
  createPurchaseRequest,
  listGoodsReceipts,
  listPurchaseInvoices,
  listPurchaseOrders,
  listPurchaseRequests,
  updatePurchaseInvoice,
  updatePurchaseOrder,
  updatePurchaseRequest,
  type GoodsReceiptApiRow,
  type PurchaseInvoiceApiRow,
  type PurchaseOrderApiRow,
  type PurchaseRequestApiRow,
} from "@/lib/api-integration/purchaseEndpoints";
import { useOutletStore } from "./outletStore";

// ── Types ──────────────────────────────────────────────

export type Supplier = {
  id: string;
  name: string;
  contact?: string;
  email?: string;
};

export type PRStatus = "draft" | "submitted" | "approved" | "rejected";
export type POStatus = "draft" | "sent" | "partial" | "completed";
export type GRNStatus = "pending" | "received";
export type InvoiceStatus = "unpaid" | "partial" | "paid";

export type PRItem = {
  id?: string;
  inventoryItemId: string;
  qty: number;
  fulfilledQty?: number;
  remainingQty?: number;
  unit: string;
  notes?: string;
};

export type PurchaseRequest = {
  id: string;
  prNumber: string;
  date: string;
  outlet: string;
  requestedBy: string;
  status: PRStatus;
  notes?: string;
  items: PRItem[];
  createdAt: string;
};

export type POItem = {
  inventoryItemId: string;
  qty: number;
  prItemId?: string;
  requestedQty?: number;
  isFromPr?: boolean;
  unit: string;
  price: number;
  receivedQty: number;
};

export type PurchaseOrder = {
  id: string;
  poNumber: string;
  supplierId: string;
  date: string;
  referencePR?: string;
  status: POStatus;
  notes?: string;
  items: POItem[];
  createdAt: string;
};

export type GRNItem = {
  inventoryItemId: string;
  orderedQty: number;
  receivedQty: number;
  unit: string;
};

export type GoodsReceipt = {
  id: string;
  grnNumber: string;
  poReference: string;
  date: string;
  status: GRNStatus;
  items: GRNItem[];
  createdAt: string;
};

export type PurchaseInvoice = {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  poReference: string;
  grReference?: string;
  date: string;
  status: InvoiceStatus;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  tax: number;
  items: { inventoryItemId: string; qty: number; unit: string; price: number }[];
  payments: { id: string; date: string; amount: number; paymentMethod: "cash" | "bank"; referenceNo?: string; notes?: string }[];
  createdAt: string;
};

// ── Store ──────────────────────────────────────────────

type PurchaseStore = {
  suppliers: Supplier[];
  purchaseRequests: PurchaseRequest[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  invoices: PurchaseInvoice[];
  loading: boolean;

  fetchPurchaseRequests: () => Promise<void>;
  fetchPurchaseOrders: () => Promise<void>;
  fetchGoodsReceipts: () => Promise<void>;
  fetchPurchaseInvoices: () => Promise<void>;

  addSupplier: (s: Omit<Supplier, "id">) => string;

  // PR
  addPR: (pr: Omit<PurchaseRequest, "id" | "prNumber" | "createdAt">) => Promise<string>;
  updatePR: (id: string, data: Partial<PurchaseRequest>) => Promise<void>;

  // PO
  addPO: (po: Omit<PurchaseOrder, "id" | "poNumber" | "createdAt">) => Promise<string>;
  updatePO: (id: string, data: Partial<PurchaseOrder>) => Promise<void>;
  createPOFromPR: (prId: string, supplierId: string) => Promise<string | null>;

  // GRN
  addGRN: (grn: Omit<GoodsReceipt, "id" | "grnNumber" | "createdAt">) => Promise<string>;
  confirmGRN: (id: string) => Promise<void>;

  // Invoice
  addInvoice: (inv: {
    supplierId: string;
    poReference: string;
    grReference?: string;
    date: string;
    status: InvoiceStatus;
    tax: number;
    items: { inventoryItemId: string; qty: number; unit: string; price: number }[];
  }) => Promise<string>;
  updateInvoice: (id: string, data: Partial<PurchaseInvoice>) => Promise<void>;
  addInvoicePayment: (
    id: string,
    payment: { date: string; amount: number; paymentMethod: "cash" | "bank"; referenceNo?: string; notes?: string },
  ) => Promise<void>;
};

let nextId = 1;
const uid = () => `pur-${nextId++}`;
const PURCHASE_TENANT_ID = Number(import.meta.env.VITE_API_TENANT_ID ?? 1) || 1;

function getActiveScope() {
  const outletId = useOutletStore.getState().activeOutletId;
  return {
    tenantId: PURCHASE_TENANT_ID,
    ...(typeof outletId === "number" && outletId >= 1 ? { outletId } : {}),
  };
}

const defaultSuppliers: Supplier[] = [
  { id: "sup-1", name: "PT Sumber Pangan", contact: "08123456789", email: "info@sumberpangan.id" },
  { id: "sup-2", name: "CV Maju Bersama", contact: "08198765432", email: "order@majubersama.id" },
  { id: "sup-3", name: "UD Tani Makmur", contact: "08111222333", email: "sales@tanimakmur.id" },
];

const mapPurchaseRequest = (row: PurchaseRequestApiRow): PurchaseRequest => ({
  id: row.id,
  prNumber: row.prNumber,
  date: row.date,
  outlet: row.outlet || "Main Outlet",
  requestedBy: row.requestedBy,
  status: row.status,
  notes: row.notes ?? undefined,
  items: row.items.map((item) => ({
    id: item.id,
    inventoryItemId: item.inventoryItemId,
    qty: item.qty,
    fulfilledQty: item.fulfilledQty ?? 0,
    remainingQty: item.remainingQty ?? Math.max(0, item.qty - (item.fulfilledQty ?? 0)),
    unit: item.unit,
    notes: item.notes ?? undefined,
  })),
  createdAt: row.createdAt,
});

const mapPurchaseOrder = (row: PurchaseOrderApiRow): PurchaseOrder => ({
  id: row.id,
  poNumber: row.poNumber,
  supplierId: row.supplierId,
  date: row.date,
  referencePR: row.referencePR ?? undefined,
  status: row.status,
  notes: row.notes ?? undefined,
  items: row.items.map((item) => ({
    inventoryItemId: item.inventoryItemId,
    qty: item.qty,
    prItemId: item.prItemId ?? undefined,
    requestedQty: item.requestedQty ?? undefined,
    isFromPr: item.isFromPr ?? false,
    unit: item.unit ?? "",
    price: item.price,
    receivedQty: item.receivedQty,
  })),
  createdAt: row.createdAt,
});

const mapGoodsReceipt = (row: GoodsReceiptApiRow): GoodsReceipt => ({
  id: row.id,
  grnNumber: row.grnNumber,
  poReference: row.poReference,
  date: row.date,
  status: row.status,
  items: row.items.map((item) => ({
    inventoryItemId: item.inventoryItemId,
    orderedQty: item.orderedQty,
    receivedQty: item.receivedQty,
    unit: item.unit ?? "",
  })),
  createdAt: row.createdAt,
});

const mapPurchaseInvoice = (row: PurchaseInvoiceApiRow): PurchaseInvoice => ({
  id: row.id,
  invoiceNumber: row.invoiceNumber,
  supplierId: row.supplierId,
  poReference: row.poReference,
  grReference: row.grReference,
  date: row.date,
  status: row.status,
  total: row.total,
  paidAmount: row.paidAmount,
  remainingAmount: row.remainingAmount,
  tax: row.tax,
  items: row.items.map((item) => ({
    inventoryItemId: item.inventoryItemId,
    qty: item.qty,
    unit: item.unit,
    price: item.price,
  })),
  payments: row.payments.map((payment) => ({
    id: payment.id,
    date: payment.date,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    referenceNo: payment.referenceNo ?? undefined,
    notes: payment.notes ?? undefined,
  })),
  createdAt: row.createdAt,
});

export const usePurchaseStore = create<PurchaseStore>((set, get) => ({
  suppliers: defaultSuppliers,
  purchaseRequests: [],
  purchaseOrders: [],
  goodsReceipts: [],
  invoices: [],
  loading: false,

  fetchPurchaseRequests: async () => {
    set({ loading: true });
    try {
      const rows = await listPurchaseRequests(getActiveScope());
      set({ purchaseRequests: rows.map(mapPurchaseRequest), loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  fetchPurchaseOrders: async () => {
    set({ loading: true });
    try {
      const rows = await listPurchaseOrders(getActiveScope());
      set({ purchaseOrders: rows.map(mapPurchaseOrder), loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  fetchGoodsReceipts: async () => {
    set({ loading: true });
    try {
      const rows = await listGoodsReceipts(getActiveScope());
      set({ goodsReceipts: rows.map(mapGoodsReceipt), loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  fetchPurchaseInvoices: async () => {
    set({ loading: true });
    try {
      const rows = await listPurchaseInvoices(getActiveScope());
      set({ invoices: rows.map(mapPurchaseInvoice), loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  addSupplier: (s) => {
    const id = uid();
    set((st) => ({ suppliers: [...st.suppliers, { ...s, id }] }));
    return id;
  },

  // ── PR ──
  addPR: async (pr) => {
    const created = await createPurchaseRequest({
      date: pr.date,
      outlet: pr.outlet,
      requestedBy: pr.requestedBy,
      status: pr.status,
      notes: pr.notes,
      items: pr.items.map((item) => ({
        inventoryItemId: item.inventoryItemId,
        qty: item.qty,
        unit: item.unit,
        notes: item.notes,
      })),
    });
    await get().fetchPurchaseRequests();
    return created.id;
  },
  updatePR: async (id, data) => {
    await updatePurchaseRequest(id, {
      date: data.date,
      outlet: data.outlet,
      requestedBy: data.requestedBy,
      status: data.status,
      notes: data.notes ?? null,
      items: data.items?.map((item) => ({
        inventoryItemId: item.inventoryItemId,
        qty: item.qty,
        unit: item.unit,
        notes: item.notes,
      })),
    });
    await get().fetchPurchaseRequests();
  },

  // ── PO ──
  addPO: async (po) => {
    const prId = get().purchaseRequests.find((pr) => pr.prNumber === po.referencePR)?.id;
    const created = await createPurchaseOrder({
      date: po.date,
      supplierId: po.supplierId,
      purchaseRequestId: prId,
      status: po.status,
      notes: po.notes,
      items: po.items.map((item) => ({
        inventoryItemId: item.inventoryItemId,
        qty: item.qty,
        unit: item.unit,
        price: item.price,
        prItemId: item.prItemId,
        requestedQty: item.requestedQty,
        isFromPr: item.isFromPr,
      })),
    });
    await get().fetchPurchaseOrders();
    return created.id;
  },
  updatePO: async (id, data) => {
    const prId = data.referencePR ? get().purchaseRequests.find((pr) => pr.prNumber === data.referencePR)?.id : undefined;
    await updatePurchaseOrder(id, {
      date: data.date,
      supplierId: data.supplierId,
      purchaseRequestId: prId,
      status: data.status,
      notes: data.notes ?? null,
      items: data.items?.map((item) => ({
        inventoryItemId: item.inventoryItemId,
        qty: item.qty,
        unit: item.unit,
        price: item.price,
        prItemId: item.prItemId,
        requestedQty: item.requestedQty,
        isFromPr: item.isFromPr,
      })),
    });
    await get().fetchPurchaseOrders();
  },

  createPOFromPR: async (prId, supplierId) => {
    const pr = get().purchaseRequests.find((p) => p.id === prId);
    if (!pr) return null;
    const created = await createPurchaseOrder({
      date: new Date().toISOString().slice(0, 10),
      supplierId,
      purchaseRequestId: pr.id,
      status: "draft",
      notes: "",
      items: pr.items.map((item) => ({
        inventoryItemId: item.inventoryItemId,
        qty: item.remainingQty ?? item.qty,
        prItemId: item.id,
        requestedQty: item.qty,
        isFromPr: true,
        unit: item.unit,
        price: 0,
      })),
    });
    await get().fetchPurchaseOrders();
    return created.id;
  },

  // ── GRN ──
  addGRN: async (grn) => {
    const po = get().purchaseOrders.find((p) => p.poNumber === grn.poReference);
    if (!po) {
      throw new Error("PO not found");
    }

    const created = await createGoodsReceipt({
      purchaseOrderId: po.id,
      date: grn.date,
      items: grn.items.map((item) => ({
        inventoryItemId: item.inventoryItemId,
        receivedQty: item.receivedQty,
      })),
    });

    await Promise.all([get().fetchGoodsReceipts(), get().fetchPurchaseOrders()]);
    return created.id;
  },

  confirmGRN: async (_id) => {
    await Promise.all([get().fetchGoodsReceipts(), get().fetchPurchaseOrders()]);
  },

  // ── Invoice ──
  addInvoice: async (inv) => {
    const po = get().purchaseOrders.find((order) => order.poNumber === inv.poReference);
    if (!po) throw new Error("Purchase order not found");
    const gr = get().goodsReceipts.find((receipt) =>
      inv.grReference ? receipt.grnNumber === inv.grReference : receipt.poReference === po.poNumber
    );
    if (!gr) throw new Error("Goods receipt not found for selected PO");

    const created = await createPurchaseInvoice({
      purchaseOrderId: po.id,
      goodsReceiptId: gr.id,
      date: inv.date,
      tax: inv.tax,
    });
    await get().fetchPurchaseInvoices();
    return created.id;
  },
  updateInvoice: async (id, data) => {
    if (!data.status) return;
    await updatePurchaseInvoice(id, { status: data.status });
    await get().fetchPurchaseInvoices();
  },
  addInvoicePayment: async (id, payment) => {
    await createPurchaseInvoicePayment(id, payment);
    await get().fetchPurchaseInvoices();
  },
}));
