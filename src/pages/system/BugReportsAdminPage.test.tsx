// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockList = vi.fn();
const mockGet = vi.fn();

vi.mock("@/lib/api-integration/bugReportEndpoints", () => ({
  listBugReports: (...args: unknown[]) => mockList(...args),
  getBugReport: (...args: unknown[]) => mockGet(...args),
  updateBugReport: vi.fn(),
  addBugReportComment: vi.fn(),
  fetchBugReportAttachmentBlob: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: (s: { hasPermission: (p: string) => boolean }) => unknown) =>
    selector({ hasPermission: (p: string) => p === "settings.manage" }),
}));

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: (selector: (s: { activeOutletId: number }) => unknown) =>
    selector({ activeOutletId: 1 }),
}));

import BugReportsPage from "./BugReportsPage";

describe("BugReportsAdminPage", () => {
  beforeEach(() => {
    mockList.mockResolvedValue({
      data: [
        {
          id: 7,
          outletId: 1,
          reporterUserId: 2,
          reporterName: "Alice",
          title: "Broken filter",
          message: "Inventory filter fails",
          severity: "high",
          status: "open",
          currentRoute: "/inventory",
          browser: "Chrome",
          userAgent: null,
          viewport: "1280x800",
          appVersion: "1.0.0",
          diagnosticsJson: null,
          assignedToUserId: null,
          assigneeName: null,
          resolvedAt: null,
          createdAt: "2026-06-10T10:00:00.000Z",
          updatedAt: "2026-06-10T10:00:00.000Z",
        },
      ],
      meta: { currentPage: 1, lastPage: 1, perPage: 50, total: 1 },
    });
    mockGet.mockResolvedValue({
      id: 7,
      title: "Broken filter",
      message: "Inventory filter fails",
      severity: "high",
      status: "open",
      comments: [],
      attachments: [],
    });
  });

  it("renders bug report list for admin", async () => {
    render(
      <MemoryRouter>
        <BugReportsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Broken filter")).toBeInTheDocument();
    });
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });
});
