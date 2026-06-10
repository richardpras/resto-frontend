// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mockListUserNotifications = vi.fn();
const mockMarkRead = vi.fn();
const mockMarkAllRead = vi.fn();

vi.mock("@/lib/api-integration/notificationEndpoints", () => ({
  listUserNotifications: (...args: unknown[]) => mockListUserNotifications(...args),
  markUserNotificationRead: (...args: unknown[]) => mockMarkRead(...args),
  markAllUserNotificationsRead: (...args: unknown[]) => mockMarkAllRead(...args),
}));

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: vi.fn((selector) => selector({ activeOutletId: 1 })),
}));

vi.mock("@/stores/notificationStore", () => ({
  useNotificationStore: vi.fn((selector) => selector({ refresh: vi.fn() })),
}));

import NotificationCenter from "@/pages/NotificationCenter";

describe("NotificationCenter failed job alerts", () => {
  beforeEach(() => {
    mockListUserNotifications.mockResolvedValue({
      data: [
        {
          id: 55,
          outletId: 1,
          userId: 1,
          severity: "critical",
          sourceModule: "system",
          sourceType: "failed_job_critical",
          sourceId: "1-RecoverStalePaymentsJob-critical",
          title: "Critical queue failures detected",
          message: "6 critical background jobs have failed. Oldest failure is 45 minutes old.",
          actionUrl: "/system/failed-jobs",
          readAt: null,
          isRead: false,
          metadata: { jobClass: "RecoverStalePaymentsJob", healthStatus: "critical" },
          createdAt: "2026-06-10T10:00:00.000Z",
          updatedAt: "2026-06-10T10:00:00.000Z",
        },
      ],
      meta: { currentPage: 1, lastPage: 1, perPage: 50, total: 1 },
    });
  });

  it("renders failed job notifications with dashboard deep link", async () => {
    render(
      <MemoryRouter>
        <NotificationCenter />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Critical queue failures detected")).toBeTruthy();
    });

    const openLink = screen.getByRole("link", { name: "Open" });
    expect(openLink.getAttribute("href")).toBe("/system/failed-jobs");
    expect(screen.getAllByText("Critical").length).toBeGreaterThan(0);
  });
});
