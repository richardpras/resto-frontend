// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockUseExecutiveDashboardData = vi.fn();

vi.mock("@/hooks/executive/useExecutiveDashboardData", () => ({
  useExecutiveDashboardData: () => mockUseExecutiveDashboardData(),
}));

vi.mock("@/stores/authStore", () => ({
  PERMISSIONS: {},
  useAuthStore: vi.fn((selector) => selector({ hasPermission: () => true })),
}));

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: vi.fn((selector) => selector({ activeOutletId: 1 })),
}));

import ExecutiveDashboard from "@/pages/ExecutiveDashboard";

describe("ExecutiveDashboard widgets", () => {
  beforeEach(() => {
    mockUseExecutiveDashboardData.mockReturnValue({
      sales: {
        status: "success",
        data: {
          summary: { grossSales: 500000, netSales: 450000, refundAmount: 10000, refundCount: 2 },
          topProducts: [{ productId: "1", productName: "Burger", quantity: 10, grossSales: 100, netSales: 90 }],
        },
      },
      accountingHealth: {
        status: "success",
        data: { healthScore: 88, healthSeverity: "warning", failedPostings: 1, priorityQueue: [{ id: "1" }] },
      },
      giftCardLiability: {
        status: "success",
        data: { giftCardLiabilityBalance: 100000, storeCreditLiabilityBalance: 50000, status: "balanced" },
      },
      paymentHealth: {
        status: "success",
        data: { healthSeverity: "healthy", paymentSuccessRate: 99.2, failedWebhooks: 0, openIncidents: 0 },
      },
      monitoring: {
        status: "success",
        data: {
          kitchen: { queued: 2, inProgress: 1, ready: 0 },
          pendingPayments: 3,
          activeSessions: 4,
          printerQueue: { pending: 0, failed: 1, printing: 0 },
          hardware: { staleBridges: 0, deadLetters: 0 },
          offlineSync: { failures: 2, conflicts: 0 },
        },
      },
      loyalty: {
        status: "success",
        data: {
          executiveSummary: { activeMembers: 120, repeatCustomerRate: 42.5 },
          voucherAnalytics: { voucherRedemptionRate: 18.2 },
          topMembers: [{ memberNo: "M1", name: "Alice", spending: 250000, points: 100 }],
        },
      },
      foodCostPercent: { status: "success", data: 38.5 },
      menuOpenAlerts: { status: "success", data: 2 },
      menuCriticalAlerts: { status: "success", data: 0 },
      notifications: {
        status: "success",
        data: {
          data: [
            {
              id: 1,
              outletId: 1,
              userId: 1,
              severity: "critical",
              sourceModule: "accounting",
              sourceType: "test",
              sourceId: "a-1",
              title: "Posting failure",
              message: "msg",
              actionUrl: null,
              readAt: null,
              isRead: false,
              metadata: {},
              createdAt: null,
              updatedAt: null,
            },
          ],
          meta: { currentPage: 1, lastPage: 1, perPage: 10, total: 1 },
        },
      },
      unreadCount: { status: "success", data: 3 },
      criticalNotifications: { status: "success", data: [{ id: 1 }] },
      warningNotifications: { status: "success", data: [{ id: 2 }, { id: 3 }] },
      auditActivity: {
        status: "success",
        data: {
          todayEvents: 12,
          activeUsers: 3,
          criticalEvents: 1,
          financialChanges: 2,
          approvals: 1,
          topActors: [],
          topModules: [],
          riskEvents: [],
        },
      },
      executiveScore: { score: 85, partial: false, pillarCount: 4, weights: {} },
      scoreLoading: false,
      refetchAll: vi.fn(),
    });
  });

  it("renders widget values and deep links", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <ExecutiveDashboard />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Audit Activity")).toBeTruthy();
    expect(screen.getByText("Payment Health")).toBeTruthy();
    expect(screen.getAllByText("Gift Card Liability").length).toBeGreaterThan(0);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Burger")).toBeTruthy();
    expect(screen.getByText("Posting failure")).toBeTruthy();

    const salesLink = screen.getAllByRole("link", { name: /Open/i }).find((el) =>
      el.getAttribute("href")?.includes("/reports/executive-sales"),
    );
    expect(salesLink).toBeTruthy();
  });
});
