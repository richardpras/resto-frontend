import { describe, expect, it, vi } from "vitest";
import type { Order } from "@/stores/orderStore";
import {
  effectivePaymentBalanceDue,
  hydrateCartFromOrder,
  orderBalanceDue,
  orderItemsToCartItems,
  shouldConfirmViaOpenBillPatch,
  shouldSyncCartToOpenBill,
  shouldUpdateOpenBill,
} from "./posOpenBillSync";

const unpaidOrder: Order = {
  id: "10",
  code: "ORD-10",
  source: "pos",
  orderType: "Dine In",
  items: [],
  subtotal: 0,
  tax: 0,
  total: 0,
  status: "confirmed",
  paymentStatus: "unpaid",
  payments: [],
  customerName: "Guest",
  customerPhone: "",
};

const orderWithItems: Order = {
  ...unpaidOrder,
  items: [
    { id: "501", name: "Tea", price: 20000, qty: 1, emoji: "🍵", notes: "" },
  ],
  subtotal: 20000,
  tax: 2000,
  total: 22000,
};

describe("posOpenBillSync", () => {
  it("maps order items to cart lines", () => {
    const lines = orderItemsToCartItems(orderWithItems);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ id: "501", name: "Tea", qty: 1, price: 20000 });
  });

  it("shouldUpdateOpenBill when unpaid open bill exists", () => {
    expect(shouldUpdateOpenBill("10", unpaidOrder)).toBe(true);
    expect(shouldUpdateOpenBill("10", { ...unpaidOrder, paymentStatus: "paid" })).toBe(false);
    expect(shouldUpdateOpenBill(null, unpaidOrder)).toBe(false);
  });

  it("shouldSyncCartToOpenBill requires cart items", () => {
    expect(shouldSyncCartToOpenBill("10", unpaidOrder, 2)).toBe(true);
    expect(shouldSyncCartToOpenBill("10", unpaidOrder, 0)).toBe(false);
  });

  it("effectivePaymentBalanceDue prefers cart total before sync", () => {
    expect(effectivePaymentBalanceDue(unpaidOrder, 16500, 2)).toBe(16500);
    expect(effectivePaymentBalanceDue(orderWithItems, 16500, 0)).toBe(22000);
    expect(orderBalanceDue(orderWithItems)).toBe(22000);
  });

  it("shouldConfirmViaOpenBillPatch chooses PATCH path", () => {
    expect(shouldConfirmViaOpenBillPatch("10", unpaidOrder, 1)).toBe(true);
    expect(shouldConfirmViaOpenBillPatch(null, unpaidOrder, 1)).toBe(false);
    expect(shouldConfirmViaOpenBillPatch("10", unpaidOrder, 0)).toBe(false);
  });

  it("hydrateCartFromOrder only when cart empty", () => {
    const setCart = vi.fn();
    hydrateCartFromOrder(orderWithItems, setCart, 0);
    expect(setCart).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "501", qty: 1 })]),
    );
    setCart.mockClear();
    hydrateCartFromOrder(orderWithItems, setCart, 2);
    expect(setCart).not.toHaveBeenCalled();
  });
});
