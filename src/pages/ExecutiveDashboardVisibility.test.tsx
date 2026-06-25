// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockUseExecutiveDashboardData = vi.fn();

vi.mock("@/hooks/executive/useExecutiveDashboardData", () => ({
  useExecutiveDashboardData: (...args: unknown[]) => mockUseExecutiveDashboardData(...args),
}));

vi.mock("@/stores/authStore", () => ({
  PERMISSIONS: { REPORTS: "reports.view", ACCOUNTING: "accounting.manage", SETTINGS: "settings.manage" },
  useAuthStore: vi.fn((selector) =>
    selector({
      hasPermission: (perm: string) => perm === "reports.view",
    }),
  ),
}));

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: vi.fn((selector) => selector({ activeOutletId: 1 })),
}));

vi.mock("@/components/executive/ExecutiveDashboardSystemHealthWidget", () => ({
  ExecutiveDashboardSystemHealthWidget: () => <div>System Health Summary</div>,
}));

vi.mock("@/components/executive/ExecutiveInventoryReliabilityWidget", () => ({
  ExecutiveInventoryReliabilityWidget: () => null,
}));

vi.mock("@/components/executive/ExecutiveShiftCloseWidget", () => ({
  ExecutiveShiftCloseWidget: () => null,
}));

vi.mock("@/components/executive/ExecutiveCustomerOrderingWidget", () => ({
  ExecutiveCustomerOrderingWidget: () => null,
}));

import ExecutiveDashboard from "@/pages/ExecutiveDashboard";

function widgetState<T>(status: "success" | "restricted" | "loading", data?: T) {
  return { status, data, permissionHint: status === "restricted" ? "accounting.manage" : undefined };
}

describe("ExecutiveDashboard visibility", () => {
  beforeEach(() => {
    mockUseExecutiveDashboardData.mockReturnValue({
      sales: widgetState("success", {
        summary: { grossSales: 1000, netSales: 900, refundAmount: 50, refundCount: 1 },
        topProducts: [],
      }),
      accountingHealth: widgetState("restricted"),
      giftCardLiability: widgetState("restricted"),
      paymentHealth: widgetState("restricted"),
      monitoring: widgetState("restricted"),
      loyalty: widgetState("restricted"),
      foodCostPercent: widgetState("restricted"),
      menuOpenAlerts: widgetState("restricted"),
      menuCriticalAlerts: widgetState("restricted"),
      notifications: widgetState("success", { data: [], meta: { currentPage: 1, lastPage: 1, perPage: 10, total: 0 } }),
      unreadCount: widgetState("success", 0),
      criticalNotifications: widgetState("success", []),
      warningNotifications: widgetState("success", []),
      auditActivity: widgetState("restricted"),
      executiveScore: { score: 72, partial: true, pillarCount: 1, weights: {} },
      scoreLoading: false,
      refetchAll: vi.fn(),
    });
  });

  it("renders page title and sales widget", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <ExecutiveDashboard />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Owner Control Tower")).toBeTruthy();
    expect(screen.getByText("Executive Sales")).toBeTruthy();
    expect(screen.getByText("Gross Sales")).toBeTruthy();
  });

  it("shows restricted accounting widget", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <ExecutiveDashboard />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getAllByText("Restricted").length).toBeGreaterThan(0);
    expect(screen.getByText("Accounting Health")).toBeTruthy();
  });
});
