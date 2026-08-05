import { beforeEach, describe, expect, it } from "vitest";
import {
  loadCachedOpenOrders,
  mergeServerOpenOrdersWithLocalCache,
  saveCachedOpenOrders,
  upsertCachedOpenOrder,
} from "./offlineOrdersCache";

describe("offlineOrdersCache", () => {
  beforeEach(async () => {
    await saveCachedOpenOrders(7, []);
  });

  it("upserts local open orders into outlet cache", async () => {
    await upsertCachedOpenOrder(7, {
      id: "local:abc",
      code: "L1",
      paymentStatus: "unpaid",
      total: 10000,
      payments: [],
      items: [],
    });
    const rows = await loadCachedOpenOrders(7);
    expect(rows).toHaveLength(1);
    expect(String(rows[0]?.id)).toBe("local:abc");
  });

  it("preserves unsynced local open bills when merging server list", async () => {
    await upsertCachedOpenOrder(7, {
      id: "local:keep-me",
      code: "LKEEP",
      paymentStatus: "unpaid",
      total: 5000,
      payments: [],
      items: [],
    });
    await upsertCachedOpenOrder(7, {
      id: "local:paid-away",
      code: "LPAID",
      paymentStatus: "paid",
      total: 1000,
      payments: [],
      items: [],
    });

    const merged = await mergeServerOpenOrdersWithLocalCache(7, [
      {
        id: 99,
        code: "SRV-99",
        paymentStatus: "unpaid",
        total: 20000,
        payments: [],
        items: [],
      },
    ]);

    const ids = merged.map((row) => String(row.id)).sort();
    expect(ids).toEqual(["99", "local:keep-me"]);
  });
});
