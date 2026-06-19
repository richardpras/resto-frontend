import { describe, expect, it } from "vitest";
import {
  createOrderPaymentIdempotencyKey,
  qrCheckoutIdempotencyKey,
  resolveCheckoutIdempotencyKey,
} from "./posCheckoutIdempotency";

describe("posCheckoutIdempotency", () => {
  it("builds unique payment idempotency key per order attempt", () => {
    const key = createOrderPaymentIdempotencyKey("533");
    expect(key.startsWith("pos-checkout-pay-order-533-")).toBe(true);
    expect(key).not.toBe("pos-checkout-order-533");
  });

  it("uses stable QR idempotency key for order create resume", () => {
    expect(qrCheckoutIdempotencyKey(42)).toBe("pos-qr-checkout-42");
    expect(resolveCheckoutIdempotencyKey({ qrOrderRequestId: 42 })).toBe("pos-qr-checkout-42");
  });

  it("does not reuse order-scoped create key for generic checkout attempts", () => {
    const key = resolveCheckoutIdempotencyKey({ scope: "pay-now" });
    expect(key.startsWith("pos-checkout-pay-now-")).toBe(true);
    expect(key.startsWith("pos-checkout-order-")).toBe(false);
  });
});
