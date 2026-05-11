import { apiRequest } from "./client";

type ListEnvelope<T> = { data: T[] };
type MessageItemEnvelope<T> = { message?: string; data: T };
type PurchaseScopeQuery = { tenantId?: number; outletId?: number };

function toQuery(params?: PurchaseScopeQuery): string {
  const query = new URLSearchParams();
  if (params?.tenantId !== undefined) query.set("tenantId", String(params.tenantId));
  if (params?.outletId !== undefined) query.set("outletId", String(params.outletId));
  const queryString = query.toString();
  return queryString.length > 0 ? `?${queryString}` : "";
}

export type PurchaseRequestApiRow = {
  id: string;
  prNumber: string;
  date: string;
  outlet: string;
  requestedBy: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  notes?: string | null;
  items: Array<{
    id: string;
    inventoryItemId: string;
    qty: number;
    fulfilledQty?: number;
    remainingQty?: number;
    unit: string;
    notes?: string | null;
  }>;
  createdAt: string;
};

export type PurchaseOrderApiRow = {
  id: string;
  poNumber: string;
  supplierId: string;
  purchaseRequestId?: string | null;
  sourcePrId?: string | null;
  referencePR?: string | null;
  date: string;
  status: "draft" | "sent" | "partial" | "completed";
  notes?: string | null;
  items: Array<{
    id: string;
    inventoryItemId: string;
    qty: number;
    prItemId?: string | null;
    requestedQty?: number;
    isFromPr?: boolean;
    unit?: string | null;
    price: number;
    receivedQty: number;
  }>;
  createdAt: string;
};

export type GoodsReceiptApiRow = {
  id: string;
  grnNumber: string;
  poReference: string;
  purchaseOrderId?: string | null;
  date: string;
  status: "pending" | "received";
  items: Array<{
    id: string;
    inventoryItemId: string;
    orderedQty: number;
    receivedQty: number;
    unit?: string | null;
  }>;
  createdAt: string;
};

export type PurchaseInvoiceApiRow = {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  poReference: string;
  grReference: string;
  purchaseOrderId?: string | null;
  goodsReceiptId?: string | null;
  date: string;
  status: "unpaid" | "partial" | "paid";
  total: number;
  paidAmount: number;
  remainingAmount: number;
  tax: number;
  items: Array<{
    inventoryItemId: string;
    qty: number;
    unit: string;
    price: number;
  }>;
  payments: Array<{
    id: string;
    date: string;
    amount: number;
    paymentMethod: "cash" | "bank";
    referenceNo?: string | null;
    notes?: string | null;
  }>;
  createdAt: string;
};

export async function listPurchaseRequests(params?: PurchaseScopeQuery): Promise<PurchaseRequestApiRow[]> {
  const res = await apiRequest<ListEnvelope<PurchaseRequestApiRow>>(`/purchase-requests${toQuery(params)}`);
  return res.data;
}

export async function createPurchaseRequest(payload: {
  date: string;
  outlet?: string;
  requestedBy: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  notes?: string;
  items: Array<{ inventoryItemId: string; qty: number; unit: string; notes?: string }>;
}): Promise<PurchaseRequestApiRow> {
  const res = await apiRequest<MessageItemEnvelope<PurchaseRequestApiRow>>("/purchase-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updatePurchaseRequest(
  id: string | number,
  payload: Partial<{
    date: string;
    outlet: string;
    requestedBy: string;
    status: "draft" | "submitted" | "approved" | "rejected";
    notes: string | null;
    items: Array<{ inventoryItemId: string; qty: number; unit: string; notes?: string }>;
  }>,
): Promise<PurchaseRequestApiRow> {
  const res = await apiRequest<MessageItemEnvelope<PurchaseRequestApiRow>>(`/purchase-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function listPurchaseOrders(params?: PurchaseScopeQuery): Promise<PurchaseOrderApiRow[]> {
  const res = await apiRequest<ListEnvelope<PurchaseOrderApiRow>>(`/purchase-orders${toQuery(params)}`);
  return res.data;
}

export async function createPurchaseOrder(payload: {
  date: string;
  supplierId: string;
  purchaseRequestId?: string;
  status: "draft" | "sent" | "partial" | "completed";
  notes?: string;
  items: Array<{
    inventoryItemId: string;
    qty: number;
    unit: string;
    price: number;
    prItemId?: string;
    requestedQty?: number;
    isFromPr?: boolean;
  }>;
}): Promise<PurchaseOrderApiRow> {
  const res = await apiRequest<MessageItemEnvelope<PurchaseOrderApiRow>>("/purchase-orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updatePurchaseOrder(
  id: string | number,
  payload: Partial<{
    date: string;
    supplierId: string;
    purchaseRequestId: string | null;
    status: "draft" | "sent" | "partial" | "completed";
    notes: string | null;
    items: Array<{
      inventoryItemId: string;
      qty: number;
      unit: string;
      price: number;
      prItemId?: string;
      requestedQty?: number;
      isFromPr?: boolean;
    }>;
  }>,
): Promise<PurchaseOrderApiRow> {
  const res = await apiRequest<MessageItemEnvelope<PurchaseOrderApiRow>>(`/purchase-orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function listGoodsReceipts(params?: PurchaseScopeQuery): Promise<GoodsReceiptApiRow[]> {
  const res = await apiRequest<ListEnvelope<GoodsReceiptApiRow>>(`/goods-receipts${toQuery(params)}`);
  return res.data;
}

export async function createGoodsReceipt(payload: {
  purchaseOrderId: string;
  date: string;
  notes?: string;
  items: Array<{
    inventoryItemId: string;
    receivedQty: number;
  }>;
}): Promise<GoodsReceiptApiRow> {
  const res = await apiRequest<MessageItemEnvelope<GoodsReceiptApiRow>>("/goods-receipts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function listPurchaseInvoices(params?: PurchaseScopeQuery): Promise<PurchaseInvoiceApiRow[]> {
  const res = await apiRequest<ListEnvelope<PurchaseInvoiceApiRow>>(`/purchase-invoices${toQuery(params)}`);
  return res.data;
}

export async function createPurchaseInvoice(payload: {
  purchaseOrderId: string;
  goodsReceiptId: string;
  date: string;
  tax?: number;
}): Promise<PurchaseInvoiceApiRow> {
  const res = await apiRequest<MessageItemEnvelope<PurchaseInvoiceApiRow>>("/purchase-invoices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updatePurchaseInvoice(
  id: string | number,
  payload: { status: "unpaid" | "partial" | "paid" },
): Promise<PurchaseInvoiceApiRow> {
  const res = await apiRequest<MessageItemEnvelope<PurchaseInvoiceApiRow>>(`/purchase-invoices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function createPurchaseInvoicePayment(
  invoiceId: string | number,
  payload: {
    date: string;
    amount: number;
    paymentMethod: "cash" | "bank";
    referenceNo?: string;
    notes?: string;
  },
): Promise<PurchaseInvoiceApiRow> {
  const res = await apiRequest<MessageItemEnvelope<PurchaseInvoiceApiRow>>(`/purchase-invoices/${invoiceId}/payments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}
