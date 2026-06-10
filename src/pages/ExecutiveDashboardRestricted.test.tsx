// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ExecutiveWidgetCard } from "@/components/executive/ExecutiveWidgetCard";

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: vi.fn((selector) => selector({ activeOutletId: null })),
}));

vi.mock("@/stores/authStore", () => ({
  PERMISSIONS: {},
  useAuthStore: vi.fn((selector) => selector({ hasPermission: () => true })),
}));

vi.mock("@/hooks/executive/useExecutiveDashboardData", () => ({
  useExecutiveDashboardData: () => ({
    sales: { status: "restricted", permissionHint: "reports.view" },
    accountingHealth: { status: "restricted", permissionHint: "accounting.manage" },
    giftCardLiability: { status: "restricted", permissionHint: "accounting.manage" },
    paymentHealth: { status: "restricted", permissionHint: "settings.manage" },
    monitoring: { status: "restricted", permissionHint: "pos.use" },
    loyalty: { status: "restricted", permissionHint: "members.manage" },
    foodCostPercent: { status: "restricted", permissionHint: "analytics.view" },
    menuOpenAlerts: { status: "restricted" },
    menuCriticalAlerts: { status: "restricted" },
    notifications: { status: "empty" },
    unreadCount: { status: "success", data: 0 },
    criticalNotifications: { status: "success", data: [] },
    warningNotifications: { status: "success", data: [] },
    executiveScore: { score: 0, partial: true, pillarCount: 0, weights: {} },
    scoreLoading: false,
    refetchAll: vi.fn(),
  }),
}));

import ExecutiveDashboard from "@/pages/ExecutiveDashboard";

describe("ExecutiveDashboard restricted", () => {
  it("shows outlet selection prompt without outlet", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <ExecutiveDashboard />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText(/Select an outlet/i)).toBeTruthy();
  });

  it("renders restricted widget card", () => {
    render(
      <ExecutiveWidgetCard
        title="Accounting Health"
        status="restricted"
        permissionHint="accounting.manage"
      />,
    );

    expect(screen.getByText("Restricted")).toBeTruthy();
    expect(screen.getByText(/Requires accounting.manage/i)).toBeTruthy();
  });
});
