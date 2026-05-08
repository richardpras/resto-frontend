import { beforeEach, describe, expect, it, vi } from "vitest";
import { useKitchenStore } from "./kitchenStore";

const mockListKitchenTickets = vi.fn();

vi.mock("@/lib/api-integration/kitchenEndpoints", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api-integration/kitchenEndpoints")>(
      "@/lib/api-integration/kitchenEndpoints",
    );
  return {
    ...actual,
    listKitchenTickets: (...args: unknown[]) => mockListKitchenTickets(...args),
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
    items: [{ id: "99", orderItemId: "199", name: "Nasi Goreng", qty: 1, status: "queued" }],
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
    activeRequestId: 0,
    activeAbortController: null,
    lastRequestMeta: null,
  });
}

describe("kitchenStore recovery", () => {
  beforeEach(() => {
    vi.useRealTimers();
    mockListKitchenTickets.mockReset();
    resetState();
  });

  it("poll restart keeps a single active timer", async () => {
    vi.useFakeTimers();
    mockListKitchenTickets.mockResolvedValue({
      tickets: [buildApiTicket()],
      meta: { currentPage: 1, perPage: 20, total: 1, lastPage: 1 },
    });

    await useKitchenStore.getState().startPolling({ outletId: 2, perPage: 20 }, 1000);
    const firstTimer = useKitchenStore.getState().pollTimer;
    await useKitchenStore.getState().startPolling({ outletId: 2, perPage: 20 }, 1000);
    const secondTimer = useKitchenStore.getState().pollTimer;

    expect(firstTimer).not.toBe(secondTimer);
    await vi.advanceTimersByTimeAsync(2200);
    // 2 immediate fetches + 2 interval ticks from the latest timer.
    expect(mockListKitchenTickets).toHaveBeenCalledTimes(4);
  });

  it("stopPolling cleans up and prevents further refreshes", async () => {
    vi.useFakeTimers();
    mockListKitchenTickets.mockResolvedValue({
      tickets: [buildApiTicket()],
      meta: { currentPage: 1, perPage: 20, total: 1, lastPage: 1 },
    });

    await useKitchenStore.getState().startPolling({ outletId: 2, perPage: 20 }, 1000);
    useKitchenStore.getState().stopPolling();
    await vi.advanceTimersByTimeAsync(2000);

    expect(useKitchenStore.getState().pollTimer).toBeNull();
    expect(mockListKitchenTickets).toHaveBeenCalledTimes(1);
  });

  it("ignores stale polling response after fast restart", async () => {
    let resolveFirst!: (value: unknown) => void;
    mockListKitchenTickets
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce({
        tickets: [buildApiTicket({ id: "2", ticketNo: "KT-002" })],
        meta: { currentPage: 1, perPage: 20, total: 1, lastPage: 1 },
      });

    void useKitchenStore.getState().startPolling({ outletId: 2, perPage: 20 }, 1000);
    await useKitchenStore.getState().startPolling({ outletId: 3, perPage: 20 }, 1000);
    resolveFirst({
      tickets: [buildApiTicket({ id: "1", ticketNo: "KT-001-OLD", outletId: 2 })],
      meta: { currentPage: 1, perPage: 20, total: 1, lastPage: 1 },
    });
    await Promise.resolve();

    const state = useKitchenStore.getState();
    expect(state.lastListParams).toEqual({ outletId: 3, perPage: 20 });
    expect(state.tickets[0]?.ticketNo).toBe("KT-002");
  });
});
