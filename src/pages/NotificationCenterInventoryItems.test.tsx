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

describe("NotificationCenter inventory items", () => {
  beforeEach(() => {
    mockListUserNotifications.mockResolvedValue({
      data: [
        {
          id: 30,
          outletId: 1,
          userId: 1,
          severity: "warning",
          sourceModule: "inventory",
          sourceType: "inventory_critical_stock",
          sourceId: "inventory-item-15",
          title: "Critical stock: Chicken Breast",
          message: "Chicken Breast stock is 2.50 (minimum 5.00).",
          actionUrl: "/inventory",
          readAt: null,
          isRead: false,
          metadata: { ingredientId: 15, domainSeverity: "warning" },
          createdAt: "2026-06-10T10:00:00.000Z",
          updatedAt: "2026-06-10T10:00:00.000Z",
        },
      ],
      meta: { currentPage: 1, lastPage: 1, perPage: 50, total: 1 },
    });
  });

  it("renders inventory notifications with open links", async () => {
    render(
      <MemoryRouter>
        <NotificationCenter />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Critical stock: Chicken Breast")).toBeTruthy();
    });

    const openLink = screen.getByRole("link", { name: "Open" });
    expect(openLink.getAttribute("href")).toBe("/inventory");
    expect(screen.getByText("Warning")).toBeTruthy();
  });
});
