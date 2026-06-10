import { create } from "zustand";
import {
  getUserNotificationUnreadCount,
  listUserNotifications,
  markAllUserNotificationsRead,
  markUserNotificationRead,
  type UserNotification,
} from "@/lib/api-integration/notificationEndpoints";
import { getApiAccessToken } from "@/lib/api-integration/client";

type NotificationStore = {
  unreadCount: number;
  preview: UserNotification[];
  loading: boolean;
  error: string | null;
  pollTimer: ReturnType<typeof setInterval> | null;
  fetchUnreadCount: (outletId?: number | null) => Promise<void>;
  fetchPreview: (outletId?: number | null) => Promise<void>;
  refresh: (outletId?: number | null) => Promise<void>;
  markRead: (notificationId: number, outletId?: number | null) => Promise<void>;
  markAllRead: (outletId?: number | null) => Promise<void>;
  startPolling: (outletId?: number | null, intervalMs?: number) => void;
  stopPolling: () => void;
  reset: () => void;
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  unreadCount: 0,
  preview: [],
  loading: false,
  error: null,
  pollTimer: null,

  fetchUnreadCount: async (outletId) => {
    if (!getApiAccessToken()) return;
    try {
      const count = await getUserNotificationUnreadCount(outletId);
      set({ unreadCount: count, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to load unread count" });
    }
  },

  fetchPreview: async (outletId) => {
    if (!getApiAccessToken()) return;
    set({ loading: true, error: null });
    try {
      const response = await listUserNotifications({ limit: 5, outletId: outletId ?? undefined });
      set({ preview: response.data, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load notifications",
      });
    }
  },

  refresh: async (outletId) => {
    await Promise.all([get().fetchUnreadCount(outletId), get().fetchPreview(outletId)]);
  },

  markRead: async (notificationId, outletId) => {
    await markUserNotificationRead(notificationId);
    await get().refresh(outletId);
  },

  markAllRead: async (outletId) => {
    await markAllUserNotificationsRead(outletId);
    await get().refresh(outletId);
  },

  startPolling: (outletId, intervalMs = 30000) => {
    get().stopPolling();
    void get().refresh(outletId);
    const timer = setInterval(() => {
      void get().fetchUnreadCount(outletId);
    }, intervalMs);
    set({ pollTimer: timer });
  },

  stopPolling: () => {
    const timer = get().pollTimer;
    if (timer) clearInterval(timer);
    set({ pollTimer: null });
  },

  reset: () => {
    get().stopPolling();
    set({ unreadCount: 0, preview: [], loading: false, error: null });
  },
}));
