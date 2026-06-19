import { describe, expect, it } from "vitest";
import type { Order } from "@/stores/orderStore";
import { shouldConfirmViaOpenBillPatch, shouldUpdateOpenBill } from "./posOpenBillSync";

const reservationLinkedShell: Order = {
  id: "42",
  code: "RSV-ORD",
  source: "pos",
  orderType: "Dine In",
  items: [],
  subtotal: 0,
  tax: 0,
  total: 0,
  status: "confirmed",
  paymentStatus: "unpaid",
  payments: [],
  customerName: "Pras",
  customerPhone: "077782",
  memberId: 7,
};

describe("reservation POS checkout routing", () => {
  it("confirm uses PATCH when reservation linked order is active", () => {
    const orderId = "42";
    expect(shouldUpdateOpenBill(orderId, reservationLinkedShell)).toBe(true);
    expect(shouldConfirmViaOpenBillPatch(orderId, reservationLinkedShell, 3)).toBe(true);
  });

  it("confirm uses POST for walk-in without open bill", () => {
    expect(shouldConfirmViaOpenBillPatch(null, null, 2)).toBe(false);
    expect(shouldUpdateOpenBill(null, null)).toBe(false);
  });

  it("does not PATCH when linked order already paid", () => {
    expect(
      shouldConfirmViaOpenBillPatch("42", { ...reservationLinkedShell, paymentStatus: "paid" }, 2),
    ).toBe(false);
  });
});
