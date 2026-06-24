import { create } from "zustand";
import {
  approveSupplierPayment,
  createSupplierPayment,
  listSupplierPayments,
  postSupplierPayment,
  voidSupplierPayment,
  cancelGoodsReceipt,
  createGoodsReceipt,
  getGoodsReceiptProgress,
  postGoodsReceipt,
  receiveGoodsReceipt,
  approvePurchaseInvoice,
  createPurchaseInvoice,
  listSupplierPayables,
  submitPurchaseInvoice,
  voidPurchaseInvoice,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  approvePurchaseRequest,
  cancelPurchaseOrder,
  closePurchaseOrder,
  createPurchaseOrder,
  submitPurchaseOrder,
  cancelPurchaseRequest,
  convertPurchaseRequestToPo,
  createPurchaseRequest,
  listGoodsReceipts,
  rejectPurchaseRequest,
  submitPurchaseRequest,
  listPurchaseInvoices,
  listPurchaseOrders,
  listPurchaseRequests,
  updatePurchaseInvoice,
  updatePurchaseOrder,
  updatePurchaseRequest,
  type GoodsReceiptApiRow,
  type PurchaseInvoiceApiRow,
  type PostingStatusPayload,
  type SupplierPaymentApiRow,
  type PurchaseOrderApiRow,
  type PurchaseRequestApiRow,
} from "@/lib/api-integration/purchaseEndpoints";
import { useOutletStore } from "./outletStore";

// ── Types ──────────────────────────────────────────────

export type PRStatus = "draft" | "submitted" | "approved" | "rejected" | "converted" | "cancelled";
export type POStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "partially_received"
  | "received"
  | "cancelled"
  | "closed";
export type GRNStatus = "draft" | "received" | "posted" | "cancelled";
export type InvoiceStatus = "draft" | "submitted" | "approved" | "partial" | "paid" | "void";

export type PRItem = {
  id?: string;
  inventoryItemId: string;
  qty: number;
  fulfilledQty?: number;
  remainingQty?: number;
  unit: string;
  estimatedCost?: number;
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
  remainingQty?: number;
};

export type PurchaseOrder = {
  id: string;
  poNumber: string;
  supplierId: string;
  destinationWarehouseId?: string;
  date: string;
  referencePR?: string;
  sourceType?: "PR" | "DIRECT";
  status: POStatus;
  notes?: string;
  totalOrderedQty?: number;
  totalReceivedQty?: number;
  totalRemainingQty?: number;
  completionPercentage?: number;
  items: POItem[];
  goodsReceipts?: { id: string; grnNumber: string; date: string }[];
  createdAt: string;
};

export type GRNItem = {
  id?: string;
  inventoryItemId: string;
  ingredientName?: string | null;
  orderedQty: number;
  receivedQty: number;
  unitCost?: number;
  unit: string;
};

export type GoodsReceipt = {
  id: string;
  grnNumber: string;
  poReference: string;
  purchaseOrderId?: string;
  warehouseId?: string;
  date: string;
  status: GRNStatus;
  notes?: string;
  supplierDeliveryNo?: string;
  supplierDeliveryDate?: string;
  vehicleNo?: string;
  driverName?: string;
  receivedBy?: string;
  receivedValue?: number;
  relatedInvoiceCount?: number;
  items: GRNItem[];
  createdAt: string;
  postingStatus?: PostingStatusPayload | null;
};

export type SupplierPayment = {
  id: string;
  paymentNo: string;
  supplierId: string;
  supplierName?: string;
  paymentDate: string;
  paymentMethod: "cash" | "bank_transfer" | "giro" | "check" | "other";
  referenceNo?: string;
  notes?: string;
  amount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  status: "draft" | "approved" | "posted" | "void";
  allocations: Array<{ id: string; invoiceId: string; invoiceNumber?: string; allocatedAmount: number }>;
  createdAt: string;
  postingStatus?: PostingStatusPayload | null;
};

export type PurchaseInvoice = {
  id: string;
  invoiceNumber: string;
  supplierInvoiceNo?: string;
  supplierId: string;
  poReference: string;
  grReference?: string;
  purchaseOrderId?: string;
  goodsReceiptId?: string;
  date: string;
  dueDate?: string;
  status: InvoiceStatus;
  subtotal?: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  outstandingAmount?: number;
  tax: number;
  taxPercentage?: number;
  discountAmount?: number;
  notes?: string;
  items: { inventoryItemId: string; qty: number; invoicedQty?: number; unit: string; price: number }[];
  payments: { id: string; date: string; amount: number; paymentMethod: "cash" | "bank"; referenceNo?: string; notes?: string }[];
  createdAt: string;
  matchStatus?: "matched" | "matched_with_tolerance" | "mismatch" | "blocked" | null;
  matchQtyDifference?: number | null;
  matchPriceDifference?: number | null;
  matchAmountDifference?: number | null;
  postingStatus?: PostingStatusPayload | null;
};

// ── Store ──────────────────────────────────────────────

type PurchaseStore = {
  purchaseRequests: PurchaseRequest[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  invoices: PurchaseInvoice[];
  supplierPayments: SupplierPayment[];
  loading: boolean;

  fetchPurchaseRequests: () => Promise<void>;
  fetchPurchaseOrders: () => Promise<void>;
  fetchGoodsReceipts: () => Promise<void>;
  fetchPurchaseInvoices: () => Promise<void>;
  fetchSupplierPayments: () => Promise<void>;

  // PR
  addPR: (pr: Omit<PurchaseRequest, "id" | "prNumber" | "createdAt" | "status"> & { status?: PRStatus }) => Promise<string>;
  updatePR: (id: string, data: Partial<PurchaseRequest>) => Promise<void>;
  submitPR: (id: string) => Promise<void>;
  approvePR: (id: string) => Promise<void>;
  rejectPR: (id: string) => Promise<void>;
  cancelPR: (id: string) => Promise<void>;
  convertPRToPO: (id: string, supplierId: string) => Promise<string>;

  // PO
  addPO: (po: Omit<PurchaseOrder, "id" | "poNumber" | "createdAt" | "status"> & { status?: POStatus }) => Promise<string>;
  updatePO: (id: string, data: Partial<PurchaseOrder>) => Promise<void>;
  submitPO: (id: string) => Promise<void>;
  approvePO: (id: string) => Promise<void>;
  rejectPO: (id: string) => Promise<void>;
  cancelPO: (id: string) => Promise<void>;
  closePO: (id: string) => Promise<void>;
  createPOFromPR: (prId: string, supplierId: string) => Promise<string | null>;

  // GRN
  addGRN: (grn: Omit<GoodsReceipt, "id" | "grnNumber" | "createdAt"> & { warehouseId?: string }) => Promise<string>;
  receiveGRN: (id: string) => Promise<void>;
  postGRN: (id: string) => Promise<void>;
  cancelGRN: (id: string) => Promise<void>;
  getGRNProgress: (id: string) => Promise<{ orderedQty: number; receivedQty: number; remainingQty: number; completionPercentage: number }>;

  // Invoice
  addInvoice: (inv: {
    purchaseOrderId: string;
    goodsReceiptId: string;
    supplierInvoiceNo?: string;
    date: string;
    dueDate?: string;
    tax?: number;
    taxPercentage?: number;
    items?: Array<{ inventoryItemId: string; qty: number }>;
  }) => Promise<string>;
  submitInvoice: (id: string) => Promise<void>;
  approveInvoice: (id: string) => Promise<void>;
  voidInvoice: (id: string) => Promise<void>;
  updateInvoice: (id: string, data: Partial<PurchaseInvoice>) => Promise<void>;
  fetchSupplierPayables: () => Promise<import("@/lib/api-integration/purchaseEndpoints").SupplierPayableRow[]>;
  addSupplierPayment: (payload: {
    supplierId: string;
    paymentDate: string;
    paymentMethod?: SupplierPayment["paymentMethod"];
    bankAccountId?: string;
    referenceNo?: string;
    amount: number;
    allocations: Array<{ invoiceId: string; allocatedAmount: number }>;
  }) => Promise<string>;
  approveSupplierPaymentAction: (id: string) => Promise<void>;
  postSupplierPaymentAction: (id: string) => Promise<void>;
  voidSupplierPaymentAction: (id: string) => Promise<void>;
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

function requireActiveOutletId(): number {
  const outletId = useOutletStore.getState().activeOutletId;
  if (typeof outletId !== "number" || outletId < 1) {
    throw new Error("Active outlet is required for procurement operations.");
  }
  return outletId;
}

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
    estimatedCost: item.estimatedCost ?? undefined,
    notes: item.notes ?? undefined,
  })),
  createdAt: row.createdAt,
});

const mapPurchaseOrder = (row: PurchaseOrderApiRow): PurchaseOrder => ({
  id: row.id,
  poNumber: row.poNumber,
  supplierId: row.supplierId,
  destinationWarehouseId: row.destinationWarehouseId ?? undefined,
  date: row.date,
  referencePR: row.referencePR ?? undefined,
  sourceType: row.sourceType,
  status: row.status,
  notes: row.notes ?? undefined,
  totalOrderedQty: row.totalOrderedQty,
  totalReceivedQty: row.totalReceivedQty,
  totalRemainingQty: row.totalRemainingQty,
  completionPercentage: row.completionPercentage,
  items: row.items.map((item) => ({
    inventoryItemId: item.inventoryItemId,
    qty: item.qty,
    prItemId: item.prItemId ?? undefined,
    requestedQty: item.requestedQty ?? undefined,
    isFromPr: item.isFromPr ?? false,
    unit: item.unit ?? "",
    price: item.price,
    receivedQty: item.receivedQty,
    remainingQty: item.remainingQty,
  })),
  goodsReceipts: row.goodsReceipts,
  createdAt: row.createdAt,
});

const mapGoodsReceipt = (row: GoodsReceiptApiRow): GoodsReceipt => ({
  id: row.id,
  grnNumber: row.grnNumber,
  poReference: row.poReference,
  purchaseOrderId: row.purchaseOrderId ?? undefined,
  warehouseId: row.warehouseId ?? row.destinationWarehouseId ?? undefined,
  date: row.date,
  status: row.status,
  notes: row.notes ?? undefined,
  supplierDeliveryNo: row.supplierDeliveryNo ?? undefined,
  supplierDeliveryDate: row.supplierDeliveryDate ?? undefined,
  vehicleNo: row.vehicleNo ?? undefined,
  driverName: row.driverName ?? undefined,
  receivedBy: row.receivedBy ?? undefined,
  receivedValue: row.receivedValue,
  relatedInvoiceCount: row.relatedInvoiceCount,
  items: row.items.map((item) => ({
    id: item.id,
    inventoryItemId: item.inventoryItemId,
    ingredientName: item.ingredientName ?? undefined,
    orderedQty: item.orderedQty,
    receivedQty: item.receivedQty,
    unitCost: item.unitCost,
    unit: item.unit ?? "",
  })),
  createdAt: row.createdAt,
  postingStatus: row.postingStatus ?? undefined,
});

const mapSupplierPayment = (row: SupplierPaymentApiRow): SupplierPayment => ({
  id: row.id,
  paymentNo: row.paymentNo,
  supplierId: row.supplierId,
  supplierName: row.supplierName ?? undefined,
  paymentDate: row.paymentDate,
  paymentMethod: row.paymentMethod,
  referenceNo: row.referenceNo ?? undefined,
  notes: row.notes ?? undefined,
  amount: row.amount,
  allocatedAmount: row.allocatedAmount,
  unallocatedAmount: row.unallocatedAmount,
  status: row.status,
  allocations: row.allocations,
  createdAt: row.createdAt,
  postingStatus: row.postingStatus ?? undefined,
});

const mapPurchaseInvoice = (row: PurchaseInvoiceApiRow): PurchaseInvoice => ({
  id: row.id,
  invoiceNumber: row.invoiceNumber,
  supplierInvoiceNo: row.supplierInvoiceNo ?? undefined,
  supplierId: row.supplierId,
  poReference: row.poReference,
  grReference: row.grReference,
  purchaseOrderId: row.purchaseOrderId ?? undefined,
  goodsReceiptId: row.goodsReceiptId ?? undefined,
  date: row.date,
  dueDate: row.dueDate ?? undefined,
  status: row.status,
  subtotal: row.subtotal,
  total: row.total,
  paidAmount: row.paidAmount,
  remainingAmount: row.remainingAmount,
  outstandingAmount: row.outstandingAmount ?? row.remainingAmount,
  tax: row.tax,
  taxPercentage: row.taxPercentage ?? undefined,
  discountAmount: row.discountAmount,
  notes: row.notes ?? undefined,
  items: row.items.map((item) => ({
    inventoryItemId: item.inventoryItemId,
    qty: item.invoicedQty ?? item.qty,
    invoicedQty: item.invoicedQty ?? item.qty,
    unit: item.unit,
    price: item.unitCost ?? item.price,
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
  matchStatus: row.matchStatus ?? undefined,
  matchQtyDifference: row.matchQtyDifference ?? undefined,
  matchPriceDifference: row.matchPriceDifference ?? undefined,
  matchAmountDifference: row.matchAmountDifference ?? undefined,
  postingStatus: row.postingStatus ?? undefined,
});

export const usePurchaseStore = create<PurchaseStore>((set, get) => ({
  purchaseRequests: [],
  purchaseOrders: [],
  goodsReceipts: [],
  invoices: [],
  supplierPayments: [],
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

  fetchSupplierPayments: async () => {
    set({ loading: true });
    try {
      const rows = await listSupplierPayments(getActiveScope());
      set({ supplierPayments: rows.map(mapSupplierPayment), loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  // ── PR ──
  addPR: async (pr) => {
    const created = await createPurchaseRequest({
      outletId: requireActiveOutletId(),
      requestedBy: pr.requestedBy,
      notes: pr.notes,
      items: pr.items.map((item) => ({
        inventoryItemId: item.inventoryItemId,
        quantity: item.qty,
        unit: item.unit,
        estimatedCost: item.estimatedCost,
        notes: item.notes,
      })),
    });
    await get().fetchPurchaseRequests();
    return created.id;
  },
  updatePR: async (id, data) => {
    await updatePurchaseRequest(id, {
      requestedBy: data.requestedBy,
      notes: data.notes ?? null,
      items: data.items?.map((item) => ({
        inventoryItemId: item.inventoryItemId,
        quantity: item.qty,
        unit: item.unit,
        estimatedCost: item.estimatedCost,
        notes: item.notes,
      })),
    });
    await get().fetchPurchaseRequests();
  },
  submitPR: async (id) => {
    await submitPurchaseRequest(id);
    await get().fetchPurchaseRequests();
  },
  approvePR: async (id) => {
    await approvePurchaseRequest(id);
    await get().fetchPurchaseRequests();
  },
  rejectPR: async (id) => {
    await rejectPurchaseRequest(id);
    await get().fetchPurchaseRequests();
  },
  cancelPR: async (id) => {
    await cancelPurchaseRequest(id);
    await get().fetchPurchaseRequests();
  },
  convertPRToPO: async (id, supplierId) => {
    const { purchaseOrder } = await convertPurchaseRequestToPo(id, { supplierId });
    await Promise.all([get().fetchPurchaseRequests(), get().fetchPurchaseOrders()]);
    return purchaseOrder.id;
  },

  // ── PO ──
  addPO: async (po) => {
    const prId = get().purchaseRequests.find((pr) => pr.prNumber === po.referencePR)?.id;
    const created = await createPurchaseOrder({
      outletId: requireActiveOutletId(),
      date: po.date,
      supplierId: po.supplierId,
      destinationWarehouseId: po.destinationWarehouseId,
      purchaseRequestId: prId,
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
      destinationWarehouseId: data.destinationWarehouseId,
      purchaseRequestId: prId,
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
  submitPO: async (id) => {
    await submitPurchaseOrder(id);
    await get().fetchPurchaseOrders();
  },
  approvePO: async (id) => {
    await approvePurchaseOrder(id);
    await get().fetchPurchaseOrders();
  },
  rejectPO: async (id) => {
    await rejectPurchaseOrder(id);
    await get().fetchPurchaseOrders();
  },
  cancelPO: async (id) => {
    await cancelPurchaseOrder(id);
    await get().fetchPurchaseOrders();
  },
  closePO: async (id) => {
    await closePurchaseOrder(id);
    await get().fetchPurchaseOrders();
  },

  createPOFromPR: async (prId, supplierId) => get().convertPRToPO(prId, supplierId),

  // ── GRN ──
  addGRN: async (grn) => {
    const po = get().purchaseOrders.find((p) => p.poNumber === grn.poReference);
    if (!po) {
      throw new Error("PO not found");
    }

    const created = await createGoodsReceipt({
      purchaseOrderId: po.id,
      warehouseId: grn.warehouseId ?? po.destinationWarehouseId,
      date: grn.date,
      notes: grn.notes,
      supplierDeliveryNo: grn.supplierDeliveryNo,
      supplierDeliveryDate: grn.supplierDeliveryDate,
      vehicleNo: grn.vehicleNo,
      driverName: grn.driverName,
      receivedBy: grn.receivedBy,
      items: grn.items.map((item) => ({
        inventoryItemId: item.inventoryItemId,
        receivedQty: item.receivedQty,
      })),
    });

    await Promise.all([get().fetchGoodsReceipts(), get().fetchPurchaseOrders()]);
    return created.id;
  },

  receiveGRN: async (id) => {
    await receiveGoodsReceipt(id);
    await Promise.all([get().fetchGoodsReceipts(), get().fetchPurchaseOrders()]);
  },

  postGRN: async (id) => {
    await postGoodsReceipt(id);
    await Promise.all([get().fetchGoodsReceipts(), get().fetchPurchaseOrders()]);
  },

  cancelGRN: async (id) => {
    await cancelGoodsReceipt(id);
    await Promise.all([get().fetchGoodsReceipts(), get().fetchPurchaseOrders()]);
  },

  getGRNProgress: async (id) => getGoodsReceiptProgress(id),

  // ── Invoice ──
  addInvoice: async (inv) => {
    const created = await createPurchaseInvoice({
      purchaseOrderId: inv.purchaseOrderId,
      goodsReceiptId: inv.goodsReceiptId,
      supplierInvoiceNo: inv.supplierInvoiceNo,
      date: inv.date,
      dueDate: inv.dueDate,
      tax: inv.tax,
      taxPercentage: inv.taxPercentage,
      items: inv.items,
    });
    await get().fetchPurchaseInvoices();
    return created.id;
  },

  submitInvoice: async (id) => {
    await submitPurchaseInvoice(id);
    await get().fetchPurchaseInvoices();
  },

  approveInvoice: async (id) => {
    await approvePurchaseInvoice(id);
    await get().fetchPurchaseInvoices();
  },

  voidInvoice: async (id) => {
    await voidPurchaseInvoice(id);
    await get().fetchPurchaseInvoices();
  },

  fetchSupplierPayables: async () => listSupplierPayables(getActiveScope()),
  updateInvoice: async (id, data) => {
    if (!data.status) return;
    await updatePurchaseInvoice(id, { status: data.status });
    await get().fetchPurchaseInvoices();
  },
  addSupplierPayment: async (payload) => {
    const outletId = requireActiveOutletId();
    const created = await createSupplierPayment({
      ...payload,
      outletId,
    });
    await Promise.all([get().fetchSupplierPayments(), get().fetchPurchaseInvoices()]);
    return created.id;
  },

  approveSupplierPaymentAction: async (id) => {
    await approveSupplierPayment(id);
    await Promise.all([get().fetchSupplierPayments(), get().fetchPurchaseInvoices()]);
  },

  postSupplierPaymentAction: async (id) => {
    await postSupplierPayment(id);
    await Promise.all([get().fetchSupplierPayments(), get().fetchPurchaseInvoices()]);
  },

  voidSupplierPaymentAction: async (id) => {
    await voidSupplierPayment(id);
    await Promise.all([get().fetchSupplierPayments(), get().fetchPurchaseInvoices()]);
  },
}));
