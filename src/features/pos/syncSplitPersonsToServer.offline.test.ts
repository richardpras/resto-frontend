import { describe, expect, it } from "vitest";
import { buildSplitSyncPersons } from "./syncSplitPersonsToServer";
import type { Order, SplitPerson } from "@/stores/orderStore";

describe("buildSplitSyncPersons offline lines", () => {
  it("emits clientItemId when order lines have no server orderItemId", () => {
    const order = {
      items: [
        { id: "menu-a", name: "Nasi", price: 20000, qty: 1, emoji: "", notes: "" },
        { id: "menu-b", name: "Teh", price: 10000, qty: 1, emoji: "", notes: "" },
      ],
      subtotal: 30000,
      total: 30000,
      balanceDue: 30000,
    } as Pick<Order, "items" | "subtotal" | "balanceDue" | "total">;

    const persons: SplitPerson[] = [
      { label: "P1", items: [], payments: [], totalDue: 15000 },
      { label: "P2", items: [], payments: [], totalDue: 15000 },
    ];

    const synced = buildSplitSyncPersons(order, persons, "equal");
    expect(synced[0]?.items.length).toBeGreaterThan(0);
    expect(synced[0]?.items.every((it) => it.clientItemId)).toBe(true);
    expect(synced[0]?.items.some((it) => it.clientItemId === "menu-a")).toBe(true);
  });

  it("maps by-item assignments with clientItemId offline", () => {
    const order = {
      items: [{ id: "menu-a", name: "Nasi", price: 20000, qty: 2, emoji: "", notes: "" }],
      subtotal: 40000,
      total: 40000,
      balanceDue: 40000,
    } as Pick<Order, "items" | "subtotal" | "balanceDue" | "total">;

    const persons: SplitPerson[] = [
      { label: "P1", items: [{ itemId: "menu-a", qty: 1 }], payments: [], totalDue: 20000 },
      { label: "P2", items: [{ itemId: "menu-a", qty: 1 }], payments: [], totalDue: 20000 },
    ];

    const synced = buildSplitSyncPersons(order, persons, "by-item");
    expect(synced[0]?.items).toEqual([
      expect.objectContaining({ clientItemId: "menu-a", qty: 1, amount: 20000 }),
    ]);
  });
});
