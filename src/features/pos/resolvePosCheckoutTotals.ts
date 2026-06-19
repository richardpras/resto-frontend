import type { Order } from "@/stores/orderStore";
import { isUnpaidOpenBill } from "@/features/pos/posOpenBillCheckout";
import { orderBalanceDue } from "@/features/pos/posOpenBillSync";

export type PosCheckoutTotalsInput = {
  cartSubtotal: number;
  clientTax: number;
  clientBaseTotal: number;
  clientDiscount: number;
  appliedGiftCard: number;
  appliedPointsValue: number;
  order: Order | null | undefined;
};

export type PosCheckoutTotals = {
  source: "server" | "client";
  subtotal: number;
  discount: number;
  tax: number;
  baseTotal: number;
  total: number;
  balanceDue: number;
};

export function orderHasServerCheckoutDiscount(order: Order | null | undefined): boolean {
  if (!order || !isUnpaidOpenBill(order)) {
    return false;
  }

  if (order.promotion || order.voucher) {
    return true;
  }

  return (order.discountAmount ?? 0) > 0;
}

export function resolvePosCheckoutTotals(input: PosCheckoutTotalsInput): PosCheckoutTotals {
  const {
    cartSubtotal,
    clientTax,
    clientBaseTotal,
    clientDiscount,
    appliedGiftCard,
    appliedPointsValue,
    order,
  } = input;

  if (orderHasServerCheckoutDiscount(order) && order) {
    const serverBalance = typeof order.balanceDue === "number"
      ? Math.max(0, order.balanceDue)
      : orderBalanceDue(order);
    const discount = order.discountAmount
      ?? order.promotionDiscount
      ?? order.voucherDiscount
      ?? order.promotionPreview?.discount
      ?? order.voucherPreview?.discount
      ?? 0;

    const total = Math.max(0, serverBalance - appliedGiftCard - appliedPointsValue);

    return {
      source: "server",
      subtotal: order.subtotal,
      discount,
      tax: order.tax,
      baseTotal: order.total,
      total,
      balanceDue: total,
    };
  }

  const total = Math.max(0, clientBaseTotal - appliedGiftCard - appliedPointsValue);
  const balanceDue = order && isUnpaidOpenBill(order)
    ? Math.max(orderBalanceDue(order), total)
    : total;

  return {
    source: "client",
    subtotal: cartSubtotal,
    discount: clientDiscount,
    tax: clientTax,
    baseTotal: clientBaseTotal,
    total,
    balanceDue,
  };
}
