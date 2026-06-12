import { describe, expect, it } from "vitest";
import type { Order } from "@/stores/orderStore";
import {
  isUnpaidOpenBill,
  openBillCheckoutIdempotencyKey,
  shouldResumeOpenBillCheckout,
} from "./posOpenBillCheckout";

const unpaidOrder = (id: string): Order => ({
  id,
  code: `POS-${id}`,
  paymentStatus: "unpaid",
  status: "confirmed",
} as Order);

describe("posOpenBillCheckout", () => {
  it("builds stable idempotency key per open bill", () => {
    expect(openBillCheckoutIdempotencyKey("520")).toBe("pos-checkout-order-520");
  });

  it("resumes unpaid open bill checkout", () => {
    const order = unpaidOrder("520");
    expect(shouldResumeOpenBillCheckout("520", order)).toBe(true);
    expect(isUnpaidOpenBill(order)).toBe(true);
  });

  it("does not resume paid bills", () => {
    const order = { ...unpaidOrder("520"), paymentStatus: "paid" } as Order;
    expect(shouldResumeOpenBillCheckout("520", order)).toBe(false);
  });
});
