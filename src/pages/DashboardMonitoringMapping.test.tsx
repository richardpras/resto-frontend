// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mockGetOperationalMetrics = vi.fn();
const mockGetDashboardSummary = vi.fn();
const mockStartMonitoring = vi.fn();
const mockStopMonitoring = vi.fn();

vi.mock("@/stores/operationalDashboardStore", () => ({
  useOperationalDashboardStore: vi.fn(),
}));

vi.mock("@/stores/dashboardSummaryStore", () => ({
  useDashboardSummaryStore: vi.fn(),
}));

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: vi.fn((selector) => selector({ activeOutletId: 1 })),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn((selector) =>
    selector({
      user: { id: "1", name: "Ops", email: "ops@test.local", role: "Owner", outletIds: [1], pinSet: false, permissions: ["pos.use"] },
    }),
  ),
}));

vi.mock("@/domain/accessControl", () => ({
  getUserCapabilities: () => ({ monitoring: true }),
}));

vi.mock("@/components/ConnectivitySyncRibbon", () => ({
  ConnectivitySyncRibbon: () => null,
}));

import { useOperationalDashboardStore } from "@/stores/operationalDashboardStore";
import { useDashboardSummaryStore } from "@/stores/dashboardSummaryStore";
import { ensureEnglishLocale } from "@/test/i18nTestSetup";
import Dashboard from "@/pages/Dashboard";

const emptySummary = {
  kpis: { revenueToday: 0, orderCountToday: 0, avgOrderValue: 0, customerCount: 0 },
  hourlyOrders: [],
  topMenus: [],
  recentTransactions: [],
  monitoring: {
    activePosSessions: 0,
    pendingKitchenTickets: 0,
    paymentSuccessRate: 0,
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
    activeCustomers: 0,
    repeatVisitRate: 0,
    loyaltyPointsIssued: 0,
    loyaltyPointsRedeemed: 0,
    topTierCounts: {},
    customerRetentionIndicators: { customersWithRecentVisit: 0, inactiveCustomers30d: 0 },
  },
  bestSellerOtherOutlets: [],
};

describe("Dashboard monitoring mapping", () => {
  beforeEach(async () => {
    await ensureEnglishLocale();
    mockStartMonitoring.mockReset();
    mockStopMonitoring.mockReset();

    vi.mocked(useOperationalDashboardStore).mockImplementation((selector) =>
      selector({
        metrics: {
          kitchen: { queued: 8, inProgress: 0, ready: 0 },
          pendingPayments: 2,
          activeSessions: 5,
          qrQueue: { pendingConfirmation: 1, expired: 0 },
          printerQueue: { pending: 0, failed: 1, printing: 0 },
          reconciliationWarnings: [
            { id: "rw-1", message: "3 reconciliation issues detected (payment webhook reconciliation)", severity: "warning" },
          ],
          updatedAt: new Date().toISOString(),
          offlineResilience: {
            registeredTerminals: 0,
            staleTerminalDevices: 0,
            aggregateReconnectCounter: 0,
            syncOperationsApplied: 0,
            syncReplayFailures: 4,
            syncStaleReplayRejections: 0,
            syncConflictOperations: 1,
            duplicateReplayAttemptsObserved: 0,
            conflictEventsLogged: 0,
          },
          hardware: { deadLetters: 3, staleBridges: 2 },
          offlineSync: { failures: 4, conflicts: 1 },
        },
        startMonitoring: mockStartMonitoring,
        stopMonitoring: mockStopMonitoring,
        realtimeTransport: "polling",
        initialLoading: false,
        switchingOutlet: false,
        lastSuccessfulSyncAt: new Date().toISOString(),
      } as ReturnType<typeof useOperationalDashboardStore.getState>),
    );

    vi.mocked(useDashboardSummaryStore).mockImplementation((selector) =>
      selector({
        summary: emptySummary,
        initialLoading: false,
        switchingOutlet: false,
        lastSuccessfulSyncAt: new Date().toISOString(),
        hasLoadedOnce: true,
        refresh: vi.fn(),
      } as ReturnType<typeof useDashboardSummaryStore.getState>),
    );
  });

  it("renders mapped operational metrics on dashboard tiles", async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Queued 8/)).toBeTruthy();
    });

    expect(screen.getByText("Pending Payments").closest("div")?.textContent).toContain("2");
    expect(screen.getByText("Active Sessions").closest("div")?.textContent).toContain("5");
    expect(screen.getByText(/3 reconciliation issues detected/)).toBeTruthy();
    expect(screen.getByText(/Dead letters 3/)).toBeTruthy();
    expect(screen.getByText("Offline Sync Failures").closest("div")?.textContent).toContain("4");
  });
});
