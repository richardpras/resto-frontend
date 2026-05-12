import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOutletStore } from "./outletStore";
import { useOrdersExplorerStore } from "./ordersExplorerStore";

const mockListOrdersWithMeta = vi.fn();
const mockGetOrder = vi.fn();
const mockListOrderPosEvents = vi.fn();
const mockListOrderRecoveryEvents = vi.fn();
const mockApproveOrderItemRecovery = vi.fn();
const mockListReceiptRenderHistory = vi.fn();

vi.mock("@/lib/api-integration/endpoints", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api-integration/endpoints")>("@/lib/api-integration/endpoints");
  return {
    ...actual,
    listOrdersWithMeta: (...args: unknown[]) => mockListOrdersWithMeta(...args),
    getOrder: (...args: unknown[]) => mockGetOrder(...args),
    listOrderPosEvents: (...args: unknown[]) => mockListOrderPosEvents(...args),
    listOrderRecoveryEvents: (...args: unknown[]) => mockListOrderRecoveryEvents(...args),
    approveOrderItemRecovery: (...args: unknown[]) => mockApproveOrderItemRecovery(...args),
  };
});

vi.mock("@/lib/api-integration/receiptDocumentEndpoints", () => ({
  listReceiptRenderHistory: (...args: unknown[]) => mockListReceiptRenderHistory(...args),
}));

describe("ordersExplorerStore", () => {
  beforeEach(() => {
    mockListOrdersWithMeta.mockReset();
    mockGetOrder.mockReset();
    mockListOrderPosEvents.mockReset();
    mockListOrderRecoveryEvents.mockReset();
    mockApproveOrderItemRecovery.mockReset();
    mockListReceiptRenderHistory.mockReset();
    useOutletStore.setState({ activeOutletId: 1, activeOutletCode: "t1" });
    useOrdersExplorerStore.getState().resetForOutletSwitch();
    useOrdersExplorerStore.setState({ filters: {}, perPage: 25 });
  });

  it("loads list via listOrdersWithMeta with outlet scope", async () => {
    mockListOrdersWithMeta.mockResolvedValue({
      orders: [{ id: "10", code: "INV-1", source: "pos", orderType: "T", status: "completed", paymentStatus: "paid", items: [], subtotal: 1, tax: 0, total: 1, payments: [], customerName: "", customerPhone: "", tableNumber: "" }],
      meta: { currentPage: 1, perPage: 25, total: 1, lastPage: 1 },
    });
    await useOrdersExplorerStore.getState().fetchList({ append: false, background: false });
    expect(mockListOrdersWithMeta).toHaveBeenCalledTimes(1);
    const arg = mockListOrdersWithMeta.mock.calls[0][0];
    expect(arg.outletId).toBe(1);
    expect(useOrdersExplorerStore.getState().orders).toHaveLength(1);
  });

  it("dedupes detail load for the same order key", async () => {
    mockGetOrder.mockResolvedValue({
      id: "9",
      code: "X",
      source: "pos",
      orderType: "T",
      status: "pending",
      paymentStatus: "unpaid",
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      payments: [],
      customerName: "",
      customerPhone: "",
      tableNumber: "",
    });
    mockListOrderPosEvents.mockResolvedValue([]);
    mockListOrderRecoveryEvents.mockResolvedValue([]);
    mockListReceiptRenderHistory.mockResolvedValue([]);

    const p1 = useOrdersExplorerStore.getState().ensureDetailLoaded("9");
    const p2 = useOrdersExplorerStore.getState().ensureDetailLoaded("9");
    await Promise.all([p1, p2]);
    expect(mockGetOrder).toHaveBeenCalledTimes(1);
    expect(mockListOrderPosEvents).toHaveBeenCalledTimes(1);
    expect(mockListOrderRecoveryEvents).toHaveBeenCalledTimes(1);
  });

  it("treats recovery-events failure as empty list without failing detail load", async () => {
    mockGetOrder.mockResolvedValue({
      id: "9",
      code: "X",
      source: "pos",
      orderType: "T",
      status: "pending",
      paymentStatus: "unpaid",
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      payments: [],
      customerName: "",
      customerPhone: "",
      tableNumber: "",
    });
    mockListOrderPosEvents.mockResolvedValue([]);
    mockListOrderRecoveryEvents.mockRejectedValue(new Error("403"));
    mockListReceiptRenderHistory.mockResolvedValue([]);

    await useOrdersExplorerStore.getState().ensureDetailLoaded("9");
    const key = `1:9`;
    expect(useOrdersExplorerStore.getState().detailByKey[key]?.recoveryEvents).toEqual([]);
    expect(useOrdersExplorerStore.getState().detailByKey[key]?.error).toBeNull();
  });

  it("refreshRecoveryEvents updates recovery list without toggling full detail loading", async () => {
    const order = {
      id: "9",
      code: "X",
      source: "pos" as const,
      orderType: "T",
      status: "pending",
      paymentStatus: "unpaid" as const,
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      payments: [],
      customerName: "",
      customerPhone: "",
      tableNumber: "",
    };
    mockGetOrder.mockResolvedValue(order);
    mockListOrderPosEvents.mockResolvedValue([]);
    mockListOrderRecoveryEvents
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 1,
          outletId: 1,
          orderId: 9,
          orderItemId: 2,
          eventCode: "recovery_reported",
          reason: null,
          payload: {},
          createdAt: "2020-01-01T00:00:00Z",
          actorUserId: 1,
          managerUserId: null,
          recoveryStatus: "recovery_pending",
        },
      ]);
    mockListReceiptRenderHistory.mockResolvedValue([]);
    await useOrdersExplorerStore.getState().ensureDetailLoaded("9");
    const key = `1:9`;
    expect(useOrdersExplorerStore.getState().detailByKey[key]?.recoveryEvents).toEqual([]);
    await useOrdersExplorerStore.getState().refreshRecoveryEvents("9");
    expect(mockListOrderRecoveryEvents).toHaveBeenCalledTimes(2);
    expect(useOrdersExplorerStore.getState().detailByKey[key]?.recoveryEvents).toHaveLength(1);
    expect(useOrdersExplorerStore.getState().detailByKey[key]?.recoveryRefreshing).toBe(false);
  });

  it("approveItemRecovery refreshes order and recovery events", async () => {
    const item = {
      id: "1",
      orderItemId: 10,
      name: "A",
      qty: 1,
      price: 1000,
      recoveryStatus: "recovery_pending",
      recoveryReason: "x",
    };
    const orderBefore = {
      id: "9",
      code: "X",
      source: "pos" as const,
      orderType: "T",
      status: "pending",
      paymentStatus: "unpaid" as const,
      items: [item],
      subtotal: 1000,
      tax: 0,
      total: 1000,
      payments: [],
      customerName: "",
      customerPhone: "",
      tableNumber: "",
    };
    const orderAfter = { ...orderBefore, items: [{ ...item, recoveryStatus: "recovery_approved" }] };
    mockGetOrder.mockResolvedValueOnce(orderBefore).mockResolvedValue(orderAfter);
    mockListOrderPosEvents.mockResolvedValue([]);
    mockListOrderRecoveryEvents.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 2,
        outletId: 1,
        orderId: 9,
        orderItemId: 10,
        eventCode: "recovery_approved",
        reason: null,
        payload: {},
        createdAt: "2020-01-01T00:00:00Z",
        actorUserId: 1,
        managerUserId: 1,
        recoveryStatus: "recovery_approved",
      },
    ]);
    mockListReceiptRenderHistory.mockResolvedValue([]);
    await useOrdersExplorerStore.getState().ensureDetailLoaded("9");
    mockApproveOrderItemRecovery.mockResolvedValue({
      orderItemId: 10,
      recoveryStatus: "recovery_approved",
      recoveryReason: null,
    });
    await useOrdersExplorerStore.getState().approveItemRecovery("9", 10, { resolution: "recovery_approved", notes: "ok" });
    expect(mockApproveOrderItemRecovery).toHaveBeenCalledWith("9", 10, { resolution: "recovery_approved", notes: "ok" }, expect.any(Object));
    const key = `1:9`;
    expect(useOrdersExplorerStore.getState().detailByKey[key]?.order?.items[0]?.recoveryStatus).toBe("recovery_approved");
    expect(useOrdersExplorerStore.getState().recoveryApprovalSubmitting).toBe(false);
  });

  it("resetForOutletSwitch clears rows and stops polling", () => {
    useOrdersExplorerStore.setState({
      orders: [{ id: "1", code: "A", source: "pos", orderType: "T", status: "pending", paymentStatus: "unpaid", items: [], subtotal: 0, tax: 0, total: 0, payments: [], customerName: "", customerPhone: "", tableNumber: "" }],
      meta: { currentPage: 1, perPage: 25, total: 1, lastPage: 1 },
    });
    useOrdersExplorerStore.getState().startPolling(1000);
    useOrdersExplorerStore.getState().resetForOutletSwitch();
    expect(useOrdersExplorerStore.getState().orders).toHaveLength(0);
    expect(useOrdersExplorerStore.getState().pollingTimer).toBeNull();
  });
});
