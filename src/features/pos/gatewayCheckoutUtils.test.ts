import { describe, expect, it } from "vitest";
import {
  canReuseCheckoutOrder,
  gatewayRetryLabel,
  isTerminalGatewayStatus,
  shouldBlockDuplicateGatewayAttempt,
  remapSettlementBatchMethod,
} from "./gatewayCheckoutUtils";
import type { Order } from "@/stores/orderStore";

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "42",
    code: "POS-ABC",
    source: "pos",
    orderType: "Dine-in",
    items: [],
    subtotal: 10000,
    tax: 1000,
    total: 11000,
    status: "confirmed",
    paymentStatus: "unpaid",
    payments: [],
    customerName: "",
    customerPhone: "",
    tableNumber: "",
    createdAt: new Date(),
    ...overrides,
  };
}

describe("gatewayCheckoutUtils", () => {
  it("detects terminal gateway statuses", () => {
    expect(isTerminalGatewayStatus("paid")).toBe(true);
    expect(isTerminalGatewayStatus("expired")).toBe(true);
    expect(isTerminalGatewayStatus("pending")).toBe(false);
  });

  it("reuses unpaid checkout order when ids match", () => {
    expect(canReuseCheckoutOrder("42", order({ id: "42", paymentStatus: "unpaid" }))).toBe(true);
    expect(canReuseCheckoutOrder("42", order({ id: "42", paymentStatus: "paid" }))).toBe(false);
    expect(canReuseCheckoutOrder("42", order({ id: "43" }))).toBe(false);
  });

    it("labels qris retry action explicitly", () => {
    expect(gatewayRetryLabel("qris")).toBe("Retry QRIS Payment");
    expect(gatewayRetryLabel("ewallet")).toBe("Retry Payment");
  });

  it("blocks only duplicate pending gateway method", () => {
    expect(shouldBlockDuplicateGatewayAttempt("qris", "qris")).toBe(true);
    expect(shouldBlockDuplicateGatewayAttempt("qris", "cash")).toBe(false);
    expect(shouldBlockDuplicateGatewayAttempt("qris", "ewallet")).toBe(false);
  });

  it("remaps split settlement batch to another method", () => {
    const batch = remapSettlementBatchMethod(
      [{ method: "qris", amount: 50000, paidAt: "2026-01-01T00:00:00.000Z" }],
      "cash",
    );
    expect(batch[0]?.method).toBe("cash");
    expect(batch[0]?.amount).toBe(50000);
  });
});
