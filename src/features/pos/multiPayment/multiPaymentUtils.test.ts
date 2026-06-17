import { describe, expect, it } from "vitest";
import { FALLBACK_CHECKOUT_METHODS } from "@/features/pos/paymentMethodCapabilities";
import type { PaymentDraftLine } from "./multiPaymentTypes";
import {
  clampDraftAmount,
  draftTotal,
  partitionDraftByCapability,
  remainingToAllocate,
  validateFullSettlement,
} from "./multiPaymentUtils";

const gatewayMethods = [
  ...FALLBACK_CHECKOUT_METHODS,
  {
    id: 3,
    outletId: 1,
    paymentMethodCode: "gateway_qris",
    type: "gateway_qris" as const,
    enabled: true,
    displayOrder: 30,
    isDefault: false,
    label: "QRIS Online",
    settlementMethod: "qris",
    isCash: false,
    isGateway: true,
    isManualQris: false,
  },
];

function line(method: string, amount: number, label = method): PaymentDraftLine {
  return { id: `${method}-${amount}`, method, methodLabel: label, amount };
}

describe("multiPaymentUtils", () => {
  it("computes draft total and remaining allocation", () => {
    const lines = [line("cash", 30000, "Cash"), line("qris", 70000, "QRIS Online")];
    expect(draftTotal(lines)).toBe(100000);
    expect(remainingToAllocate(100000, lines)).toBe(0);
    expect(remainingToAllocate(100000, [line("cash", 30000)])).toBe(70000);
  });

  it("validates full settlement with tolerance", () => {
    const lines = [line("cash", 30000), line("qris", 70000)];
    expect(validateFullSettlement(lines, 100000)).toEqual({ ok: true });
    expect(validateFullSettlement([line("cash", 50000)], 100000)).toEqual({ ok: false, reason: "mismatch" });
    expect(validateFullSettlement([], 100000)).toEqual({ ok: false, reason: "empty" });
  });

  it("clamps draft amount to remaining", () => {
    expect(clampDraftAmount(150000, 100000)).toBe(100000);
    expect(clampDraftAmount(0, 100000)).toBe(0);
    expect(clampDraftAmount(30000, 70000)).toBe(30000);
  });

  it("partitions cash, manual qris, and gateway lines", () => {
    const lines = [
      line("cash", 30000, "Cash"),
      line("qris", 20000, "QRIS"),
      line("qris", 50000, "QRIS Online"),
    ];
    const partition = partitionDraftByCapability(lines, gatewayMethods);
    expect(partition.immediate.map((l) => l.methodLabel)).toEqual(["Cash"]);
    expect(partition.manualQris.map((l) => l.amount)).toEqual([20000]);
    expect(partition.gateway.map((l) => l.amount)).toEqual([50000]);
  });
});
