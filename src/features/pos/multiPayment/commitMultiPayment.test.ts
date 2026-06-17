import { describe, expect, it, vi } from "vitest";
import { FALLBACK_CHECKOUT_METHODS } from "@/features/pos/paymentMethodCapabilities";
import { commitMultiPayment } from "./commitMultiPayment";
import type { PaymentDraftLine } from "./multiPaymentTypes";

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

describe("commitMultiPayment", () => {
  it("posts immediate cash lines and completes", async () => {
    const addOrderPaymentsRemote = vi.fn().mockResolvedValue({ id: "1", paymentStatus: "paid" });
    const paymentCreateTransaction = vi.fn();

    const result = await commitMultiPayment({
      orderId: "1",
      outletId: 1,
      balanceDue: 100000,
      draftLines: [line("cash", 100000, "Cash")],
      checkoutMethods: gatewayMethods,
      addOrderPaymentsRemote,
      paymentCreateTransaction,
    });

    expect(result.outcome).toBe("completed");
    expect(addOrderPaymentsRemote).toHaveBeenCalledWith(
      "1",
      [{ method: "cash", amount: 100000, paidAt: expect.any(String) }],
      undefined,
    );
    expect(paymentCreateTransaction).not.toHaveBeenCalled();
  });

  it("posts cash first then starts gateway for mixed draft", async () => {
    const addOrderPaymentsRemote = vi.fn().mockResolvedValue({ id: "1", paymentStatus: "partial" });
    const paymentCreateTransaction = vi.fn().mockResolvedValue({ id: "tx-1", method: "qris", status: "pending" });

    const result = await commitMultiPayment({
      orderId: "1",
      outletId: 1,
      balanceDue: 100000,
      draftLines: [line("cash", 30000, "Cash"), line("qris", 70000, "QRIS Online")],
      checkoutMethods: gatewayMethods,
      addOrderPaymentsRemote,
      paymentCreateTransaction,
    });

    expect(addOrderPaymentsRemote).toHaveBeenCalledWith(
      "1",
      [{ method: "cash", amount: 30000, paidAt: expect.any(String) }],
      undefined,
    );
    expect(result.outcome).toBe("gateway_pending");
    if (result.outcome === "gateway_pending") {
      expect(result.gatewayPayments).toEqual([
        { method: "qris", amount: 70000, paidAt: expect.any(String) },
      ]);
      expect(paymentCreateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 70000, method: "qris" }),
      );
    }
  });

  it("returns manual qris pending without posting qris lines", async () => {
    const addOrderPaymentsRemote = vi.fn().mockResolvedValue({ id: "1", paymentStatus: "partial" });
    const paymentCreateTransaction = vi.fn();

    const result = await commitMultiPayment({
      orderId: "1",
      outletId: 1,
      balanceDue: 100000,
      draftLines: [line("cash", 30000, "Cash"), line("qris", 70000, "QRIS")],
      checkoutMethods: FALLBACK_CHECKOUT_METHODS,
      addOrderPaymentsRemote,
      paymentCreateTransaction,
    });

    expect(result.outcome).toBe("manual_qris_pending");
    if (result.outcome === "manual_qris_pending") {
      expect(result.manualQrisPayments).toEqual([
        { method: "qris", amount: 70000, paidAt: expect.any(String) },
      ]);
    }
    expect(paymentCreateTransaction).not.toHaveBeenCalled();
  });
});
