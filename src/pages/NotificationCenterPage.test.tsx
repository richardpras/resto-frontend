// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import NotificationCenter from "@/pages/NotificationCenter";
import { ensureEnglishLocale } from "@/test/i18nTestSetup";

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: vi.fn((selector) => selector({ activeOutletId: 1 })),
}));

vi.mock("@/stores/notificationStore", () => ({
  useNotificationStore: vi.fn((selector) => selector({ refresh: vi.fn() })),
}));

vi.mock("@/lib/api-integration/notificationEndpoints", () => ({
  listUserNotifications: vi.fn(),
  markUserNotificationRead: vi.fn(),
  markAllUserNotificationsRead: vi.fn(),
}));

import { listUserNotifications } from "@/lib/api-integration/notificationEndpoints";

describe("NotificationCenter page", () => {
  beforeEach(async () => {
    await ensureEnglishLocale();
    vi.mocked(listUserNotifications).mockResolvedValue({
      data: [
        {
          id: 5,
          outletId: 1,
          userId: 1,
          severity: "warning",
          sourceModule: "monitoring",
          sourceType: "printer_queue_failures",
          sourceId: "1",
          title: "Printer queue failures",
          message: "1 failed",
          actionUrl: "/",
          readAt: null,
          isRead: false,
          metadata: {},
          createdAt: "2026-06-10T10:00:00.000Z",
          updatedAt: "2026-06-10T10:00:00.000Z",
        },
      ],
      meta: { currentPage: 1, lastPage: 1, perPage: 50, total: 1 },
    });
  });

  it("renders inbox rows from API", async () => {
    render(
      <MemoryRouter>
        <NotificationCenter />
      </MemoryRouter>,
    );

    expect(screen.getByText("Notification Center")).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText("Printer queue failures")).toBeTruthy();
    });

    expect(screen.getByText("monitoring")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mark all read" })).toBeTruthy();
  });
});
