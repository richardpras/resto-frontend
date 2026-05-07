import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQrOrderStore } from "./qrOrderStore";

const mockListQrOrdersWithMeta = vi.fn();
const mockCreateQrOrder = vi.fn();
const mockConfirmQrOrder = vi.fn();
const mockRejectQrOrder = vi.fn();

vi.mock("@/lib/api-integration/qrOrderEndpoints", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-integration/qrOrderEndpoints")>(
    "@/lib/api-integration/qrOrderEndpoints",
  );
  return {
    ...actual,
    listQrOrdersWithMeta: (...args: unknown[]) => mockListQrOrdersWithMeta(...args),
    createQrOrder: (...args: unknown[]) => mockCreateQrOrder(...args),
    confirmQrOrder: (...args: unknown[]) => mockConfirmQrOrder(...args),
    rejectQrOrder: (...args: unknown[]) => mockRejectQrOrder(...args),
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
  });
}

describe("qrOrderStore", () => {
  beforeEach(() => {
    vi.useRealTimers();
    mockListQrOrdersWithMeta.mockReset();
    mockCreateQrOrder.mockReset();
    mockConfirmQrOrder.mockReset();
    mockRejectQrOrder.mockReset();
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
});
