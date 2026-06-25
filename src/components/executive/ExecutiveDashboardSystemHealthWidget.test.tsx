// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseExecutiveSystemHealthSummary = vi.fn();

vi.mock("@/hooks/executive/useExecutiveSystemHealthSummary", () => ({
  useExecutiveSystemHealthSummary: () => mockUseExecutiveSystemHealthSummary(),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn((selector) => selector({ hasPermission: () => true })),
}));

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: vi.fn((selector) => selector({ activeOutletId: 1 })),
}));

import { ExecutiveDashboardSystemHealthWidget } from "./ExecutiveDashboardSystemHealthWidget";

describe("ExecutiveDashboardSystemHealthWidget", () => {
  beforeEach(() => {
    mockUseExecutiveSystemHealthSummary.mockReturnValue({
      loading: false,
      score: 82,
      severity: "warning",
      scorePartial: true,
      activeIncidents: 3,
      bugReports: { counts: { critical: 1 } },
      failedJobs: { data: { failedJobs: 2 } },
    });
  });

  it("renders system health summary metrics", () => {
    render(
      <MemoryRouter>
        <ExecutiveDashboardSystemHealthWidget />
      </MemoryRouter>,
    );
    expect(screen.getByText("System Health Summary")).toBeInTheDocument();
    expect(screen.getByText("82")).toBeInTheDocument();
    expect(screen.getByText("Active Incidents")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
