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

describe("NotificationCenter approval items", () => {
  beforeEach(() => {
    mockListUserNotifications.mockResolvedValue({
      data: [
        {
          id: 20,
          outletId: 1,
          userId: 1,
          severity: "warning",
          sourceModule: "hr",
          sourceType: "leave_request_rejected",
          sourceId: "5",
          title: "Leave request rejected",
          message: "Your leave request was rejected.",
          actionUrl: "/hr/leave?id=5",
          readAt: null,
          isRead: false,
          metadata: { workflow: "approval" },
          createdAt: "2026-06-10T10:00:00.000Z",
          updatedAt: "2026-06-10T10:00:00.000Z",
        },
      ],
      meta: { currentPage: 1, lastPage: 1, perPage: 50, total: 1 },
    });
  });

  it("renders approval notifications with open links", async () => {
    render(
      <MemoryRouter>
        <NotificationCenter />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Leave request rejected")).toBeTruthy();
    });

    const openLink = screen.getByRole("link", { name: "Open" });
    expect(openLink.getAttribute("href")).toBe("/hr/leave?id=5");
    expect(screen.getByText("Warning")).toBeTruthy();
  });
});
