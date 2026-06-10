// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseSystemHealthData = vi.fn();

vi.mock("@/hooks/system-health/useSystemHealthData", () => ({
  useSystemHealthData: () => mockUseSystemHealthData(),
}));

vi.mock("@/stores/authStore", () => ({
  PERMISSIONS: { SETTINGS: "settings.manage" },
  useAuthStore: vi.fn((selector) => selector({ hasPermission: (p: string) => p === "settings.manage" })),
}));

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: vi.fn((selector) => selector({ activeOutletId: 1 })),
}));

import SystemHealthCenterPage from "./SystemHealthCenterPage";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("SystemHealthCenter", () => {
  beforeEach(() => {
    mockUseSystemHealthData.mockReturnValue({
      loading: false,
      refetchAll: vi.fn(),
      score: 87,
      severity: "healthy",
      scorePartial: false,
      activeIncidents: 2,
      accounting: { status: "success", data: { healthScore: 90, healthSeverity: "healthy", failedPostings: 0, priorityQueue: [] } },
      payment: { status: "success", data: { healthSeverity: "healthy", paymentSuccessRate: 99, failedWebhooks: 0, openIncidents: 0 } },
      failedJobs: { status: "success", data: { failedJobs: 1, criticalFailures: 0, oldestFailureMinutes: 10, healthStatus: "healthy" } },
      bugReports: { status: "success", counts: { open: 2, critical: 0, investigating: 1, fixedToday: 3 } },
      notifications: { status: "success", critical: [], unreadCount: 5, bySource: { system: 2 } },
      audit: { status: "success", data: { todayEvents: 12, criticalEvents: 1, topActors: [], topModules: [] } },
      inventoryAlerts: { status: "success", count: 0 },
      menuAlerts: { status: "success", summary: { openAlerts: 0, criticalAlerts: 0, resolvedToday: 0 } },
      incidents: [],
      priorityQueue: [],
      trends: { failedJobs: [], payment: null, accounting: null, bugVolume: [], systemScore: [] },
    });
  });

  it("renders health center with platform score", async () => {
    render(<SystemHealthCenterPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("System Health Center")).toBeInTheDocument();
    });
    expect(screen.getAllByText("87").length).toBeGreaterThan(0);
    expect(screen.getByText("Active Incidents")).toBeInTheDocument();
  });
});
