import { describe, expect, it } from "vitest";
import {
  buildSplitOrderItems,
  clampPaymentAmount,
  calculateRemaining,
  clampAllocationQty,
  createPaymentAllocations,
  createSplitPersons,
  getTotalAllocatedQty,
  sumAllocationAmount,
  toSplitPaymentLine,
  upsertPersonAllocation,
} from "./splitPaymentUtils";

describe("splitPaymentUtils", () => {
  it("supports cross-person quantity split with caps", () => {
    const orderItems = buildSplitOrderItems([{ id: "item-1", name: "Nasi Goreng", qty: 3, price: 30000 }]);
    const [item] = orderItems;
    const persons = createSplitPersons(2);

    const p1 = upsertPersonAllocation(persons[0], item, clampAllocationQty(2, item.qty));
    const p2Max = item.qty - getTotalAllocatedQty([p1, persons[1]], item.orderItemId);
    const p2 = upsertPersonAllocation(persons[1], item, clampAllocationQty(2, p2Max));

    expect(p1.allocations[0].qty).toBe(2);
    expect(p2.allocations[0].qty).toBe(1);
    expect(getTotalAllocatedQty([p1, p2], item.orderItemId)).toBe(3);
  });

  it("computes remaining and payment payload allocations", () => {
    const line = toSplitPaymentLine(
      "cash",
      20000,
      [{ orderItemId: "item-1", qty: 1, amount: 20000 }],
      new Date("2026-04-30T00:00:00.000Z")
    );

    expect(line.allocations).toEqual([{ orderItemId: "item-1", qty: 1, amount: 20000 }]);
    expect(calculateRemaining(50000, 20000)).toBe(30000);
    expect(line.paidAt).toBe("2026-04-30T00:00:00.000Z");
  });

  it("clamps partial payment amount and derives allocation amounts", () => {
    const allocations = [
      { orderItemId: "item-1", qty: 2, amount: 60000 },
      { orderItemId: "item-2", qty: 1, amount: 25000 },
    ];

    expect(sumAllocationAmount(allocations)).toBe(85000);
    expect(clampPaymentAmount(90000, 85000)).toBe(85000);
    expect(clampPaymentAmount(30000, 85000)).toBe(30000);

    expect(createPaymentAllocations(allocations, 0)).toEqual([]);
    expect(createPaymentAllocations(allocations, 30000)).toEqual([
      { orderItemId: "item-1", qty: 2, amount: 30000 },
    ]);
    expect(createPaymentAllocations(allocations, 70000)).toEqual([
      { orderItemId: "item-1", qty: 2, amount: 60000 },
      { orderItemId: "item-2", qty: 1, amount: 10000 },
    ]);
  });
});
