import { describe, expect, it } from "vitest";
import { toKitchenReprintLines } from "./toKitchenReprintLines";

describe("toKitchenReprintLines", () => {
  it("keeps numeric orderItemId for bridge reprint", () => {
    const rows = toKitchenReprintLines([
      { id: "m1", orderItemId: 42, name: "Nasi", qty: 2, notes: "pedas" },
    ]);
    expect(rows[0]).toMatchObject({
      lineKey: "oi-42",
      orderItemId: 42,
      name: "Nasi",
      qty: 2,
      notes: "pedas",
    });
  });

  it("supports offline lines without numeric orderItemId", () => {
    const rows = toKitchenReprintLines([
      { id: "local-line-a", name: "Teh", qty: 1 },
      { id: "local-line-b", orderItemId: "x", name: "Kopi", qty: 1 },
    ]);
    expect(rows[0]?.orderItemId).toBeNull();
    expect(rows[0]?.lineKey).toContain("local-line-a");
    expect(rows[1]?.orderItemId).toBeNull();
    expect(new Set(rows.map((r) => r.lineKey)).size).toBe(2);
  });
});
