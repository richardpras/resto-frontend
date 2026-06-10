// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { NotificationBell } from "@/components/notifications/NotificationBell";

vi.mock("@/stores/notificationStore", () => ({
  useNotificationStore: vi.fn(),
}));

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: vi.fn((selector) => selector({ activeOutletId: 1 })),
}));

import { useNotificationStore } from "@/stores/notificationStore";

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.mocked(useNotificationStore).mockImplementation((selector) =>
      selector({
        unreadCount: 3,
        preview: [
          {
            id: 1,
            outletId: 1,
            userId: 1,
            severity: "critical",
            sourceModule: "accounting",
            sourceType: "posting_failure",
            sourceId: "10",
            title: "Posting failed",
            message: "Unbalanced journal",
            actionUrl: "/accounting?tab=health",
            readAt: null,
            isRead: false,
            metadata: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        loading: false,
        error: null,
        pollTimer: null,
        fetchUnreadCount: vi.fn(),
        fetchPreview: vi.fn(),
        refresh: vi.fn(),
        markRead: vi.fn(),
        markAllRead: vi.fn(),
        startPolling: vi.fn(),
        stopPolling: vi.fn(),
        reset: vi.fn(),
      } as ReturnType<typeof useNotificationStore.getState>),
    );
  });

  it("renders unread badge count from store", () => {
    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Notifications")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });
});
