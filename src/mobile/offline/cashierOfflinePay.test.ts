import { beforeEach, describe, expect, it } from "vitest";
import {
  loadCachedOpenOrders,
  removeCachedOpenOrder,
  saveCachedOpenOrders,
} from "@/mobile/offline/offlineOrdersCache";
import {
  loadCachedPaidOrders,
  saveCachedPaidOrders,
  upsertCachedPaidOrder,
} from "@/mobile/offline/offlinePaidOrdersCache";

/**
 * Regression for Cashier offline pay of bootstrap server open bills:
 * after pay, bill must leave open cache (Cashier reload) and land in paid cache.
 */
describe("cashier offline pay cache transition", () => {
  beforeEach(async () => {
    await saveCachedOpenOrders(3, []);
    await saveCachedPaidOrders(3, []);
  });

  it("moves paid server bill from open cache to paid cache for Cashier reload", async () => {
    const fresh = new Date().toISOString();
    await saveCachedOpenOrders(3, [
      {
        id: 99,
        code: "ORD-99",
        paymentStatus: "unpaid",
        status: "confirmed",
        total: 15000,
        items: [{ id: 1, name: "Tea", qty: 1, price: 15000 }],
        payments: [],
        createdAt: fresh,
      },
    ]);

    await upsertCachedPaidOrder(3, {
      id: 99,
      code: "ORD-99",
      paymentStatus: "paid",
      status: "completed",
      total: 15000,
      items: [{ id: 1, name: "Tea", qty: 1, price: 15000 }],
      payments: [{ id: "p1", method: "cash", amount: 15000, paidAt: fresh }],
      createdAt: fresh,
      paidAt: fresh,
    });
    await removeCachedOpenOrder(3, "99");

    const open = await loadCachedOpenOrders(3);
    const paid = await loadCachedPaidOrders(3);
    expect(open.find((r) => String(r.id) === "99")).toBeUndefined();
    expect(paid.find((r) => String(r.id) === "99")?.paymentStatus).toBe("paid");
  });
});
