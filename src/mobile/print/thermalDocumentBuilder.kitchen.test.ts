import { describe, expect, it } from "vitest";
import { buildKitchenChitDocuments } from "./thermalDocumentBuilder";

describe("buildKitchenChitDocuments", () => {
  it("splits one ticket per category", () => {
    const docs = buildKitchenChitDocuments(
      {
        code: "ORD-1",
        tableName: "T1",
        orderType: "Dine In",
        items: [
          { id: "1", name: "Burger", price: 10, qty: 1, emoji: "", notes: "", category: "Food" },
          { id: "2", name: "Cola", price: 5, qty: 2, emoji: "", notes: "", category: "Beverage" },
          { id: "3", name: "Fries", price: 8, qty: 1, emoji: "", notes: "", category: "Food" },
        ],
      },
      { paperWidth: "58mm", outletName: "Cafe" },
    );

    expect(docs).toHaveLength(2);
    const food = docs.find((d) => d.lines.some((l) => l.text.includes("FOOD TICKET")));
    const bev = docs.find((d) => d.lines.some((l) => l.text.includes("BEVERAGE TICKET")));
    expect(food).toBeTruthy();
    expect(bev).toBeTruthy();
    expect(food!.lines.some((l) => l.text.includes("Burger"))).toBe(true);
    expect(food!.lines.some((l) => l.text.includes("Fries"))).toBe(true);
    expect(bev!.lines.some((l) => l.text.includes("Cola"))).toBe(true);
  });

  it("prints item notes on kitchen tickets", () => {
    const docs = buildKitchenChitDocuments(
      {
        code: "ORD-2",
        tableName: "T2",
        orderType: "Dine In",
        items: [
          { id: "1", name: "Burger", price: 10, qty: 1, emoji: "", notes: "tanpa bawang", category: "Food" },
        ],
      },
      { paperWidth: "58mm", outletName: "Cafe" },
    );

    expect(docs).toHaveLength(1);
    expect(docs[0]!.lines.some((l) => l.text.includes("CATATAN: tanpa bawang"))).toBe(true);
  });
});
