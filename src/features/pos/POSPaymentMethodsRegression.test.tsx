import { describe, expect, it } from "vitest";
import { iconForCheckoutMethod } from "./paymentMethodCapabilities";
import type { OutletPaymentMethodConfigApi } from "@/lib/api-integration/outletPaymentMethodEndpoints";

/** Mirrors POS checkout tile building — enabled methods only (API contract). */
function buildPosCheckoutTiles(methods: OutletPaymentMethodConfigApi[]) {
  return methods.map((method) => ({
    code: method.paymentMethodCode,
    label: method.label,
    icon: iconForCheckoutMethod(method),
  }));
}

const baseMethod = (overrides: Partial<OutletPaymentMethodConfigApi>): OutletPaymentMethodConfigApi => ({
  id: 1,
  outletId: 1,
  paymentMethodCode: "cash",
  type: "cash",
  enabled: true,
  displayOrder: 10,
  isDefault: true,
  label: "Cash",
  settlementMethod: "cash",
  isCash: true,
  isGateway: false,
  isManualQris: false,
  ...overrides,
});

describe("POSPaymentMethodsRegression", () => {
  it("shows enabled Cash in checkout tiles", () => {
    const tiles = buildPosCheckoutTiles([
      baseMethod({ paymentMethodCode: "cash", label: "Cash" }),
    ]);
    expect(tiles.map((t) => t.code)).toContain("cash");
  });

  it("does not include disabled methods in checkout API payload", () => {
    const apiCheckoutResponse = [
      baseMethod({ paymentMethodCode: "cash", enabled: true }),
      baseMethod({
        paymentMethodCode: "gateway_qris",
        type: "gateway_qris",
        label: "QRIS Online",
        enabled: false,
        isGateway: true,
      }),
    ].filter((m) => m.enabled);

    const tiles = buildPosCheckoutTiles(apiCheckoutResponse);
    expect(tiles.map((t) => t.code)).toEqual(["cash"]);
  });

  it("shows manual QRIS when enabled in checkout response", () => {
    const tiles = buildPosCheckoutTiles([
      baseMethod({ paymentMethodCode: "cash", label: "Cash" }),
      baseMethod({
        paymentMethodCode: "manual_qris",
        type: "manual_qris",
        label: "QRIS",
        isCash: false,
        isManualQris: true,
        settlementMethod: "qris",
      }),
    ]);
    expect(tiles.map((t) => t.code)).toContain("manual_qris");
  });
});
