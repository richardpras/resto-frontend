import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiHttpError } from "@/lib/api-integration/client";
import { orderApiToStoreOrder, useOrderStore } from "./orderStore";
import type { OrderApi } from "@/lib/api-integration/endpoints";

const mockListOrdersWithMeta = vi.fn();
const mockCreateOrder = vi.fn();
const mockUpdateOrder = vi.fn();
const mockGetOrder = vi.fn();
const mockAddOrderPayments = vi.fn();

vi.mock("@/lib/api-integration/endpoints", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api-integration/endpoints")>(
      "@/lib/api-integration/endpoints",
    );
  return {
    ...actual,
    listOrdersWithMeta: (...args: unknown[]) => mockListOrdersWithMeta(...args),
    createOrder: (...args: unknown[]) => mockCreateOrder(...args),
    updateOrder: (...args: unknown[]) => mockUpdateOrder(...args),
    getOrder: (...args: unknown[]) => mockGetOrder(...args),
    addOrderPayments: (...args: unknown[]) => mockAddOrderPayments(...args),
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
    items: [
      {
        orderItemId: "10",
        id: "101",
        name: "Nasi Goreng",
        qty: 1,
        price: 10000,
      },
    ],
    subtotal: 10000,
    tax: 1000,
    total: 11000,
    payments: [],
    customerName: "",
    customerPhone: "",
    tableId: null,
    tableName: null,
    tableNumber: "",
    outletId: 5,
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
  });
}

describe("orderStore async lifecycle", () => {
  beforeEach(() => {
    mockListOrdersWithMeta.mockReset();
    mockCreateOrder.mockReset();
    mockUpdateOrder.mockReset();
    mockGetOrder.mockReset();
    mockAddOrderPayments.mockReset();
    resetState();
  });

  it("tracks loading + pagination + lastSyncAt on fetchOrders success", async () => {
    mockListOrdersWithMeta.mockResolvedValueOnce({
      orders: [buildApiOrder({ id: "1", code: "POS-1" }), buildApiOrder({ id: "2", code: "POS-2" })],
      meta: { currentPage: 2, perPage: 20, total: 35, lastPage: 2 },
    });

    const params = { tenantId: 1, outletId: 5, perPage: 20, page: 2 };
    const result = await useOrderStore.getState().fetchOrders(params);

    expect(result.map((o) => o.code)).toEqual(["POS-1", "POS-2"]);

    const state = useOrderStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.pagination).toEqual({ currentPage: 2, perPage: 20, total: 35, lastPage: 2 });
    expect(state.lastListParams).toEqual(params);
    expect(state.lastSyncAt).not.toBeNull();
  });

  it("surfaces API errors via state.error and rejects", async () => {
    mockListOrdersWithMeta.mockRejectedValueOnce(new ApiHttpError(422, "Bad outlet", null));

    await expect(useOrderStore.getState().fetchOrders({ outletId: 99 })).rejects.toThrow("Bad outlet");
    const state = useOrderStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe("Bad outlet");
  });

  it("createOrderRemote populates store and toggles isSubmitting", async () => {
    let observedSubmitting = false;
    mockCreateOrder.mockImplementationOnce(async () => {
      observedSubmitting = useOrderStore.getState().isSubmitting;
      return buildApiOrder({ id: "42", code: "POS-42" });
    });

    const created = await useOrderStore.getState().createOrderRemote({
      tenantId: 1,
      outletId: 5,
      code: "POS-42",
      source: "pos",
      orderType: "Takeaway",
      serviceMode: "takeaway",
      status: "confirmed",
      paymentStatus: "unpaid",
      items: [{ id: "101", name: "Nasi", qty: 1, price: 10000 }],
      subtotal: 10000,
      tax: 1000,
      total: 11000,
      payments: [],
    });

    expect(created.id).toBe("42");
    expect(observedSubmitting).toBe(true);

    const state = useOrderStore.getState();
    expect(state.isSubmitting).toBe(false);
    expect(state.orders[0].code).toBe("POS-42");
  });

  it("updateOrderRemote upserts existing order in place", async () => {
    useOrderStore.getState().addOrder(orderApiToStoreOrder(buildApiOrder({ id: "7", code: "POS-7" })));

    mockUpdateOrder.mockResolvedValueOnce(
      buildApiOrder({ id: "7", code: "POS-7", subtotal: 20000, total: 22000 }),
    );

    const updated = await useOrderStore.getState().updateOrderRemote("7", {
      items: [{ id: "101", name: "Nasi", qty: 2, price: 10000 }],
      subtotal: 20000,
      tax: 2000,
      total: 22000,
    });

    expect(updated.subtotal).toBe(20000);
    expect(useOrderStore.getState().orders.length).toBe(1);
    expect(useOrderStore.getState().orders[0].total).toBe(22000);
  });

  it("revalidateOrders re-runs fetchOrders with last params", async () => {
    mockListOrdersWithMeta.mockResolvedValueOnce({
      orders: [buildApiOrder({ id: "1" })],
      meta: { currentPage: 1, perPage: 10, total: 1, lastPage: 1 },
    });
    await useOrderStore.getState().fetchOrders({ outletId: 5, perPage: 10 });

    mockListOrdersWithMeta.mockResolvedValueOnce({
      orders: [
        buildApiOrder({ id: "1", code: "POS-1" }),
        buildApiOrder({ id: "2", code: "POS-2" }),
      ],
      meta: { currentPage: 1, perPage: 10, total: 2, lastPage: 1 },
    });

    const result = await useOrderStore.getState().revalidateOrders();
    expect(result).not.toBeNull();
    expect(useOrderStore.getState().orders.length).toBe(2);
    expect(mockListOrdersWithMeta).toHaveBeenCalledTimes(2);
    expect(mockListOrdersWithMeta.mock.calls[1]?.[0]).toEqual({ outletId: 5, perPage: 10 });
  });
});

describe("orderStore outlet-scoped rendering behavior", () => {
  beforeEach(() => {
    mockListOrdersWithMeta.mockReset();
    resetState();
  });

  it("only stores orders for the requested outlet (server-trusted scope)", async () => {
    mockListOrdersWithMeta.mockResolvedValueOnce({
      orders: [
        buildApiOrder({ id: "100", code: "OUTLET-A-1", outletId: 1 }),
        buildApiOrder({ id: "101", code: "OUTLET-A-2", outletId: 1 }),
      ],
      meta: { currentPage: 1, perPage: 20, total: 2, lastPage: 1 },
    });
    await useOrderStore.getState().fetchOrders({ outletId: 1 });

    expect(useOrderStore.getState().orders.every((o) => o.outletId === 1)).toBe(true);

    mockListOrdersWithMeta.mockResolvedValueOnce({
      orders: [buildApiOrder({ id: "200", code: "OUTLET-B-1", outletId: 2 })],
      meta: { currentPage: 1, perPage: 20, total: 1, lastPage: 1 },
    });
    await useOrderStore.getState().fetchOrders({ outletId: 2 });

    const state = useOrderStore.getState();
    expect(state.orders.length).toBe(1);
    expect(state.orders[0].outletId).toBe(2);
  });
});

describe("orderStore split/payment draft math", () => {
  beforeEach(() => {
    resetState();
  });

  it("tracks split drafts and payment drafts then recomputes summary", () => {
    const order = orderApiToStoreOrder(buildApiOrder({ id: "p3-1", total: 11000 }));
    useOrderStore.getState().addOrder(order);

    useOrderStore.getState().setSplitDraft("p3-1", {
      splitType: "mixed",
      label: "Table 7 Mixed",
      items: [
        { orderItemId: "10", qty: 1, amount: 5000 },
        { orderItemId: "11", qty: 1, amount: 6000 },
      ],
    });
    useOrderStore.getState().setPaymentDraft("p3-1", [
      { method: "cash", amount: 5000 },
      { method: "transfer", amount: 1000 },
    ]);

    const summary = useOrderStore.getState().getPaymentSummary("p3-1");
    expect(summary.orderTotal).toBe(11000);
    expect(summary.allocatedTotal).toBe(6000);
    expect(summary.remainingBalance).toBe(5000);
  });
});
