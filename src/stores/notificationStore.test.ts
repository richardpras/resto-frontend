import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNotificationStore } from "./notificationStore";

const mockGetUnreadCount = vi.fn().mockResolvedValue(2);
const mockListNotifications = vi.fn().mockResolvedValue({ data: [] });

vi.mock("@/lib/api-integration/notificationEndpoints", () => ({
  getUserNotificationUnreadCount: (...args: unknown[]) => mockGetUnreadCount(...args),
  listUserNotifications: (...args: unknown[]) => mockListNotifications(...args),
  markUserNotificationRead: vi.fn(),
  markAllUserNotificationsRead: vi.fn(),
}));

vi.mock("@/lib/api-integration/client", () => ({
  getApiAccessToken: vi.fn(() => "token"),
}));

describe("notificationStore polling", () => {
  beforeEach(() => {
    mockGetUnreadCount.mockClear();
    mockListNotifications.mockClear();
    useNotificationStore.getState().reset();
  });

  it("startPolling loads unread count only, not preview list", async () => {
    useNotificationStore.getState().startPolling(3, 30_000);
    await vi.waitFor(() => {
      expect(mockGetUnreadCount).toHaveBeenCalledTimes(1);
    });
    expect(mockListNotifications).not.toHaveBeenCalled();
  });
});
