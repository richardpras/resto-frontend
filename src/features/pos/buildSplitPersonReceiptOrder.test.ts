import { describe, expect, it } from "vitest";
import { buildSplitPersonReceiptOrder } from "./buildSplitPersonReceiptOrder";
import type { Order } from "@/stores/orderStore";

const baseOrder = {
  id: "10",
  code: "ORD-1",
  source: "pos",
  orderType: "dine-in",
  items: [
    { id: "a", name: "Nasi", price: 20000, qty: 2, emoji: "🍚", notes: "" },
    { id: "b", name: "Teh", price: 10000, qty: 1, emoji: "🍵", notes: "" },
  ],
  subtotal: 50000,
  tax: 5000,
  total: 55000,
  discountAmount: 0,
  payments: [],
  paymentStatus: "unpaid",
  status: "confirmed",
  customerName: "",
  customerPhone: "",
  tableNumber: "",
  createdAt: new Date(),
} as Order;

describe("buildSplitPersonReceiptOrder", () => {
  it("scopes by-item lines to the person assignment", () => {
    const receipt = buildSplitPersonReceiptOrder(
      baseOrder,
      {
        label: "Person 1",
        items: [{ itemId: "a", qty: 1 }],
        payments: [{ method: "cash", amount: 20000, paidAt: new Date() }],
        totalDue: 20000,
      },
      "by-item",
    );
    expect(receipt.items).toHaveLength(1);
    expect(receipt.items[0]?.name).toBe("Nasi");
    expect(receipt.items[0]?.qty).toBe(1);
    expect(receipt.total).toBe(20000);
    expect(receipt.paymentStatus).toBe("paid");
    expect(receipt.splitBill?.persons[0]?.label).toBe("Person 1");
  });

  it("builds proportional lines for equal split", () => {
    const receipt = buildSplitPersonReceiptOrder(
      baseOrder,
      {
        label: "Person 2",
        items: [],
        payments: [{ method: "cash", amount: 27500, paidAt: new Date() }],
        totalDue: 27500,
      },
      "equal",
    );
    expect(receipt.total).toBe(27500);
    expect(receipt.items.length).toBeGreaterThan(0);
    expect(receipt.payments).toHaveLength(1);
  });
});
