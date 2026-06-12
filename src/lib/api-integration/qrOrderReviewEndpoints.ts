import { apiRequest as request } from "./client";

export type QrOrderAdjustmentEntry = {
  type: "removed" | "added" | "replaced" | "modified" | string;
  name?: string;
  reason?: string;
  from?: string;
  to?: string;
  message?: string;
};

export type QrOrderReviewItem = {
  id?: string;
  menuItemId: number;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string | null;
};

export type QrOrderPreview = {
  id: string;
  requestCode: string;
  outletId: number;
  tableId: number;
  tableName?: string | null;
  customerName?: string | null;
  customerNotes?: string[];
  status: string;
  items: QrOrderReviewItem[];
  subtotal: number;
  discount: number;
  total: number;
  createdAt?: string | null;
  openedInPosAt?: string | null;
};

export type QrOrderPosOpenResponse = {
  posSession: {
    sessionType: "qr_order";
    sourceOrderCode: string;
  };
  loadPayload: {
    requestId: string;
    requestCode: string;
    outletId: number;
    tableId: number;
    tableName?: string | null;
    customerName?: string | null;
    linkedOrderId?: string | null;
    linkedOrderCode?: string | null;
    items: {
      id: string;
      menuItemId: number;
      name: string;
      price: number;
      qty: number;
      emoji?: string | null;
      notes?: string | null;
      lineTotal?: number;
    }[];
    subtotal: number;
    tax: number;
    total: number;
  };
  linkedOrder?: {
    id: number;
    orderNo: string;
    status: string;
    paymentStatus: string;
    total: number;
  } | null;
  request: QrOrderPreview;
};

/** @deprecated Use QrOrderPreview for read-only queue preview */
export type QrOrderReview = QrOrderPreview & {
  reviewedAt?: string | null;
  originalItems?: QrOrderReviewItem[];
  adjustments?: QrOrderAdjustmentEntry[];
  promo?: { promoId?: string; promoName?: string } | null;
  voucher?: { memberVoucherId?: number; voucherName?: string } | null;
  loyalty?: { points?: number } | null;
  hasAdjustments?: boolean;
  updatedAt?: string | null;
};

export type QrOrderHistoryEntry = {
  eventType: string;
  label: string;
  occurredAt?: string | null;
  payload?: Record<string, unknown>;
};

export type AdjustQrOrderPayload = {
  items: {
    menuItemId: number;
    qty: number;
    notes?: string;
    unitPrice?: number;
  }[];
  adjustments?: QrOrderAdjustmentEntry[];
  promo?: { promoId?: string; promoName?: string } | null;
  promoDiscount?: number;
  voucher?: { memberVoucherId?: number; voucherName?: string } | null;
  voucherDiscount?: number;
  loyalty?: { points?: number } | null;
  loyaltyDiscount?: number;
};

export async function searchQrOrder(code: string): Promise<QrOrderPreview> {
  const query = new URLSearchParams({ code });
  const response = await request<{ data: QrOrderReview }>(`/qr-orders/search?${query.toString()}`);
  return response.data;
}

export async function scanQrOrder(code: string): Promise<QrOrderPreview> {
  const response = await request<{ data: QrOrderReview }>("/qr-orders/scan", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  return response.data;
}

export async function fetchQrOrderPreview(requestId: string | number): Promise<QrOrderPreview> {
  const response = await request<{ data: QrOrderPreview }>(`/qr-orders/${requestId}/review`);
  return response.data;
}

/** @deprecated Use fetchQrOrderPreview */
export async function fetchQrOrderReview(requestId: string | number): Promise<QrOrderPreview> {
  return fetchQrOrderPreview(requestId);
}

export async function openQrOrderInPos(requestId: string | number): Promise<QrOrderPosOpenResponse> {
  const response = await request<{ data: QrOrderPosOpenResponse }>(`/qr-orders/${requestId}/open-in-pos`, {
    method: "POST",
  });
  return response.data;
}

export async function adjustQrOrder(requestId: string | number, payload: AdjustQrOrderPayload): Promise<QrOrderReview> {
  const response = await request<{ data: QrOrderReview }>(`/qr-orders/${requestId}/adjust`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function fetchQrOrderHistory(requestId: string | number): Promise<QrOrderHistoryEntry[]> {
  const response = await request<{ data: QrOrderHistoryEntry[] }>(`/qr-orders/${requestId}/history`);
  return response.data;
}

export async function confirmQrOrderAndPay(
  requestId: string | number,
  payload: { payments?: { method: string; amount: number }[] } = {},
): Promise<void> {
  await request(`/qr-orders/${requestId}/confirm-and-pay`, {
    method: "POST",
    body: JSON.stringify({ mode: "pay_and_confirm", ...payload }),
  });
}
