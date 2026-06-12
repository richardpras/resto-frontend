import { describe, expect, it } from "vitest";
import { buildSplitPaymentsPayload } from "./buildSplitPaymentsPayload";
import type { Order, SplitPerson } from "@/stores/orderStore";

const order: Pick<Order, "items"> = {
  items: [
    { id: "10", orderItemId: "1023", name: "A", price: 45000, qty: 1, emoji: "", notes: "" },
    { id: "11", orderItemId: "1024", name: "B", price: 42000, qty: 1, emoji: "", notes: "" },
    { id: "12", orderItemId: "1025", name: "C", price: 38750, qty: 2, emoji: "", notes: "" },
  ],
};

const priceLines = order.items.map((item) => ({ id: item.id, price: item.price, qty: item.qty }));

describe("buildSplitPaymentsPayload", () => {
  it("consolidates multiple draft payments per person into one allocation set", () => {
    const splitPersons: SplitPerson[] = [
      {
        label: "Person 1",
        items: [
          { itemId: "10", qty: 1 },
          { itemId: "11", qty: 1 },
        ],
        payments: [
          { method: "Cash", amount: 87000, paidAt: new Date("2026-06-12T02:58:54.845Z") },
          { method: "Cash", amount: 8700, paidAt: new Date("2026-06-12T02:59:34.759Z") },
        ],
        totalDue: 95700,
      },
      {
        label: "Person 2",
        items: [{ itemId: "12", qty: 2 }],
        payments: [
          { method: "Cash", amount: 77500, paidAt: new Date("2026-06-12T02:59:01.007Z") },
          { method: "Cash", amount: 93000, paidAt: new Date("2026-06-12T02:59:31.675Z") },
        ],
        totalDue: 170500,
      },
    ];

    const batch = buildSplitPaymentsPayload(order, splitPersons, "by-item", priceLines);
    expect(batch).toHaveLength(2);
    expect(batch[0].amount).toBe(95700);
    expect(batch[1].amount).toBe(170500);

    const alloc1023 = batch.flatMap((p) => p.allocations ?? []).filter((a) => a.orderItemId === 1023);
    const alloc1024 = batch.flatMap((p) => p.allocations ?? []).filter((a) => a.orderItemId === 1024);
    const alloc1025 = batch.flatMap((p) => p.allocations ?? []).filter((a) => a.orderItemId === 1025);

    expect(alloc1023).toHaveLength(1);
    expect(alloc1023[0].qty).toBe(1);
    expect(alloc1024).toHaveLength(1);
    expect(alloc1024[0].qty).toBe(1);
    expect(alloc1025).toHaveLength(1);
    expect(alloc1025[0].qty).toBe(2);
  });
});
