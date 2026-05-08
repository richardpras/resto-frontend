import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOrderStore } from "./orderStore";
import type { OrderApi } from "@/lib/api-integration/endpoints";

const mockListOrdersWithMeta = vi.fn();

vi.mock("@/lib/api-integration/endpoints", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api-integration/endpoints")>(
      "@/lib/api-integration/endpoints",
    );
  return {
    ...actual,
    listOrdersWithMeta: (...args: unknown[]) => mockListOrdersWithMeta(...args),
  };
});

function buildApiOrder(overrides: Partial<OrderApi> = {}): OrderApi {
  return {
    id: "1",
    code: "POS-1",
    source: "pos",
    orderType: "Takeaway",
    status: "confirmed",
    paymentStatus: "unpaid",
    items: [{ id: "101", name: "Nasi", qty: 1, price: 10000 }],
    subtotal: 10000,
    tax: 1000,
    total: 11000,
    payments: [],
    customerName: "",
    customerPhone: "",
    tableId: null,
    tableName: null,
    tableNumber: "",
    outletId: 1,
    serviceMode: "takeaway",
    orderChannel: "takeaway",
    posSessionId: null,
    kitchenStatus: "queued",
    ...overrides,
  };
}

function resetState() {
  useOrderStore.setState({
    orders: [],
    tables: [],
    isLoading: false,
    isSubmitting: false,
    error: null,
    pagination: null,
    lastSyncAt: null,
    lastListParams: null,
    activeListRequestId: 0,
    activeMutationRequestId: 0,
    activeMutationAbortController: null,
    lastRequestMeta: null,
    splitDrafts: {},
    paymentDrafts: {},
  });
}

describe("orderStore recovery and integrity", () => {
  beforeEach(() => {
    mockListOrdersWithMeta.mockReset();
    resetState();
  });

  it("revalidate preserves pagination and outlet context", async () => {
    mockListOrdersWithMeta.mockResolvedValueOnce({
      orders: [buildApiOrder({ id: "1", outletId: 2 })],
      meta: { currentPage: 3, perPage: 20, total: 41, lastPage: 3 },
    });

    await useOrderStore.getState().fetchOrders({ outletId: 2, perPage: 20, page: 3 });

    mockListOrdersWithMeta.mockResolvedValueOnce({
      orders: [buildApiOrder({ id: "2", code: "POS-2", outletId: 2 })],
      meta: { currentPage: 3, perPage: 20, total: 42, lastPage: 3 },
    });

    await useOrderStore.getState().revalidateOrders();

    expect(mockListOrdersWithMeta).toHaveBeenNthCalledWith(
      2,
      { outletId: 2, perPage: 20, page: 3 },
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Client-Scope": "order-store",
          "X-Client-Action": "fetch-orders",
        }),
      }),
    );
    expect(useOrderStore.getState().pagination?.currentPage).toBe(3);
    expect(useOrderStore.getState().orders[0].outletId).toBe(2);
  });

  it("ignores stale list response after outlet switch", async () => {
    let resolveOutlet1!: (value: unknown) => void;
    mockListOrdersWithMeta.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOutlet1 = resolve;
        }),
    );
    mockListOrdersWithMeta.mockResolvedValueOnce({
      orders: [buildApiOrder({ id: "B1", code: "OUTLET-2", outletId: 2 })],
      meta: { currentPage: 1, perPage: 20, total: 1, lastPage: 1 },
    });

    const firstFetch = useOrderStore.getState().fetchOrders({ outletId: 1, perPage: 20, page: 1 });
    const secondFetch = useOrderStore.getState().fetchOrders({ outletId: 2, perPage: 20, page: 1 });
    await secondFetch;

    resolveOutlet1({
      orders: [buildApiOrder({ id: "A1", code: "OUTLET-1", outletId: 1 })],
      meta: { currentPage: 1, perPage: 20, total: 1, lastPage: 1 },
    });
    await firstFetch;

    const state = useOrderStore.getState();
    expect(state.lastListParams).toEqual({ outletId: 2, perPage: 20, page: 1 });
    expect(state.orders).toHaveLength(1);
    expect(state.orders[0].outletId).toBe(2);
  });
});
