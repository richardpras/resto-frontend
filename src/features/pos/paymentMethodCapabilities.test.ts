import { describe, expect, it } from "vitest";
import {
  FALLBACK_CHECKOUT_METHODS,
  isGatewayCheckoutMethod,
  isManualQrisCheckoutMethod,
  settlementMethodForCheckout,
} from "./paymentMethodCapabilities";

describe("paymentMethodCapabilities", () => {
  it("fallback includes cash and manual qris only", () => {
    const codes = FALLBACK_CHECKOUT_METHODS.map((m) => m.paymentMethodCode);
    expect(codes).toContain("cash");
    expect(codes).toContain("manual_qris");
    expect(codes).not.toContain("gateway_qris");
  });

  it("classifies gateway vs manual qris", () => {
    const manual = FALLBACK_CHECKOUT_METHODS.find((m) => m.paymentMethodCode === "manual_qris")!;
    expect(isManualQrisCheckoutMethod(manual)).toBe(true);
    expect(isGatewayCheckoutMethod(manual)).toBe(false);
    expect(settlementMethodForCheckout(manual)).toBe("qris");
  });
});
