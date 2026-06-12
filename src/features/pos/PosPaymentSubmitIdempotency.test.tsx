import { describe, expect, it } from "vitest";
import { createCheckoutAttemptId } from "./posCheckoutIdempotency";
import { isPosPaymentSubmitDisabled, shouldClearCartAfterCheckout } from "./posPaymentSubmitGuards";

describe("PosPaymentSubmitIdempotency", () => {
  it("disables pay button while submitting", () => {
    expect(isPosPaymentSubmitDisabled({
      selectedCheckoutCode: "cash",
      submitting: true,
      paymentIsSubmitting: false,
      gatewayCheckoutPending: false,
      paymentAckRequired: false,
    })).toBe(true);
  });

  it("double click guard uses same checkout attempt id prefix", () => {
    const first = createCheckoutAttemptId("pay-now");
    const second = createCheckoutAttemptId("pay-now");
    expect(first).toMatch(/^pos-checkout-pay-now-/);
    expect(second).toMatch(/^pos-checkout-pay-now-/);
    expect(first).not.toBe(second);
  });

  it("blocks submit after stock error until user acknowledges", () => {
    expect(isPosPaymentSubmitDisabled({
      selectedCheckoutCode: "cash",
      submitting: false,
      paymentIsSubmitting: false,
      gatewayCheckoutPending: false,
      paymentAckRequired: true,
    })).toBe(true);
  });

  it("does not clear cart on failure", () => {
    expect(shouldClearCartAfterCheckout(false)).toBe(false);
  });

  it("clears cart only after success", () => {
    expect(shouldClearCartAfterCheckout(true)).toBe(true);
  });
});
