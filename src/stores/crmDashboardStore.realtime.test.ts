import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCrmDashboardSnapshot = vi.fn();
const mockAdapterConnect = vi.fn();
let realtimeHandler: ((event: Record<string, unknown>) => void) | null = null;

vi.mock("@/lib/api-integration/crmEndpoints", () => ({
  getCrmDashboardSnapshot: (...args: unknown[]) => mockGetCrmDashboardSnapshot(...args),
}));

vi.mock("@/domain/realtimeAdapter", () => ({
  getRealtimeAdapter: () => ({
    connect: () => mockAdapterConnect(),
    subscribe: (args: { onEvent: (event: Record<string, unknown>) => void }) => {
      realtimeHandler = args.onEvent;
      return () => {
        realtimeHandler = null;
      };
    },
    onConnectionStateChange: (listener: (state: "connected" | "disconnected") => void) => {
      listener("disconnected");
      return () => undefined;
    },
  }),
}));

import { useCrmDashboardStore } from "./crmDashboardStore";

describe("crmDashboardStore realtime fallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockGetCrmDashboardSnapshot.mockReset();
    mockAdapterConnect.mockReset();
    realtimeHandler = null;
    useCrmDashboardStore.getState().reset();
  });

  it("keeps polling fallback active when websocket is disconnected", async () => {
    mockGetCrmDashboardSnapshot.mockResolvedValue({
      customer_count: 45,
      active_loyalty_members: 30,
      points_issued: 1200,
      points_redeemed: 400,
      redemption_count: 18,
      gift_card_outstanding_value: 950000,
      pending_gift_card_settlements: 2,
    });

    await useCrmDashboardStore.getState().refreshForOutlet(3);
    useCrmDashboardStore.getState().startRealtime();
    useCrmDashboardStore.getState().startPollingFallback(1000);
    await vi.advanceTimersByTimeAsync(1000);

    const state = useCrmDashboardStore.getState();
    expect(state.pollingActive).toBe(true);
    expect(state.realtimeTransport).toBe("polling");
    expect(mockAdapterConnect).toHaveBeenCalledTimes(1);
  });

  it("applies newest realtime sequence and ignores stale event", async () => {
    useCrmDashboardStore.setState({
      outletId: 3,
      metrics: {
        outletId: 3,
        customerCount: 10,
        activeLoyaltyMembers: 8,
        pointsIssued: 100,
        pointsRedeemed: 50,
        redemptionCount: 2,
        giftCardOutstandingValue: 20000,
        pendingGiftCardSettlements: 1,
        updatedAt: null,
      },
      lastRealtimeSeq: 0,
    });
    useCrmDashboardStore.getState().startRealtime();
    expect(realtimeHandler).toBeTypeOf("function");

    realtimeHandler?.({
      channel: "crm-dashboard",
      seq: 8,
      payload: { outlet_id: 3, customer_count: 12, redemption_count: 3 },
    });
    realtimeHandler?.({
      channel: "crm-dashboard",
      seq: 5,
      payload: { outlet_id: 3, customer_count: 2 },
    });

    const state = useCrmDashboardStore.getState();
    expect(state.metrics.customerCount).toBe(12);
    expect(state.metrics.redemptionCount).toBe(3);
    expect(state.lastRealtimeSeq).toBe(8);
  });
});
