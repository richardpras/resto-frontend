import { apiRequest } from "./client";
import type { OrderApi } from "./endpoints";

export type VoucherPreview = {
  subtotal: number;
  discount: number;
  subtotalAfterDiscount: number;
  tax?: number;
  total?: number;
  balanceDue?: number;
};

export type OrderVoucherApi = {
  id: string;
  orderId: string;
  memberVoucherId: string;
  voucherId: string;
  voucherCode: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  appliedAt?: string;
  voucherName?: string | null;
};

export async function applyOrderVoucher(
  orderId: string | number,
  memberVoucherId: number,
): Promise<{ data: OrderApi; preview: VoucherPreview; message?: string }> {
  return apiRequest(`/orders/${orderId}/voucher`, {
    method: "POST",
    body: JSON.stringify({ memberVoucherId }),
  });
}

export async function applyOrderVoucherByCode(
  orderId: string | number,
  code: string,
): Promise<{ data: OrderApi; preview: VoucherPreview; message?: string }> {
  return apiRequest(`/orders/${orderId}/voucher/by-code`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function removeOrderVoucher(
  orderId: string | number,
): Promise<{ data: OrderApi; preview: VoucherPreview; message?: string }> {
  return apiRequest(`/orders/${orderId}/voucher`, {
    method: "DELETE",
  });
}

export async function fetchOrderVoucherPreview(orderId: string | number): Promise<VoucherPreview> {
  const res = await apiRequest<{ preview: VoucherPreview }>(`/orders/${orderId}/voucher-preview`);
  return res.preview;
}
