import { beforeEach, describe, expect, it, vi } from "vitest";
import { hydratePaidOrdersCache, paidHydrateDateWindow } from "./hydratePaidOrdersCache";
import { loadCachedPaidOrders, saveCachedPaidOrders } from "./offlinePaidOrdersCache";

const mockListOrdersWithMeta = vi.fn();

vi.mock("@/lib/api-integration/endpoints", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api-integration/endpoints")>("@/lib/api-integration/endpoints");
  return {
    ...actual,
    listOrdersWithMeta: (...args: unknown[]) => mockListOrdersWithMeta(...args),
  };
});

describe("hydratePaidOrdersCache", () => {
  beforeEach(async () => {
    mockListOrdersWithMeta.mockReset();
    await saveCachedPaidOrders(9, []);
  });

  it("builds yesterday..today date window", () => {
    const { dateFrom, dateTo } = paidHydrateDateWindow(new Date("2026-08-06T15:00:00"));
    expect(dateFrom).toBe("2026-08-05");
    expect(dateTo).toBe("2026-08-06");
  });

  it("pages paid listOrders into paid cache", async () => {
    const fresh = new Date().toISOString();
    mockListOrdersWithMeta
      .mockResolvedValueOnce({
        orders: [
          {
            id: "101",
            code: "P-101",
            source: "pos",
            orderType: "Dine-in",
            status: "completed",
            paymentStatus: "paid",
            items: [],
            subtotal: 1,
            tax: 0,
            total: 1,
            payments: [{ id: "p1", method: "cash", amount: 1, paidAt: fresh }],
            customerName: "",
            customerPhone: "",
            tableNumber: "",
            createdAt: fresh,
          },
        ],
        meta: { currentPage: 1, lastPage: 2, perPage: 200, total: 2 },
      })
      .mockResolvedValueOnce({
        orders: [
          {
            id: "102",
            code: "P-102",
            source: "pos",
            orderType: "Dine-in",
            status: "completed",
            paymentStatus: "paid",
            items: [],
            subtotal: 2,
            tax: 0,
            total: 2,
            payments: [{ id: "p2", method: "cash", amount: 2, paidAt: fresh }],
            customerName: "",
            customerPhone: "",
            tableNumber: "",
            createdAt: fresh,
          },
        ],
        meta: { currentPage: 2, lastPage: 2, perPage: 200, total: 2 },
      });

    const merged = await hydratePaidOrdersCache(9);
    expect(mockListOrdersWithMeta).toHaveBeenCalledTimes(2);
    expect(merged.map((r) => String(r.id)).sort()).toEqual(["101", "102"]);
    const loaded = await loadCachedPaidOrders(9);
    expect(loaded).toHaveLength(2);
  });
});
