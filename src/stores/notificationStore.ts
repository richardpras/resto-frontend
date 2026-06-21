import { create } from "zustand";
import {
  getUserNotificationUnreadCount,
  listUserNotifications,
  markAllUserNotificationsRead,
  markUserNotificationRead,
  type UserNotification,
} from "@/lib/api-integration/notificationEndpoints";
import { getApiAccessToken } from "@/lib/api-integration/client";
import { createVisibilityAwareInterval } from "@/lib/pollingVisibility";

type NotificationStore = {
  unreadCount: number;
  preview: UserNotification[];
  loading: boolean;
  error: string | null;
  pollTimer: ReturnType<typeof setInterval> | null;
  pollingVisibilityCleanup: (() => void) | null;
  inFlightUnreadCount: Promise<void> | null;
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
  pollingVisibilityCleanup: null,
  inFlightUnreadCount: null,

  fetchUnreadCount: async (outletId) => {
    if (!getApiAccessToken()) return;
    if (get().inFlightUnreadCount) {
      return get().inFlightUnreadCount;
    }

    const job = (async () => {
      try {
        const count = await getUserNotificationUnreadCount(outletId);
        set({ unreadCount: count, error: null });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : "Failed to load unread count" });
      }
    })();

    set({ inFlightUnreadCount: job });
    try {
      await job;
    } finally {
      if (get().inFlightUnreadCount === job) {
        set({ inFlightUnreadCount: null });
      }
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
    void get().fetchUnreadCount(outletId);
    const visibilityInterval = createVisibilityAwareInterval(() => {
      void get().fetchUnreadCount(outletId);
    }, intervalMs);
    set({ pollTimer: null, pollingVisibilityCleanup: visibilityInterval.clear });
  },

  stopPolling: () => {
    const state = get();
    if (state.pollingVisibilityCleanup) {
      state.pollingVisibilityCleanup();
    }
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
    }
    set({ pollTimer: null, pollingVisibilityCleanup: null });
  },

  reset: () => {
    get().stopPolling();
    set({ unreadCount: 0, preview: [], loading: false, error: null, inFlightUnreadCount: null });
  },
}));
