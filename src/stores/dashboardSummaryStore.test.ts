import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiHttpError } from "@/lib/api-integration/client";

const mockGetDashboardSummary = vi.fn();

vi.mock("@/lib/api-integration/monitoringEndpoints", () => ({
  getDashboardSummary: (...args: unknown[]) => mockGetDashboardSummary(...args),
}));

vi.mock("@/domain/accessControl", () => ({
  selectUserCapabilities: () => ({
    settings: true,
    crm: true,
    monitoring: true,
    hardwareBridge: true,
    printerAdmin: true,
  }),
}));

import { useDashboardSummaryStore } from "./dashboardSummaryStore";

function summaryFixture(orderCountToday: number) {
  return {
    kpis: { revenueToday: orderCountToday * 10000, orderCountToday, avgOrderValue: 10000, customerCount: 5 },
    hourlyOrders: [{ hour: "10AM", orders: orderCountToday }],
    topMenus: [],
    recentTransactions: [],
    monitoring: {
      activePosSessions: 1,
      pendingKitchenTickets: 2,
      paymentSuccessRate: 90,
      stalePayments: 0,
      qrQueue: { pendingConfirmation: 0, expired: 0 },
      printerQueue: { pending: 0, failed: 0, recoverable: 0, deadLetter: 0 },
      offlineResilience: {
        registeredTerminals: 0,
        staleTerminalDevices: 0,
        aggregateReconnectCounter: 0,
        syncOperationsApplied: 0,
        syncReplayFailures: 0,
        syncStaleReplayRejections: 0,
        syncConflictOperations: 0,
        duplicateReplayAttemptsObserved: 0,
        conflictEventsLogged: 0,
      },
      hardwareBridge: {},
    },
    crmMetrics: {
      activeCustomers: 10,
      repeatVisitRate: 20,
      loyaltyPointsIssued: 100,
      loyaltyPointsRedeemed: 50,
      topTierCounts: {},
      customerRetentionIndicators: { customersWithRecentVisit: 3, inactiveCustomers30d: 1 },
    },
    bestSellerOtherOutlets: [],
  };
}

describe("dashboardSummaryStore loading and race behavior", () => {
  beforeEach(() => {
    mockGetDashboardSummary.mockReset();
    useDashboardSummaryStore.getState().reset();
  });

  it("shows skeleton flags only for initial and outlet-switch refresh", async () => {
    mockGetDashboardSummary.mockResolvedValue(summaryFixture(2));
    await useDashboardSummaryStore.getState().refresh(1, "initial");
    expect(useDashboardSummaryStore.getState().initialLoading).toBe(false);
    expect(useDashboardSummaryStore.getState().isLoading).toBe(false);

    mockGetDashboardSummary.mockResolvedValue(summaryFixture(3));
    await useDashboardSummaryStore.getState().refresh(2, "outlet-switch");
    expect(useDashboardSummaryStore.getState().switchingOutlet).toBe(false);
    expect(useDashboardSummaryStore.getState().summary.kpis.orderCountToday).toBe(3);
  });

  it("preserves previous data during background refresh", async () => {
    mockGetDashboardSummary.mockResolvedValueOnce(summaryFixture(1)).mockResolvedValueOnce(summaryFixture(4));
    await useDashboardSummaryStore.getState().refresh(1, "initial");
    const before = useDashboardSummaryStore.getState().summary.kpis.orderCountToday;
    const promise = useDashboardSummaryStore.getState().refresh(1, "background");
    expect(useDashboardSummaryStore.getState().backgroundRefreshing).toBe(true);
    expect(useDashboardSummaryStore.getState().summary.kpis.orderCountToday).toBe(before);
    await promise;
    expect(useDashboardSummaryStore.getState().summary.kpis.orderCountToday).toBe(4);
  });

  it("ignores stale response when newer request wins", async () => {
    let resolveFirst: ((value: ReturnType<typeof summaryFixture>) => void) | null = null;
    mockGetDashboardSummary
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve as (value: ReturnType<typeof summaryFixture>) => void; }))
      .mockResolvedValueOnce(summaryFixture(9));

    const first = useDashboardSummaryStore.getState().refresh(1, "background");
    const second = useDashboardSummaryStore.getState().refresh(1, "background");
    await second;
    resolveFirst?.(summaryFixture(2));
    await first;
    expect(useDashboardSummaryStore.getState().summary.kpis.orderCountToday).toBe(9);
  });

  it("does not enter retry-like error churn on forbidden background refresh", async () => {
    mockGetDashboardSummary
      .mockResolvedValueOnce(summaryFixture(5))
      .mockRejectedValueOnce(new ApiHttpError(403, "Forbidden", null));
    await useDashboardSummaryStore.getState().refresh(1, "initial");
    const before = useDashboardSummaryStore.getState().summary.kpis.orderCountToday;
    await useDashboardSummaryStore.getState().refresh(1, "background");
    const state = useDashboardSummaryStore.getState();
    expect(state.summary.kpis.orderCountToday).toBe(before);
    expect(state.backgroundRefreshing).toBe(false);
    expect(state.isLoading).toBe(false);
  });
});

