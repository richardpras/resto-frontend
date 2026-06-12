import type { Order } from "@/stores/orderStore";

export function openBillCheckoutIdempotencyKey(orderId: string): string {
  return `pos-checkout-order-${orderId}`;
}

export function isUnpaidOpenBill(order: Order | null | undefined): boolean {
  if (!order) return false;
  if (order.status === "cancelled") return false;
  return order.paymentStatus !== "paid";
}

export function shouldResumeOpenBillCheckout(
  currentOrderId: string | null,
  order: Order | null | undefined,
): boolean {
  if (!currentOrderId) return false;
  if (String(order?.id ?? "") !== String(currentOrderId)) return false;
  return isUnpaidOpenBill(order);
}
