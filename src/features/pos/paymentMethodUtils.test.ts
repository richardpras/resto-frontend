import { describe, expect, it } from "vitest";
import { FALLBACK_CHECKOUT_METHODS } from "@/features/pos/paymentMethodCapabilities";
import {
  isGatewayPaymentMethod,
  isPaymentMethodBlockedWhenOffline,
  resolveSettlementMethod,
} from "@/features/pos/paymentMethodUtils";
import type { OutletPaymentMethodConfigApi } from "@/lib/api-integration/outletPaymentMethodEndpoints";

const gatewayQris: OutletPaymentMethodConfigApi = {
  id: 9,
  outletId: 1,
  paymentMethodCode: "gateway_qris",
  type: "gateway_qris",
  enabled: true,
  displayOrder: 30,
  isDefault: false,
  label: "QRIS Gateway",
  settlementMethod: "qris",
  isCash: false,
  isGateway: true,
  isManualQris: false,
};

describe("paymentMethodUtils offline gates", () => {
  it("allows Cash by label, code, or settlement while offline", () => {
    for (const method of ["Cash", "cash"]) {
      expect(isPaymentMethodBlockedWhenOffline(method, FALLBACK_CHECKOUT_METHODS)).toBe(false);
      expect(isGatewayPaymentMethod(method, FALLBACK_CHECKOUT_METHODS)).toBe(false);
    }
  });

  it("allows manual QRIS offline and blocks gateway QRIS", () => {
    expect(isPaymentMethodBlockedWhenOffline("QRIS", FALLBACK_CHECKOUT_METHODS)).toBe(false);
    expect(isPaymentMethodBlockedWhenOffline("manual_qris", FALLBACK_CHECKOUT_METHODS)).toBe(false);
    expect(isPaymentMethodBlockedWhenOffline("QRIS Gateway", [gatewayQris])).toBe(true);
    expect(isPaymentMethodBlockedWhenOffline("gateway_qris", [gatewayQris])).toBe(true);
  });

  it("resolves tile labels to settlement methods", () => {
    expect(resolveSettlementMethod("Cash", FALLBACK_CHECKOUT_METHODS)).toBe("cash");
    expect(resolveSettlementMethod("QRIS", FALLBACK_CHECKOUT_METHODS)).toBe("qris");
    expect(resolveSettlementMethod("manual_qris", FALLBACK_CHECKOUT_METHODS)).toBe("qris");
  });
});
