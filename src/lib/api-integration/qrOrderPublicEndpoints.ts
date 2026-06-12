import { apiRequest as request } from "./client";

export type QrOrderPublicItem = {
  name: string;
  quantity: number;
  note?: string | null;
  unitPrice: number;
  lineTotal: number;
};

export type QrOrderPublicAdjustment = {
  type: string;
  name?: string;
  reason?: string;
  from?: string;
  to?: string;
  message?: string;
};

export type QrOrderTimelineEvent = {
  status: string;
  label: string;
  timestamp?: string | null;
  actor?: string | null;
};

export type QrOrderLinkedPosOrder = {
  id: number;
  orderCode: string;
  status: string;
  paymentStatus: string;
  kitchenStatus: string;
  total: number;
  sourceCode: string;
};

export type QrOrderOpenBill = {
  status: string;
  paymentStatus: string;
  total: number;
  orderCode: string;
};

export type QrOrderingPublicConfig = {
  enableCallCashier: boolean;
  requireCustomerApprovalForAdjustments?: boolean;
};

export type QrOrderPublicLookup = {
  orderCode: string;
  tableName: string;
  outletName: string;
  tableQrPublicId?: string | null;
  status: string;
  customerStatus: string;
  customerStatusLabel: string;
  timelineStep: number | null;
  isTerminal: boolean;
  timeline?: QrOrderTimelineEvent[];
  items: QrOrderPublicItem[];
  subtotal: number;
  discount: number;
  promo?: number;
  tax?: number;
  service?: number;
  total: number;
  adjustments?: QrOrderPublicAdjustment[];
  removedItems?: QrOrderPublicAdjustment[];
  addedItems?: QrOrderPublicAdjustment[];
  promoLabel?: string | null;
  customerMessage?: string | null;
  isAdjustedByCashier?: boolean;
  awaitingCustomerApproval?: boolean;
  linkedPosOrder?: QrOrderLinkedPosOrder | null;
  openBill?: QrOrderOpenBill | null;
  paymentStatus?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  qrOrdering?: QrOrderingPublicConfig;
};

type QrOrderPublicLookupResponse = {
  data: QrOrderPublicLookup;
};

export async function fetchQrOrderPublic(
  orderCode: string,
  options: { signal?: AbortSignal } = {},
): Promise<QrOrderPublicLookup> {
  const encoded = encodeURIComponent(orderCode.trim());
  const response = await request<QrOrderPublicLookupResponse>(`/public/qr-orders/${encoded}`, {
    signal: options.signal,
  });
  return response.data;
}

export async function approveQrOrderAdjustments(orderCode: string): Promise<QrOrderPublicLookup> {
  const encoded = encodeURIComponent(orderCode.trim());
  const response = await request<{ data: QrOrderPublicLookup }>(
    `/public/qr-orders/${encoded}/approve-adjustments`,
    { method: "POST" },
  );
  return response.data;
}
