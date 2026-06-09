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
  requestNo?: string;
  outletId?: string;
  date: string;
  outlet: string;
  requestedBy: string;
  approvedBy?: string | null;
  status: "draft" | "submitted" | "approved" | "rejected" | "converted" | "cancelled";
  notes?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  items: Array<{
    id: string;
    inventoryItemId: string;
    qty: number;
    quantity?: number;
    fulfilledQty?: number;
    remainingQty?: number;
    unit: string;
    estimatedCost?: number | null;
    notes?: string | null;
  }>;
  createdAt: string;
};

export type POStatusApi =
  | "draft"
  | "submitted"
  | "approved"
  | "partially_received"
  | "received"
  | "cancelled"
  | "closed";

export type PurchaseOrderApiRow = {
  id: string;
  poNumber: string;
  supplierId: string;
  purchaseRequestId?: string | null;
  sourcePrId?: string | null;
  referencePR?: string | null;
  sourceType?: "PR" | "DIRECT";
  destinationWarehouseId?: string | null;
  date: string;
  status: POStatusApi;
  notes?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  totalOrderedQty?: number;
  totalReceivedQty?: number;
  totalRemainingQty?: number;
  completionPercentage?: number;
  items: Array<{
    id: string;
    inventoryItemId: string;
    qty: number;
    orderedQty?: number;
    prItemId?: string | null;
    requestedQty?: number;
    isFromPr?: boolean;
    unit?: string | null;
    price: number;
    receivedQty: number;
    remainingQty?: number;
  }>;
  goodsReceipts?: Array<{ id: string; grnNumber: string; date: string }>;
  createdAt: string;
};

export type GRNStatusApi = "draft" | "received" | "posted" | "cancelled";

export type PostingStatusPayload = {
  status: "posted" | "not_posted" | "reversed";
  journalEntryId?: string | null;
  journalNo?: string | null;
  postedAt?: string | null;
  reversedAt?: string | null;
  reason?: string | null;
};

export type GoodsReceiptApiRow = {
  id: string;
  grnNumber: string;
  poReference: string;
  purchaseOrderId?: string | null;
  warehouseId?: string | null;
  destinationWarehouseId?: string | null;
  date: string;
  status: GRNStatusApi;
  notes?: string | null;
  supplierDeliveryNo?: string | null;
  supplierDeliveryDate?: string | null;
  vehicleNo?: string | null;
  driverName?: string | null;
  receivedBy?: string | null;
  receivedAt?: string | null;
  postedAt?: string | null;
  cancelledAt?: string | null;
  receivedValue?: number;
  relatedInvoiceCount?: number;
  items: Array<{
    id: string;
    inventoryItemId: string;
    orderedQty: number;
    receivedQty: number;
    unitCost?: number;
    unit?: string | null;
  }>;
  createdAt: string;
  postingStatus?: PostingStatusPayload | null;
};

export type ReceivingProgress = {
  orderedQty: number;
  receivedQty: number;
  remainingQty: number;
  completionPercentage: number;
  items?: Array<{
    id: string;
    inventoryItemId: string;
    orderedQty: number;
    receivedQty: number;
    remainingQty: number;
  }>;
};

export type InvoiceStatusApi = "draft" | "submitted" | "approved" | "partial" | "paid" | "void";

export type PurchaseInvoiceApiRow = {
  id: string;
  invoiceNumber: string;
  supplierInvoiceNo?: string | null;
  supplierId: string;
  poReference: string;
  grReference: string;
  purchaseOrderId?: string | null;
  goodsReceiptId?: string | null;
  date: string;
  dueDate?: string | null;
  status: InvoiceStatusApi;
  subtotal?: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  outstandingAmount?: number;
  tax: number;
  taxPercentage?: number | null;
  discountAmount?: number;
  notes?: string | null;
  items: Array<{
    inventoryItemId: string;
    receivedQty?: number;
    invoicedQty?: number;
    qty: number;
    unitCost?: number;
    lineSubtotal?: number;
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
  matchStatus?: "matched" | "matched_with_tolerance" | "mismatch" | "blocked" | null;
  matchQtyDifference?: number | null;
  matchPriceDifference?: number | null;
  matchAmountDifference?: number | null;
  postingStatus?: PostingStatusPayload | null;
};

export type SupplierPayableRow = {
  supplierId: string;
  supplierName: string;
  invoiceCount: number;
  outstandingBalance: number;
  overdueBalance: number;
  lastInvoiceDate?: string | null;
  lastInvoiceNumber?: string | null;
};

export type InvoiceOutstandingDetails = {
  outstandingAmount: number;
  paidAmount: number;
  totalAmount: number;
  grnRemainingValue: number;
  grnInvoicedValue: number;
};

export async function listPurchaseRequests(params?: PurchaseScopeQuery): Promise<PurchaseRequestApiRow[]> {
  const res = await apiRequest<ListEnvelope<PurchaseRequestApiRow>>(`/purchase-requests${toQuery(params)}`);
  return res.data;
}

export async function createPurchaseRequest(payload: {
  outletId: number;
  requestedBy?: string;
  notes?: string;
  items: Array<{ inventoryItemId: string; quantity: number; unit: string; estimatedCost?: number; notes?: string }>;
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
    requestedBy: string;
    notes: string | null;
    items: Array<{ inventoryItemId: string; quantity: number; unit: string; estimatedCost?: number; notes?: string }>;
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

export type ProcurementSummary = {
  totalSuppliers: number;
  totalPurchaseOrders: number;
  totalGoodsReceipts: number;
  totalPurchaseInvoices: number;
  totalPurchasePayments: number;
  purchaseRequests: number;
  submittedRequests: number;
  approvedRequests: number;
  convertedRequests: number;
  draftPOs: number;
  submittedPOs: number;
  approvedPOs: number;
  partiallyReceivedPOs: number;
  receivedPOs: number;
  cancelledPOs: number;
  draftReceivings: number;
  receivedReceivings: number;
  postedReceivings: number;
  cancelledReceivings: number;
  todayReceivings: number;
  todayReceivedValue: number;
  draftInvoices: number;
  submittedInvoices: number;
  approvedInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  outstandingPayables: number;
  totalPayments: number;
  postedPayments: number;
  voidedPayments: number;
  apPaidAmount: number;
  apOutstandingAmount: number;
  matchedInvoices: number;
  mismatchInvoices: number;
  blockedInvoices: number;
  matchRate: number;
  postedGrnValue: number;
  postedInvoiceValue: number;
  postedPaymentValue: number;
  unpostedGrnValue: number;
  unpostedInvoiceValue: number;
  unpostedPaymentValue: number;
};

export type ProcurementPostingStatus = "draft" | "posted" | "reversed";

export type ProcurementPostingApiRow = {
  id: string;
  postingNo: string;
  outletId?: string | null;
  sourceType: "grn" | "invoice" | "supplier_payment";
  sourceId: string;
  documentNo?: string | null;
  supplierName?: string | null;
  amount: number;
  journalEntryId?: string | null;
  journalNo?: string | null;
  status: ProcurementPostingStatus;
  postedAt?: string | null;
  reversedAt?: string | null;
  notes?: string | null;
};

export type SupplierPaymentStatusApi = "draft" | "approved" | "posted" | "void";

export type SupplierPaymentApiRow = {
  id: string;
  paymentNo: string;
  supplierId: string;
  supplierName?: string;
  outletId?: string | null;
  paymentDate: string;
  paymentMethod: "cash" | "bank_transfer" | "giro" | "check" | "other";
  referenceNo?: string | null;
  notes?: string | null;
  amount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  status: SupplierPaymentStatusApi;
  allocations: Array<{
    id: string;
    invoiceId: string;
    invoiceNumber?: string;
    allocatedAmount: number;
  }>;
  createdAt: string;
  postingStatus?: PostingStatusPayload | null;
};

export type ProcurementAnalyticsSummary = {
  totalSpend: number;
  totalPurchaseOrders: number;
  totalReceipts: number;
  totalInvoices: number;
  totalPayments: number;
  outstandingPayables: number;
  overduePayables: number;
  averagePoCycleDays: number;
  averageInvoiceCycleDays: number;
  averageSupplierLeadTime?: number;
  matchRate: number;
  postingRate: number;
  topSupplier?: { supplierId: string; supplierName: string; purchaseAmount: number } | null;
};

export type SupplierPerformanceRow = {
  supplierId: string;
  supplierName: string;
  purchaseAmount: number;
  purchaseCount: number;
  averageLeadTime: number;
  onTimeDeliveryRate: number;
  invoiceAccuracyRate: number;
  matchRate: number;
};

export type ProcurementSpendAnalysis = {
  monthlySpend: Array<{ month: string; amount: number }>;
  supplierSpend: Array<{ id: string; name: string; amount: number }>;
  categorySpend: Array<{ categoryId: string; categoryName: string; amount: number }>;
  warehouseSpend: Array<{ warehouseId: string; warehouseName: string; amount: number }>;
};

export type ProcurementPayablesAnalytics = {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
  totalOutstanding: number;
};

export type ProcurementTrendAnalysis = {
  months: string[];
  purchaseOrders: number[];
  receipts: number[];
  invoices: number[];
  payments: number[];
  spend: number[];
};

export type ProcurementPostingAnalytics = {
  postedGrnCount: number;
  postedInvoiceCount: number;
  postedPaymentCount: number;
  unpostedGrnCount: number;
  unpostedInvoiceCount: number;
  unpostedPaymentCount: number;
  postingRate: number;
};

export type ApAgingReport = {
  suppliers: Array<{
    supplierId: string;
    supplierName: string;
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    days90plus: number;
    total: number;
  }>;
  totals: {
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    days90plus: number;
    total: number;
  };
};

export type SupplierStatement = {
  supplierId: string;
  supplierName: string;
  fromDate?: string | null;
  toDate?: string | null;
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    date: string;
    dueDate?: string;
    total: number;
    paidAmount: number;
    outstandingAmount: number;
    status: string;
  }>;
  payments: Array<{
    id: string;
    paymentNo: string;
    date: string;
    amount: number;
    allocatedAmount: number;
    paymentMethod: string;
    referenceNo?: string | null;
  }>;
};

export async function submitPurchaseRequest(id: string | number): Promise<PurchaseRequestApiRow> {
  const res = await apiRequest<MessageItemEnvelope<PurchaseRequestApiRow>>(`/purchase-requests/${id}/submit`, { method: "POST" });
  return res.data;
}

export async function approvePurchaseRequest(id: string | number): Promise<PurchaseRequestApiRow> {
  const res = await apiRequest<MessageItemEnvelope<PurchaseRequestApiRow>>(`/purchase-requests/${id}/approve`, { method: "POST" });
  return res.data;
}

export async function rejectPurchaseRequest(id: string | number): Promise<PurchaseRequestApiRow> {
  const res = await apiRequest<MessageItemEnvelope<PurchaseRequestApiRow>>(`/purchase-requests/${id}/reject`, { method: "POST" });
  return res.data;
}

export async function cancelPurchaseRequest(id: string | number): Promise<PurchaseRequestApiRow> {
  const res = await apiRequest<MessageItemEnvelope<PurchaseRequestApiRow>>(`/purchase-requests/${id}/cancel`, { method: "POST" });
  return res.data;
}

export async function convertPurchaseRequestToPo(
  id: string | number,
  payload: { supplierId: string },
): Promise<{ purchaseOrder: PurchaseOrderApiRow; purchaseRequest: PurchaseRequestApiRow }> {
  const res = await apiRequest<MessageItemEnvelope<PurchaseOrderApiRow> & { purchaseRequest: PurchaseRequestApiRow }>(
    `/purchase-requests/${id}/convert`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  return { purchaseOrder: res.data, purchaseRequest: res.purchaseRequest };
}

export async function getProcurementSummary(params?: PurchaseScopeQuery): Promise<ProcurementSummary> {
  const res = await apiRequest<{ data: ProcurementSummary }>(`/procurement/summary${toQuery(params)}`);
  return res.data;
}

export async function createPurchaseOrder(payload: {
  outletId: number;
  date: string;
  supplierId: string;
  destinationWarehouseId?: string;
  purchaseRequestId?: string;
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
    destinationWarehouseId: string | null;
    purchaseRequestId: string | null;
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

export async function submitPurchaseOrder(id: string | number): Promise<PurchaseOrderApiRow> {
  const res = await apiRequest<MessageItemEnvelope<PurchaseOrderApiRow>>(`/purchase-orders/${id}/submit`, { method: "PATCH" });
  return res.data;
}

export async function approvePurchaseOrder(id: string | number): Promise<PurchaseOrderApiRow> {
  const res = await apiRequest<MessageItemEnvelope<PurchaseOrderApiRow>>(`/purchase-orders/${id}/approve`, { method: "PATCH" });
  return res.data;
}

export async function cancelPurchaseOrder(id: string | number): Promise<PurchaseOrderApiRow> {
  const res = await apiRequest<MessageItemEnvelope<PurchaseOrderApiRow>>(`/purchase-orders/${id}/cancel`, { method: "PATCH" });
  return res.data;
}

export async function closePurchaseOrder(id: string | number): Promise<PurchaseOrderApiRow> {
  const res = await apiRequest<MessageItemEnvelope<PurchaseOrderApiRow>>(`/purchase-orders/${id}/close`, { method: "PATCH" });
  return res.data;
}

export async function getPurchaseOrderProgress(id: string | number): Promise<{
  totalOrderedQty: number;
  totalReceivedQty: number;
  totalRemainingQty: number;
  completionPercentage: number;
  status: POStatusApi;
  poNumber: string;
}> {
  const res = await apiRequest<{ data: {
    totalOrderedQty: number;
    totalReceivedQty: number;
    totalRemainingQty: number;
    completionPercentage: number;
    status: POStatusApi;
    poNumber: string;
  } }>(`/purchase-orders/${id}/progress`);
  return res.data;
}

export async function listGoodsReceipts(params?: PurchaseScopeQuery): Promise<GoodsReceiptApiRow[]> {
  const res = await apiRequest<ListEnvelope<GoodsReceiptApiRow>>(`/goods-receipts${toQuery(params)}`);
  return res.data;
}

export async function createGoodsReceipt(payload: {
  purchaseOrderId: string;
  warehouseId?: string | number;
  date: string;
  notes?: string;
  supplierDeliveryNo?: string;
  supplierDeliveryDate?: string;
  vehicleNo?: string;
  driverName?: string;
  receivedBy?: string;
  items: Array<{
    inventoryItemId: string;
    receivedQty: number;
    unitCost?: number;
  }>;
}): Promise<GoodsReceiptApiRow> {
  const res = await apiRequest<MessageItemEnvelope<GoodsReceiptApiRow>>("/goods-receipts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function getGoodsReceipt(id: string | number): Promise<GoodsReceiptApiRow> {
  const res = await apiRequest<MessageItemEnvelope<GoodsReceiptApiRow>>(`/goods-receipts/${id}`);
  return res.data;
}

export async function updateGoodsReceipt(
  id: string | number,
  payload: Partial<{
    warehouseId: string | number;
    date: string;
    notes: string | null;
    supplierDeliveryNo: string | null;
    supplierDeliveryDate: string | null;
    vehicleNo: string | null;
    driverName: string | null;
    receivedBy: string | null;
    items: Array<{ inventoryItemId: string; receivedQty: number; unitCost?: number }>;
  }>,
): Promise<GoodsReceiptApiRow> {
  const res = await apiRequest<MessageItemEnvelope<GoodsReceiptApiRow>>(`/goods-receipts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function receiveGoodsReceipt(id: string | number): Promise<GoodsReceiptApiRow> {
  const res = await apiRequest<MessageItemEnvelope<GoodsReceiptApiRow>>(`/goods-receipts/${id}/receive`, {
    method: "PATCH",
  });
  return res.data;
}

export async function postGoodsReceipt(id: string | number): Promise<GoodsReceiptApiRow> {
  const res = await apiRequest<MessageItemEnvelope<GoodsReceiptApiRow>>(`/goods-receipts/${id}/post`, {
    method: "PATCH",
  });
  return res.data;
}

export async function cancelGoodsReceipt(id: string | number): Promise<GoodsReceiptApiRow> {
  const res = await apiRequest<MessageItemEnvelope<GoodsReceiptApiRow>>(`/goods-receipts/${id}/cancel`, {
    method: "PATCH",
  });
  return res.data;
}

export async function getGoodsReceiptProgress(id: string | number): Promise<ReceivingProgress> {
  const res = await apiRequest<{ data: ReceivingProgress }>(`/goods-receipts/${id}/progress`);
  return res.data;
}

export async function listPurchaseInvoices(params?: PurchaseScopeQuery): Promise<PurchaseInvoiceApiRow[]> {
  const res = await apiRequest<ListEnvelope<PurchaseInvoiceApiRow>>(`/purchase-invoices${toQuery(params)}`);
  return res.data;
}

export async function createPurchaseInvoice(payload: {
  purchaseOrderId: string;
  goodsReceiptId: string;
  supplierInvoiceNo?: string;
  date: string;
  dueDate?: string;
  notes?: string;
  tax?: number;
  taxPercentage?: number;
  discountAmount?: number;
  items?: Array<{ inventoryItemId: string; qty: number; unitCost?: number }>;
}): Promise<PurchaseInvoiceApiRow> {
  const res = await apiRequest<MessageItemEnvelope<PurchaseInvoiceApiRow>>("/purchase-invoices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updatePurchaseInvoice(
  id: string | number,
  payload: Partial<{
    supplierInvoiceNo: string | null;
    date: string;
    dueDate: string | null;
    notes: string | null;
    tax: number;
    taxPercentage: number;
    discountAmount: number;
    items: Array<{ inventoryItemId: string; qty: number }>;
    status: InvoiceStatusApi;
  }>,
): Promise<PurchaseInvoiceApiRow> {
  const res = await apiRequest<MessageItemEnvelope<PurchaseInvoiceApiRow>>(`/purchase-invoices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function submitPurchaseInvoice(id: string | number): Promise<PurchaseInvoiceApiRow> {
  const res = await apiRequest<MessageItemEnvelope<PurchaseInvoiceApiRow>>(`/purchase-invoices/${id}/submit`, {
    method: "PATCH",
  });
  return res.data;
}

export async function approvePurchaseInvoice(id: string | number): Promise<PurchaseInvoiceApiRow> {
  const res = await apiRequest<MessageItemEnvelope<PurchaseInvoiceApiRow>>(`/purchase-invoices/${id}/approve`, {
    method: "PATCH",
  });
  return res.data;
}

export async function voidPurchaseInvoice(id: string | number): Promise<PurchaseInvoiceApiRow> {
  const res = await apiRequest<MessageItemEnvelope<PurchaseInvoiceApiRow>>(`/purchase-invoices/${id}/void`, {
    method: "PATCH",
  });
  return res.data;
}

export async function getPurchaseInvoiceOutstanding(id: string | number): Promise<InvoiceOutstandingDetails> {
  const res = await apiRequest<{ data: InvoiceOutstandingDetails }>(`/purchase-invoices/${id}/outstanding`);
  return res.data;
}

export async function listSupplierPayables(params?: PurchaseScopeQuery): Promise<SupplierPayableRow[]> {
  const res = await apiRequest<ListEnvelope<SupplierPayableRow>>(`/procurement/payables${toQuery(params)}`);
  return res.data;
}

export async function listSupplierPayments(params?: PurchaseScopeQuery): Promise<SupplierPaymentApiRow[]> {
  const res = await apiRequest<ListEnvelope<SupplierPaymentApiRow>>(`/supplier-payments${toQuery(params)}`);
  return res.data;
}

export async function createSupplierPayment(payload: {
  supplierId: string | number;
  outletId?: number;
  paymentDate: string;
  paymentMethod?: SupplierPaymentApiRow["paymentMethod"];
  referenceNo?: string;
  notes?: string;
  amount: number;
  allocations?: Array<{ invoiceId: string | number; allocatedAmount: number }>;
}): Promise<SupplierPaymentApiRow> {
  const res = await apiRequest<MessageItemEnvelope<SupplierPaymentApiRow>>("/supplier-payments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function approveSupplierPayment(id: string | number): Promise<SupplierPaymentApiRow> {
  const res = await apiRequest<MessageItemEnvelope<SupplierPaymentApiRow>>(`/supplier-payments/${id}/approve`, { method: "PATCH" });
  return res.data;
}

export async function postSupplierPayment(id: string | number): Promise<SupplierPaymentApiRow> {
  const res = await apiRequest<MessageItemEnvelope<SupplierPaymentApiRow>>(`/supplier-payments/${id}/post`, { method: "PATCH" });
  return res.data;
}

export async function voidSupplierPayment(id: string | number): Promise<SupplierPaymentApiRow> {
  const res = await apiRequest<MessageItemEnvelope<SupplierPaymentApiRow>>(`/supplier-payments/${id}/void`, { method: "PATCH" });
  return res.data;
}

export async function getApAgingReport(params?: PurchaseScopeQuery): Promise<ApAgingReport> {
  const res = await apiRequest<{ data: ApAgingReport }>(`/procurement/ap-aging${toQuery(params)}`);
  return res.data;
}

export async function getSupplierStatement(params: PurchaseScopeQuery & { supplierId: number; fromDate?: string; toDate?: string }): Promise<SupplierStatement> {
  const res = await apiRequest<{ data: SupplierStatement }>(`/procurement/supplier-statement${toQuery(params)}`);
  return res.data;
}

export type ProcurementMatchStatus = "matched" | "matched_with_tolerance" | "mismatch" | "blocked";

export type ProcurementMatchResultApiRow = {
  id: string;
  purchaseOrderId: string;
  goodsReceiptId: string;
  invoiceId: string;
  poReference?: string | null;
  grReference?: string | null;
  invoiceNumber?: string | null;
  matchStatus: ProcurementMatchStatus;
  qtyDifference: number;
  priceDifference: number;
  amountDifference: number;
  matchedAt?: string | null;
  matchedBy?: string | null;
  notes?: string | null;
};

export type ProcurementMatchConfigApiRow = {
  id: string;
  outletId: string;
  quantityTolerancePercent: number;
  priceTolerancePercent: number;
  amountTolerancePercent: number;
  autoApproveWithinTolerance: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export async function listProcurementMatchResults(params?: PurchaseScopeQuery & { status?: ProcurementMatchStatus }): Promise<ProcurementMatchResultApiRow[]> {
  const qs = toQuery(params);
  const status = params?.status ? `${qs ? `${qs}&` : "?"}status=${encodeURIComponent(params.status)}` : qs;
  const res = await apiRequest<ListEnvelope<ProcurementMatchResultApiRow>>(`/procurement/match-results${status}`);
  return res.data;
}

export async function getProcurementMatchResult(invoiceId: string | number): Promise<ProcurementMatchResultApiRow> {
  const res = await apiRequest<{ data: ProcurementMatchResultApiRow }>(`/procurement/match-results/${invoiceId}`);
  return res.data;
}

export async function revalidateProcurementMatchResult(payload: { invoiceId: string | number }): Promise<ProcurementMatchResultApiRow> {
  const res = await apiRequest<MessageItemEnvelope<ProcurementMatchResultApiRow>>(`/procurement/match-results/revalidate`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function listProcurementMatchConfigs(params?: PurchaseScopeQuery): Promise<ProcurementMatchConfigApiRow[]> {
  const res = await apiRequest<ListEnvelope<ProcurementMatchConfigApiRow>>(`/procurement/match-configs${toQuery(params)}`);
  return res.data;
}

export async function createProcurementMatchConfig(payload: {
  outletId: number;
  quantityTolerancePercent?: number;
  priceTolerancePercent?: number;
  amountTolerancePercent?: number;
  autoApproveWithinTolerance?: boolean;
  isActive?: boolean;
}): Promise<ProcurementMatchConfigApiRow> {
  const res = await apiRequest<MessageItemEnvelope<ProcurementMatchConfigApiRow>>(`/procurement/match-configs`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateProcurementMatchConfig(
  id: string | number,
  payload: Partial<Omit<ProcurementMatchConfigApiRow, "id" | "outletId" | "createdAt" | "updatedAt">>,
): Promise<ProcurementMatchConfigApiRow> {
  const res = await apiRequest<MessageItemEnvelope<ProcurementMatchConfigApiRow>>(`/procurement/match-configs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function listProcurementPostings(params?: PurchaseScopeQuery & { sourceType?: ProcurementPostingApiRow["sourceType"]; status?: ProcurementPostingStatus }): Promise<ProcurementPostingApiRow[]> {
  const qs = toQuery(params);
  const extra = new URLSearchParams();
  if (params?.sourceType) extra.set("sourceType", params.sourceType);
  if (params?.status) extra.set("status", params.status);
  const extraStr = extra.toString();
  const suffix = extraStr ? `${qs ? `${qs}&` : "?"}${extraStr}` : qs;
  const res = await apiRequest<ListEnvelope<ProcurementPostingApiRow>>(`/procurement/postings${suffix}`);
  return res.data;
}

export async function getProcurementPostingStatus(sourceType: ProcurementPostingApiRow["sourceType"], sourceId: string | number): Promise<ProcurementPostingApiRow | null> {
  const res = await apiRequest<{ data: ProcurementPostingApiRow | null }>(`/procurement/postings/status?sourceType=${encodeURIComponent(sourceType)}&sourceId=${encodeURIComponent(String(sourceId))}`);
  return res.data;
}

export async function postProcurementGrn(grnId: string | number): Promise<ProcurementPostingApiRow> {
  const res = await apiRequest<MessageItemEnvelope<ProcurementPostingApiRow>>(`/procurement/postings/grn/${grnId}`, { method: "POST" });
  return res.data;
}

export async function postProcurementInvoice(invoiceId: string | number): Promise<ProcurementPostingApiRow> {
  const res = await apiRequest<MessageItemEnvelope<ProcurementPostingApiRow>>(`/procurement/postings/invoice/${invoiceId}`, { method: "POST" });
  return res.data;
}

export async function postProcurementPayment(paymentId: string | number): Promise<ProcurementPostingApiRow> {
  const res = await apiRequest<MessageItemEnvelope<ProcurementPostingApiRow>>(`/procurement/postings/payment/${paymentId}`, { method: "POST" });
  return res.data;
}

export async function reverseProcurementPosting(id: string | number, notes?: string): Promise<ProcurementPostingApiRow> {
  const res = await apiRequest<MessageItemEnvelope<ProcurementPostingApiRow>>(`/procurement/postings/${id}/reverse`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
  return res.data;
}

export async function getProcurementAnalyticsSummary(params?: PurchaseScopeQuery): Promise<ProcurementAnalyticsSummary> {
  const res = await apiRequest<{ data: ProcurementAnalyticsSummary }>(`/procurement/analytics/summary${toQuery(params)}`);
  return res.data;
}

export async function getProcurementAnalyticsSuppliers(params?: PurchaseScopeQuery): Promise<SupplierPerformanceRow[]> {
  const res = await apiRequest<ListEnvelope<SupplierPerformanceRow>>(`/procurement/analytics/suppliers${toQuery(params)}`);
  return res.data;
}

export async function getProcurementAnalyticsSpend(
  params?: PurchaseScopeQuery & { supplierId?: number; categoryId?: number; warehouseId?: number; fromDate?: string; toDate?: string },
): Promise<ProcurementSpendAnalysis> {
  const res = await apiRequest<{ data: ProcurementSpendAnalysis }>(`/procurement/analytics/spend${toQuery(params)}`);
  return res.data;
}

export async function getProcurementAnalyticsPayables(params?: PurchaseScopeQuery): Promise<ProcurementPayablesAnalytics> {
  const res = await apiRequest<{ data: ProcurementPayablesAnalytics }>(`/procurement/analytics/payables${toQuery(params)}`);
  return res.data;
}

export async function getProcurementAnalyticsTrends(params?: PurchaseScopeQuery): Promise<ProcurementTrendAnalysis> {
  const res = await apiRequest<{ data: ProcurementTrendAnalysis }>(`/procurement/analytics/trends${toQuery(params)}`);
  return res.data;
}

export async function getProcurementAnalyticsPosting(params?: PurchaseScopeQuery): Promise<ProcurementPostingAnalytics> {
  const res = await apiRequest<{ data: ProcurementPostingAnalytics }>(`/procurement/analytics/posting${toQuery(params)}`);
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
