import { create } from "zustand";
import { useInventoryStore } from "./inventoryStore";

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
export type InvoiceStatus = "unpaid" | "paid";

export type PRItem = {
  inventoryItemId: string;
  qty: number;
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
  date: string;
  status: InvoiceStatus;
  tax: number;
  items: { inventoryItemId: string; qty: number; unit: string; price: number }[];
  createdAt: string;
};

// ── Store ──────────────────────────────────────────────

type PurchaseStore = {
  suppliers: Supplier[];
  purchaseRequests: PurchaseRequest[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  invoices: PurchaseInvoice[];

  addSupplier: (s: Omit<Supplier, "id">) => string;

  // PR
  addPR: (pr: Omit<PurchaseRequest, "id" | "prNumber" | "createdAt">) => string;
  updatePR: (id: string, data: Partial<PurchaseRequest>) => void;

  // PO
  addPO: (po: Omit<PurchaseOrder, "id" | "poNumber" | "createdAt">) => string;
  updatePO: (id: string, data: Partial<PurchaseOrder>) => void;
  createPOFromPR: (prId: string, supplierId: string) => string | null;

  // GRN
  addGRN: (grn: Omit<GoodsReceipt, "id" | "grnNumber" | "createdAt">) => string;
  confirmGRN: (id: string) => void;

  // Invoice
  addInvoice: (inv: Omit<PurchaseInvoice, "id" | "invoiceNumber" | "createdAt">) => string;
  updateInvoice: (id: string, data: Partial<PurchaseInvoice>) => void;
};

let nextId = 1;
const uid = () => `pur-${nextId++}`;
let prSeq = 1;
let poSeq = 1;
let grnSeq = 1;
let invSeq = 1;

const pad = (n: number) => String(n).padStart(4, "0");

const defaultSuppliers: Supplier[] = [
  { id: "sup-1", name: "PT Sumber Pangan", contact: "08123456789", email: "info@sumberpangan.id" },
  { id: "sup-2", name: "CV Maju Bersama", contact: "08198765432", email: "order@majubersama.id" },
  { id: "sup-3", name: "UD Tani Makmur", contact: "08111222333", email: "sales@tanimakmur.id" },
];

export const usePurchaseStore = create<PurchaseStore>((set, get) => ({
  suppliers: defaultSuppliers,
  purchaseRequests: [],
  purchaseOrders: [],
  goodsReceipts: [],
  invoices: [],

  addSupplier: (s) => {
    const id = uid();
    set((st) => ({ suppliers: [...st.suppliers, { ...s, id }] }));
    return id;
  },

  // ── PR ──
  addPR: (pr) => {
    const id = uid();
    const prNumber = `PR-${pad(prSeq++)}`;
    set((st) => ({
      purchaseRequests: [...st.purchaseRequests, { ...pr, id, prNumber, createdAt: new Date().toISOString() }],
    }));
    return id;
  },
  updatePR: (id, data) =>
    set((st) => ({
      purchaseRequests: st.purchaseRequests.map((p) => (p.id === id ? { ...p, ...data } : p)),
    })),

  // ── PO ──
  addPO: (po) => {
    const id = uid();
    const poNumber = `PO-${pad(poSeq++)}`;
    set((st) => ({
      purchaseOrders: [...st.purchaseOrders, { ...po, id, poNumber, createdAt: new Date().toISOString() }],
    }));
    return id;
  },
  updatePO: (id, data) =>
    set((st) => ({
      purchaseOrders: st.purchaseOrders.map((p) => (p.id === id ? { ...p, ...data } : p)),
    })),

  createPOFromPR: (prId, supplierId) => {
    const pr = get().purchaseRequests.find((p) => p.id === prId);
    if (!pr) return null;
    const poItems: POItem[] = pr.items.map((i) => ({
      inventoryItemId: i.inventoryItemId,
      qty: i.qty,
      unit: i.unit,
      price: 0,
      receivedQty: 0,
    }));
    const id = uid();
    const poNumber = `PO-${pad(poSeq++)}`;
    set((st) => ({
      purchaseOrders: [
        ...st.purchaseOrders,
        {
          id,
          poNumber,
          supplierId,
          date: new Date().toISOString().slice(0, 10),
          referencePR: pr.prNumber,
          status: "draft" as POStatus,
          items: poItems,
          notes: "",
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    return id;
  },

  // ── GRN ──
  addGRN: (grn) => {
    const id = uid();
    const grnNumber = `GRN-${pad(grnSeq++)}`;
    set((st) => ({
      goodsReceipts: [...st.goodsReceipts, { ...grn, id, grnNumber, createdAt: new Date().toISOString() }],
    }));
    return id;
  },

  confirmGRN: (id) => {
    const grn = get().goodsReceipts.find((g) => g.id === id);
    if (!grn || grn.status === "received") return;

    // Update stock
    const { updateIngredientStock, ingredients } = useInventoryStore.getState();
    grn.items.forEach((item) => {
      const inv = ingredients.find((i) => i.id === item.inventoryItemId);
      if (inv) {
        updateIngredientStock(item.inventoryItemId, inv.stock + item.receivedQty);
      }
    });

    // Update PO received quantities
    const po = get().purchaseOrders.find((p) => p.poNumber === grn.poReference);
    if (po) {
      const updatedItems = po.items.map((poItem) => {
        const grnItem = grn.items.find((g) => g.inventoryItemId === poItem.inventoryItemId);
        if (grnItem) {
          return { ...poItem, receivedQty: poItem.receivedQty + grnItem.receivedQty };
        }
        return poItem;
      });
      const allReceived = updatedItems.every((i) => i.receivedQty >= i.qty);
      const someReceived = updatedItems.some((i) => i.receivedQty > 0);
      set((st) => ({
        purchaseOrders: st.purchaseOrders.map((p) =>
          p.id === po.id
            ? { ...p, items: updatedItems, status: allReceived ? "completed" : someReceived ? "partial" : p.status }
            : p
        ),
      }));
    }

    set((st) => ({
      goodsReceipts: st.goodsReceipts.map((g) => (g.id === id ? { ...g, status: "received" as GRNStatus } : g)),
    }));
  },

  // ── Invoice ──
  addInvoice: (inv) => {
    const id = uid();
    const invoiceNumber = `INV-${pad(invSeq++)}`;
    set((st) => ({
      invoices: [...st.invoices, { ...inv, id, invoiceNumber, createdAt: new Date().toISOString() }],
    }));
    return id;
  },
  updateInvoice: (id, data) =>
    set((st) => ({
      invoices: st.invoices.map((i) => (i.id === id ? { ...i, ...data } : i)),
    })),
}));
