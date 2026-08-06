import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOutletStore } from "./outletStore";
import { useOrdersExplorerStore } from "./ordersExplorerStore";
import { useOfflineSyncStore } from "./offlineSyncStore";
import { saveCachedOpenOrders } from "@/mobile/offline/offlineOrdersCache";
import { saveCachedPaidOrders } from "@/mobile/offline/offlinePaidOrdersCache";

const mockListOrdersWithMeta = vi.fn();
const mockGetOrder = vi.fn();
const mockListOrderPosEvents = vi.fn();
const mockListOrderRecoveryEvents = vi.fn();
const mockApproveOrderItemRecovery = vi.fn();
const mockListReceiptRenderHistory = vi.fn();
const mockIsNativePosShell = vi.fn(() => false);
const mockHydratePaidDebounced = vi.fn(() => Promise.resolve([]));

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

vi.mock("@/mobile/platform", () => ({
  isNativePosShell: () => mockIsNativePosShell(),
}));

vi.mock("@/mobile/offline/hydratePaidOrdersCache", () => ({
  hydratePaidOrdersCacheDebounced: (...args: unknown[]) => mockHydratePaidDebounced(...args),
}));

describe("ordersExplorerStore", () => {
  beforeEach(() => {
    mockListOrdersWithMeta.mockReset();
    mockGetOrder.mockReset();
    mockListOrderPosEvents.mockReset();
    mockListOrderRecoveryEvents.mockReset();
    mockApproveOrderItemRecovery.mockReset();
    mockListReceiptRenderHistory.mockReset();
    mockIsNativePosShell.mockReset();
    mockIsNativePosShell.mockReturnValue(false);
    mockHydratePaidDebounced.mockReset();
    mockHydratePaidDebounced.mockResolvedValue([]);
    useOfflineSyncStore.setState({ isOnline: true });
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

  it("passes hasRecoveryPending filter to list API", async () => {
    mockListOrdersWithMeta.mockResolvedValue({
      orders: [],
      meta: { currentPage: 1, perPage: 25, total: 0, lastPage: 1 },
    });
    useOrdersExplorerStore.getState().setFilters({ hasRecoveryPending: true, paymentStatus: "paid" });
    await Promise.resolve();
    expect(mockListOrdersWithMeta).toHaveBeenCalled();
    const arg = mockListOrdersWithMeta.mock.calls.at(-1)?.[0];
    expect(arg?.hasRecoveryPending).toBe(true);
    expect(arg?.paymentStatus).toBe("paid");
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

  it("offline list unions open + paid caches", async () => {
    mockIsNativePosShell.mockReturnValue(true);
    useOfflineSyncStore.setState({ isOnline: false });
    const fresh = new Date().toISOString();
    await saveCachedOpenOrders(1, [
      {
        id: "local:1",
        code: "L1",
        paymentStatus: "unpaid",
        status: "confirmed",
        total: 1,
        items: [],
        payments: [],
      },
    ]);
    await saveCachedPaidOrders(1, [
      {
        id: "55",
        code: "P55",
        paymentStatus: "paid",
        status: "completed",
        total: 2,
        items: [],
        payments: [],
        createdAt: fresh,
        paidAt: fresh,
        cachedAt: fresh,
      },
    ]);
    await useOrdersExplorerStore.getState().fetchList({ append: false, background: false });
    expect(mockListOrdersWithMeta).not.toHaveBeenCalled();
    const ids = useOrdersExplorerStore.getState().orders.map((o) => String(o.id)).sort();
    expect(ids).toEqual(["55", "local:1"]);
  });

  it("offline detail loads from paid cache without remote APIs", async () => {
    mockIsNativePosShell.mockReturnValue(true);
    useOfflineSyncStore.setState({ isOnline: false });
    const fresh = new Date().toISOString();
    await saveCachedPaidOrders(1, [
      {
        id: "77",
        code: "PAID-77",
        paymentStatus: "paid",
        status: "completed",
        total: 5000,
        items: [{ id: 1, name: "Tea", qty: 1, price: 5000 }],
        payments: [{ id: "p", method: "cash", amount: 5000, paidAt: fresh }],
        createdAt: fresh,
        paidAt: fresh,
        cachedAt: fresh,
        customerName: "",
        customerPhone: "",
        tableNumber: "",
        source: "pos",
        orderType: "Dine-in",
        subtotal: 5000,
        tax: 0,
      },
    ]);
    await useOrdersExplorerStore.getState().ensureDetailLoaded("77");
    expect(mockGetOrder).not.toHaveBeenCalled();
    const bucket = useOrdersExplorerStore.getState().detailByKey["1:77"];
    expect(bucket?.order?.code).toBe("PAID-77");
    expect(bucket?.events).toEqual([]);
    expect(bucket?.receipts).toEqual([]);
    expect(bucket?.error).toBeNull();
  });
});
