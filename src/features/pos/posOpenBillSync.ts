import type { UpdateOrderPayload } from "@/lib/api-integration/endpoints";
import type { Order } from "@/stores/orderStore";
import { isUnpaidOpenBill } from "@/features/pos/posOpenBillCheckout";

export type PosCartLine = {
  id: string;
  name: string;
  price: number;
  category: string;
  emoji: string;
  qty: number;
  notes: string;
};

export function orderItemsToCartItems(order: Order): PosCartLine[] {
  return order.items.map((it) => ({
    id: it.id,
    name: it.name,
    price: it.price,
    category: "",
    emoji: it.emoji || "🍽️",
    qty: it.qty,
    notes: it.notes || "",
  }));
}

export function shouldUpdateOpenBill(
  orderId: string | null,
  order: Order | null | undefined,
): boolean {
  if (!orderId) return false;
  return isUnpaidOpenBill(order);
}

export function shouldSyncCartToOpenBill(
  orderId: string | null,
  order: Order | null | undefined,
  cartLength: number,
): boolean {
  if (!orderId || cartLength === 0) return false;
  return isUnpaidOpenBill(order);
}

export function orderBalanceDue(order: Order | null | undefined): number {
  if (!order) return 0;
  const paid = order.payments.reduce((sum, payment) => sum + payment.amount, 0);
  return Math.max(0, order.total - paid);
}

/** Preview balance before cart is PATCHed onto the open bill. */
export function effectivePaymentBalanceDue(
  order: Order | null | undefined,
  cartTotal: number,
  cartLength: number,
): number {
  const orderDue = orderBalanceDue(order);
  if (cartLength > 0 && isUnpaidOpenBill(order)) {
    return Math.max(orderDue, cartTotal);
  }
  if (cartLength > 0) {
    return cartTotal;
  }
  return orderDue;
}

export function hydrateCartFromOrder(
  order: Order,
  setCart: (items: PosCartLine[]) => void,
  currentCartLength = 0,
): void {
  if (currentCartLength > 0) return;
  if (order.items.length === 0) return;
  setCart(orderItemsToCartItems(order));
}

export async function syncCartToOpenBill(
  orderId: string,
  updateOrderRemote: (id: string, payload: UpdateOrderPayload) => Promise<Order>,
  payload: UpdateOrderPayload,
): Promise<Order> {
  return updateOrderRemote(orderId, payload);
}

/** Pure decision helper for tests: confirm should PATCH, not POST. */
export function shouldConfirmViaOpenBillPatch(
  orderId: string | null,
  order: Order | null | undefined,
  cartLength: number,
): boolean {
  return cartLength > 0 && shouldUpdateOpenBill(orderId, order);
}
