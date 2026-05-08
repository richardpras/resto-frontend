import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useQrOrderStore } from "./qrOrderStore";

const mockListQrOrdersWithMeta = vi.fn();

vi.mock("@/lib/api-integration/qrOrderEndpoints", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-integration/qrOrderEndpoints")>(
    "@/lib/api-integration/qrOrderEndpoints",
  );
  return {
    ...actual,
    listQrOrdersWithMeta: (...args: unknown[]) => mockListQrOrdersWithMeta(...args),
  };
});

function buildRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    requestCode: "QRR-001",
    outletId: 2,
    tableId: 3,
    tableName: "T03",
    customerName: "Ana",
    status: "pending_cashier_confirmation",
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
  useQrOrderStore.setState({
    requests: [],
    isLoading: false,
    isSubmitting: false,
    error: null,
    pagination: null,
    lastSyncAt: null,
    lastListParams: null,
    pollingMs: 10000,
    pollingTimer: null,
    activeRequestId: 0,
    activeAbortController: null,
    lastRequestMeta: null,
  });
}

describe("qrOrderStore recovery", () => {
  beforeEach(() => {
    vi.useRealTimers();
    mockListQrOrdersWithMeta.mockReset();
    mockListQrOrdersWithMeta.mockResolvedValue({
      requests: [buildRequest()],
      meta: { currentPage: 1, perPage: 20, total: 1, lastPage: 1 },
    });
    resetState();
  });

  afterEach(() => {
    useQrOrderStore.getState().stopPolling();
    vi.useRealTimers();
  });

  it("reconnect refresh keeps outlet context and stable list", async () => {
    vi.useFakeTimers();
    mockListQrOrdersWithMeta.mockResolvedValue({
      requests: [buildRequest({ id: 10, outletId: 2 })],
      meta: { currentPage: 1, perPage: 20, total: 1, lastPage: 1 },
    });

    useQrOrderStore
      .getState()
      .startPolling({ outletId: 2, status: "pending_cashier_confirmation", perPage: 20 }, 1000);
    await vi.runOnlyPendingTimersAsync();
    useQrOrderStore.getState().stopPolling();
    useQrOrderStore.getState().stopPolling();
    useQrOrderStore
      .getState()
      .startPolling({ outletId: 2, status: "pending_cashier_confirmation", perPage: 20 }, 1000);
    await vi.runOnlyPendingTimersAsync();

    const state = useQrOrderStore.getState();
    expect(state.requests).toHaveLength(1);
    expect(state.requests[0].outletId).toBe(2);
    expect(state.lastListParams).toEqual({
      outletId: 2,
      status: "pending_cashier_confirmation",
      perPage: 20,
    });
  });

  it("stopPolling cleanup prevents extra polling calls", async () => {
    vi.useFakeTimers();
    useQrOrderStore
      .getState()
      .startPolling({ outletId: 2, status: "pending_cashier_confirmation", perPage: 20 }, 1000);
    await vi.runOnlyPendingTimersAsync();
    useQrOrderStore.getState().stopPolling();
    const callsBeforeWait = mockListQrOrdersWithMeta.mock.calls.length;
    await vi.advanceTimersByTimeAsync(2100);

    expect(useQrOrderStore.getState().pollingTimer).toBeNull();
    expect(mockListQrOrdersWithMeta.mock.calls.length).toBe(callsBeforeWait);
  });

  it("drops stale response when outlet context changes quickly", async () => {
    let resolveOld!: (value: unknown) => void;
    mockListQrOrdersWithMeta
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve;
          }),
      )
      .mockResolvedValueOnce({
        requests: [buildRequest({ id: 20, outletId: 4, tableName: "T04" })],
        meta: { currentPage: 1, perPage: 20, total: 1, lastPage: 1 },
      });

    const first = useQrOrderStore.getState().fetchRequests({
      outletId: 2,
      status: "pending_cashier_confirmation",
      perPage: 20,
    });
    const second = useQrOrderStore.getState().fetchRequests({
      outletId: 4,
      status: "pending_cashier_confirmation",
      perPage: 20,
    });
    await second;
    resolveOld({
      requests: [buildRequest({ id: 10, outletId: 2, tableName: "T02" })],
      meta: { currentPage: 1, perPage: 20, total: 1, lastPage: 1 },
    });
    await first;

    const state = useQrOrderStore.getState();
    expect(state.lastListParams?.outletId).toBe(4);
    expect(state.requests[0]?.outletId).toBe(4);
  });
});
