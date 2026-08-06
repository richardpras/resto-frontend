import { beforeEach, describe, expect, it } from "vitest";
import {
  isPaidOrderWithinRetention,
  loadCachedPaidOrders,
  mergeHydratedPaidOrders,
  paidOrderRetentionMs,
  saveCachedPaidOrders,
  upsertCachedPaidOrder,
} from "./offlinePaidOrdersCache";

describe("offlinePaidOrdersCache", () => {
  beforeEach(async () => {
    await saveCachedPaidOrders(7, []);
  });

  it("upserts paid orders into outlet cache", async () => {
    await upsertCachedPaidOrder(7, {
      id: 42,
      code: "INV-42",
      paymentStatus: "paid",
      total: 10000,
      payments: [{ method: "cash", amount: 10000, paidAt: new Date().toISOString() }],
      items: [],
      createdAt: new Date().toISOString(),
    });
    const rows = await loadCachedPaidOrders(7);
    expect(rows).toHaveLength(1);
    expect(String(rows[0]?.id)).toBe("42");
    expect(typeof rows[0]?.cachedAt).toBe("string");
  });

  it("prunes rows older than 24h on load", async () => {
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const fresh = new Date().toISOString();
    await saveCachedPaidOrders(7, [
      {
        id: "old",
        paymentStatus: "paid",
        createdAt: old,
        paidAt: old,
        cachedAt: old,
      },
      {
        id: "fresh",
        paymentStatus: "paid",
        createdAt: fresh,
        paidAt: fresh,
        cachedAt: fresh,
      },
    ]);
    const rows = await loadCachedPaidOrders(7);
    expect(rows.map((r) => String(r.id))).toEqual(["fresh"]);
  });

  it("mergeHydratedPaidOrders replaces by id then retains only within 24h", async () => {
    const fresh = new Date().toISOString();
    await upsertCachedPaidOrder(7, {
      id: 1,
      code: "A",
      paymentStatus: "paid",
      total: 1,
      createdAt: fresh,
      payments: [],
      items: [],
    });
    const merged = await mergeHydratedPaidOrders(7, [
      {
        id: 1,
        code: "A-updated",
        paymentStatus: "paid",
        total: 2,
        createdAt: fresh,
        payments: [],
        items: [],
      },
      {
        id: 2,
        code: "B",
        paymentStatus: "paid",
        total: 3,
        createdAt: fresh,
        payments: [],
        items: [],
      },
    ]);
    expect(merged).toHaveLength(2);
    expect(merged.find((r) => String(r.id) === "1")?.code).toBe("A-updated");
  });

  it("retention prefers paidAt over createdAt", () => {
    const now = Date.parse("2026-08-06T12:00:00.000Z");
    const order = {
      id: 1,
      createdAt: "2026-08-04T12:00:00.000Z",
      paidAt: "2026-08-06T10:00:00.000Z",
      cachedAt: "2026-08-06T11:00:00.000Z",
    };
    expect(paidOrderRetentionMs(order, now)).toBe(2 * 60 * 60 * 1000);
    expect(isPaidOrderWithinRetention(order, 24 * 60 * 60 * 1000, now)).toBe(true);
  });
});
