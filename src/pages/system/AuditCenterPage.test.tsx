// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListAuditTimeline = vi.fn();
const mockGetAuditCenterSummary = vi.fn();
const mockSearchAuditCenter = vi.fn();
const mockGetAuditEntityHistory = vi.fn();

vi.mock("@/lib/api-integration/auditCenterEndpoints", () => ({
  listAuditTimeline: (...args: unknown[]) => mockListAuditTimeline(...args),
  getAuditCenterSummary: (...args: unknown[]) => mockGetAuditCenterSummary(...args),
  searchAuditCenter: (...args: unknown[]) => mockSearchAuditCenter(...args),
  getAuditEntityHistory: (...args: unknown[]) => mockGetAuditEntityHistory(...args),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn((selector) =>
    selector({ hasPermission: (perm: string) => perm === "settings.manage" }),
  ),
}));

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: vi.fn((selector) => selector({ activeOutletId: 1 })),
}));

import AuditCenterPage from "@/pages/system/AuditCenterPage";

describe("AuditCenterPage", () => {
  beforeEach(() => {
    mockListAuditTimeline.mockResolvedValue({
      data: [
        {
          id: "pos:1",
          module: "purchase",
          entityType: "purchase_order",
          entityId: 42,
          action: "purchase_order_approved",
          userId: 1,
          userName: "Admin",
          outletId: 1,
          timestamp: "2026-06-10T10:00:00.000Z",
          before: {},
          after: {},
          metadata: { riskLevel: "warning" },
        },
      ],
      meta: { currentPage: 1, lastPage: 1, perPage: 25, total: 1 },
    });
    mockGetAuditCenterSummary.mockResolvedValue({
      todayEvents: 5,
      activeUsers: 2,
      financialChanges: 1,
      approvals: 1,
      criticalEvents: 0,
      topActors: [],
      topModules: [],
      riskEvents: [],
    });
  });

  it("renders audit timeline", async () => {
    render(
      <MemoryRouter>
        <AuditCenterPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Audit Center")).toBeInTheDocument();
      expect(screen.getByText("purchase_order_approved")).toBeInTheDocument();
    });
  });

  it("shows restricted state without permission", async () => {
    const { useAuthStore } = await import("@/stores/authStore");
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({ hasPermission: () => false }),
    );

    render(
      <MemoryRouter>
        <AuditCenterPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Restricted/)).toBeInTheDocument();
  });
});
