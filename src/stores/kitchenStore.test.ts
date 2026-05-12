import { beforeEach, describe, expect, it, vi } from "vitest";
import { useKitchenStore } from "./kitchenStore";

const mockListKitchenTickets = vi.fn();
const mockUpdateKitchenTicketStatus = vi.fn();

vi.mock("@/lib/api-integration/kitchenEndpoints", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api-integration/kitchenEndpoints")>(
      "@/lib/api-integration/kitchenEndpoints",
    );
  return {
    ...actual,
    listKitchenTickets: (...args: unknown[]) => mockListKitchenTickets(...args),
    updateKitchenTicketStatus: (...args: unknown[]) => mockUpdateKitchenTicketStatus(...args),
  };
});

function buildApiTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: "1",
    outletId: 2,
    orderId: "11",
    ticketNo: "KT-001",
    status: "queued",
    queuedAt: "2026-05-07T07:00:00.000Z",
    startedAt: null,
    readyAt: null,
    servedAt: null,
    items: [
      {
        id: "99",
        orderItemId: "199",
        name: "Nasi Goreng",
        qty: 1,
        notes: "No chili",
        status: "queued",
      },
    ],
    createdAt: "2026-05-07T07:00:00.000Z",
    updatedAt: "2026-05-07T07:00:00.000Z",
    ...overrides,
  };
}

function resetState() {
  useKitchenStore.getState().stopPolling();
  useKitchenStore.setState({
    tickets: [],
    isLoading: false,
    isSubmitting: false,
    error: null,
    pagination: null,
    lastSyncAt: null,
    lastListParams: null,
    pollingMs: 8000,
    pollTimer: null,
  });
}

describe("kitchenStore contracts", () => {
  beforeEach(() => {
    vi.useRealTimers();
    mockListKitchenTickets.mockReset();
    mockUpdateKitchenTicketStatus.mockReset();
    resetState();
  });

  it("fetches tickets via endpoint and maps DTO fields", async () => {
    mockListKitchenTickets.mockResolvedValueOnce({
      tickets: [buildApiTicket()],
      meta: { currentPage: 1, perPage: 20, total: 1, lastPage: 1 },
    });

    await useKitchenStore.getState().fetchTickets({ outletId: 2, perPage: 20 });

    const state = useKitchenStore.getState();
    expect(mockListKitchenTickets).toHaveBeenCalledWith(
      { outletId: 2, perPage: 20 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(state.tickets[0].ticketNo).toBe("KT-001");
    expect(state.tickets[0].items[0].notes).toBe("No chili");
  });

  it("revalidates and polls with last params", async () => {
    vi.useFakeTimers();
    mockListKitchenTickets.mockResolvedValue({
      tickets: [buildApiTicket()],
      meta: { currentPage: 1, perPage: 200, total: 1, lastPage: 1 },
    });

    await useKitchenStore.getState().startPolling({ outletId: 3, perPage: 200 }, 1000);
    expect(mockListKitchenTickets).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(mockListKitchenTickets).toHaveBeenCalledTimes(2);
    expect(mockListKitchenTickets).toHaveBeenLastCalledWith(
      { outletId: 3, perPage: 200 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    useKitchenStore.getState().stopPolling();
  });

  it("updates status through API and revalidates", async () => {
    mockListKitchenTickets.mockResolvedValue({
      tickets: [buildApiTicket({ status: "ready" })],
      meta: { currentPage: 1, perPage: 200, total: 1, lastPage: 1 },
    });
    mockUpdateKitchenTicketStatus.mockResolvedValueOnce(buildApiTicket({ status: "ready" }));

    await useKitchenStore.getState().fetchTickets({ outletId: 2, perPage: 200 });
    await useKitchenStore.getState().updateTicketStatus("1", "ready");

    expect(mockUpdateKitchenTicketStatus).toHaveBeenCalledWith(
      "1",
      "ready",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(mockListKitchenTickets).toHaveBeenCalledTimes(2);
    expect(useKitchenStore.getState().isSubmitting).toBe(false);
  });
});
