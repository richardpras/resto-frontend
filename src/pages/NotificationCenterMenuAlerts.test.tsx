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

describe("NotificationCenter menu alerts", () => {
  beforeEach(() => {
    mockListUserNotifications.mockResolvedValue({
      data: [
        {
          id: 40,
          outletId: 1,
          userId: 1,
          severity: "warning",
          sourceModule: "menu_intelligence",
          sourceType: "food_cost_alert",
          sourceId: "food-cost-outlet-1",
          title: "Food cost exceeds threshold",
          message: "Average food cost 45.00% exceeds threshold 40.00%.",
          actionUrl: "/dashboard/menu?tab=food-cost",
          readAt: null,
          isRead: false,
          metadata: { alertType: "food_cost", domainSeverity: null },
          createdAt: "2026-06-10T10:00:00.000Z",
          updatedAt: "2026-06-10T10:00:00.000Z",
        },
      ],
      meta: { currentPage: 1, lastPage: 1, perPage: 50, total: 1 },
    });
  });

  it("renders menu intelligence notifications with open links", async () => {
    render(
      <MemoryRouter>
        <NotificationCenter />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Food cost exceeds threshold")).toBeTruthy();
    });

    const openLink = screen.getByRole("link", { name: "Open" });
    expect(openLink.getAttribute("href")).toBe("/dashboard/menu?tab=food-cost");
    expect(screen.getByText("Warning")).toBeTruthy();
  });
});
