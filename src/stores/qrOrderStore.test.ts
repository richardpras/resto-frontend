import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQrOrderStore } from "./qrOrderStore";

const mockListQrOrdersWithMeta = vi.fn();
const mockGetQrOrderPendingSummary = vi.fn();
const mockCreateQrOrder = vi.fn();
const mockConfirmQrOrder = vi.fn();
const mockCallQrOrderCashier = vi.fn();
const mockRejectQrOrder = vi.fn();
const mockRealtimeSubscribe = vi.fn();
const mockRealtimeConnect = vi.fn();
const mockRealtimeOnConnectionStateChange = vi.fn();
const mockRealtimeUnsubscribeAll = vi.fn();

vi.mock("@/lib/api-integration/qrOrderEndpoints", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-integration/qrOrderEndpoints")>(
    "@/lib/api-integration/qrOrderEndpoints",
  );
  return {
    ...actual,
    listQrOrdersWithMeta: (...args: unknown[]) => mockListQrOrdersWithMeta(...args),
    getQrOrderPendingSummary: (...args: unknown[]) => mockGetQrOrderPendingSummary(...args),
    createQrOrder: (...args: unknown[]) => mockCreateQrOrder(...args),
    confirmQrOrder: (...args: unknown[]) => mockConfirmQrOrder(...args),
    callQrOrderCashier: (...args: unknown[]) => mockCallQrOrderCashier(...args),
    rejectQrOrder: (...args: unknown[]) => mockRejectQrOrder(...args),
  };
});

vi.mock("@/domain/realtimeAdapter", () => ({
  getRealtimeAdapter: () => ({
    subscribe: (...args: unknown[]) => mockRealtimeSubscribe(...args),
    connect: (...args: unknown[]) => mockRealtimeConnect(...args),
    onConnectionStateChange: (...args: unknown[]) => mockRealtimeOnConnectionStateChange(...args),
    unsubscribeAll: (...args: unknown[]) => mockRealtimeUnsubscribeAll(...args),
  }),
}));

function buildRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    requestCode: "QRR-001",
    outletId: 2,
    tableId: 3,
    tableName: "T03",
    customerName: "Ana",
    status: "pending_cashier_confirmation",
    decisionMode: null,
    expiresAt: "2026-05-07T08:10:00.000Z",
    confirmedAt: null,
    rejectedAt: null,
    rejectionReason: null,
    orderId: null,
    items: [{ id: 1, menuItemId: 77, qty: 2, notes: "No spicy" }],
    createdAt: "2026-05-07T08:00:00.000Z",
    ...overrides,
  };
}

function resetState() {
  useQrOrderStore.getState().stopPolling();
  useQrOrderStore.getState().stopSummaryPolling();
  useQrOrderStore.setState({
    requests: [],
    isLoading: false,
    initialLoading: false,
    backgroundRefreshing: false,
    hasLoadedOnce: false,
    isSubmitting: false,
    error: null,
    pagination: null,
    lastSyncAt: null,
    lastListParams: null,
    pollingMs: 10000,
    pollingTimer: null,
    pendingSummary: null,
    pendingSummaryLoadedOnce: false,
    pendingSummaryRefreshing: false,
    summaryPollingOutletId: null,
    summaryPollingVisibilityCleanup: null,
  });
}

describe("qrOrderStore", () => {
  beforeEach(() => {
    vi.useRealTimers();
    mockListQrOrdersWithMeta.mockReset();
    mockGetQrOrderPendingSummary.mockReset();
    mockCreateQrOrder.mockReset();
    mockConfirmQrOrder.mockReset();
    mockCallQrOrderCashier.mockReset();
    mockRejectQrOrder.mockReset();
    mockRealtimeSubscribe.mockReset();
    mockRealtimeConnect.mockReset();
    mockRealtimeOnConnectionStateChange.mockReset();
    mockRealtimeUnsubscribeAll.mockReset();
    resetState();
  });

  it("refreshes pending requests with polling", async () => {
    vi.useFakeTimers();
    mockListQrOrdersWithMeta.mockResolvedValue({
      requests: [buildRequest()],
      meta: { currentPage: 1, perPage: 20, total: 1, lastPage: 1 },
    });

    useQrOrderStore.getState().startPolling({ outletId: 2, status: "pending_cashier_confirmation", perPage: 20 }, 1000);
    await vi.runOnlyPendingTimersAsync();
    await vi.advanceTimersByTimeAsync(1000);

    expect(mockListQrOrdersWithMeta).toHaveBeenCalled();
    expect(useQrOrderStore.getState().requests).toHaveLength(1);
    useQrOrderStore.getState().stopPolling();
  });

  it("polls lightweight pending summary for sound alerts", async () => {
    vi.useFakeTimers();
    mockGetQrOrderPendingSummary.mockResolvedValue({
      count: 1,
      ids: ["10"],
      entries: [
        {
          id: 10,
          requestCode: "QRR-001",
          outletId: 2,
          tableId: 3,
          tableName: "T03",
          customerName: "Ana",
          cashierCallCount: 0,
          cashierCalledAt: null,
          createdAt: "2026-05-07T08:00:00.000Z",
        },
      ],
    });

    useQrOrderStore.getState().startSummaryPolling(2, 1000);
    await vi.runOnlyPendingTimersAsync();
    await vi.advanceTimersByTimeAsync(1000);

    expect(mockGetQrOrderPendingSummary).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(mockListQrOrdersWithMeta).not.toHaveBeenCalled();
    expect(useQrOrderStore.getState().pendingSummary?.count).toBe(1);
    expect(useQrOrderStore.getState().pendingSummary?.ids).toEqual(["10"]);
    useQrOrderStore.getState().stopSummaryPolling();
  });

  it("confirm/reject updates request status correctly", async () => {
    useQrOrderStore.setState({
      requests: [
        {
          id: "10",
          requestCode: "QRR-001",
          outletId: 2,
          tableId: 3,
          tableName: "T03",
          customerName: "Ana",
          status: "pending_cashier_confirmation",
          decisionMode: null,
          expiresAt: null,
          confirmedAt: null,
          rejectedAt: null,
          rejectionReason: "",
          orderId: null,
          items: [{ id: "1", menuItemId: 77, qty: 2, notes: "No spicy" }],
          createdAt: new Date("2026-05-07T08:00:00.000Z"),
        },
      ],
    });
    mockConfirmQrOrder.mockResolvedValueOnce(buildRequest({ id: 10, status: "confirmed", confirmedAt: "2026-05-07T08:03:00.000Z" }));
    await useQrOrderStore.getState().confirmRequest("10");
    expect(useQrOrderStore.getState().requests[0].status).toBe("confirmed");

    mockRejectQrOrder.mockResolvedValueOnce(
      buildRequest({ id: 11, status: "rejected", rejectedAt: "2026-05-07T08:05:00.000Z", rejectionReason: "Out of stock" }),
    );
    await useQrOrderStore.getState().rejectRequest("11", "Out of stock");
    expect(useQrOrderStore.getState().requests.some((r) => r.id === "11" && r.status === "rejected")).toBe(true);
  });

  it("does not toggle full loading during background refresh after initial sync", async () => {
    let resolveFirst: ((value: { requests: ReturnType<typeof buildRequest>[]; meta: { currentPage: number; perPage: number; total: number; lastPage: number } }) => void) | null = null;
    mockListQrOrdersWithMeta
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve as typeof resolveFirst;
          }),
      )
      .mockResolvedValueOnce({
        requests: [buildRequest({ id: 22 })],
        meta: { currentPage: 1, perPage: 20, total: 1, lastPage: 1 },
      });

    const first = useQrOrderStore.getState().fetchRequests({ outletId: 2, perPage: 20 });
    expect(useQrOrderStore.getState().isLoading).toBe(true);
    resolveFirst?.({
      requests: [buildRequest({ id: 21 })],
      meta: { currentPage: 1, perPage: 20, total: 1, lastPage: 1 },
    });
    await first;

    const second = useQrOrderStore.getState().fetchRequests(
      { outletId: 2, perPage: 20 },
      { mode: "background" },
    );
    expect(useQrOrderStore.getState().isLoading).toBe(false);
    await second;
  });

  it("normalizes cashier called realtime payload and updates queue immediately", () => {
    useQrOrderStore.setState({
      requests: [
        {
          id: "10",
          requestCode: "QRR-001",
          outletId: 2,
          tableId: 3,
          tableName: "T03",
          customerName: "Ana",
          status: "pending_cashier_confirmation",
          decisionMode: null,
          statusLabel: "Awaiting Cashier",
          estimatedTotal: 0,
          cashierCalledAt: null,
          cashierCallCount: 0,
          expiresAt: null,
          confirmedAt: null,
          rejectedAt: null,
          rejectionReason: "",
          orderId: null,
          items: [],
          createdAt: new Date("2026-05-07T08:00:00.000Z"),
        },
      ],
    });

    let onEvent: ((event: Record<string, unknown>) => void) | null = null;
    mockRealtimeOnConnectionStateChange.mockImplementation((listener: (s: string) => void) => {
      listener("connected");
      return () => undefined;
    });
    mockRealtimeSubscribe.mockImplementation((cfg: { onEvent: (event: Record<string, unknown>) => void }) => {
      onEvent = cfg.onEvent;
      return () => undefined;
    });

    useQrOrderStore.getState().startRealtime();
    onEvent?.({
      channel: "qr",
      sequence: 22,
      payload: {
        request_id: 10,
        cashier_call_count: 3,
        cashier_called_at: "2026-05-07T08:09:00.000Z",
      },
    });

    const row = useQrOrderStore.getState().requests.find((r) => r.id === "10");
    expect(row?.cashierCallCount).toBe(3);
    expect(row?.cashierCalledAt?.toISOString()).toBe("2026-05-07T08:09:00.000Z");
  });
});
