import { apiRequest as request } from "./client";

export type UserNotificationSeverity = "info" | "success" | "warning" | "critical";

export type UserNotificationSourceModule =
  | "accounting"
  | "payments"
  | "monitoring"
  | "inventory"
  | "procurement"
  | "payroll"
  | "hr"
  | "crm"
  | "system"
  | "menu_intelligence";

export type UserNotification = {
  id: number;
  outletId: number;
  userId: number;
  severity: UserNotificationSeverity;
  sourceModule: UserNotificationSourceModule;
  sourceType: string;
  sourceId: string;
  title: string;
  message: string;
  actionUrl: string | null;
  readAt: string | null;
  isRead: boolean;
  metadata: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ListNotificationsParams = {
  unread?: boolean;
  severity?: UserNotificationSeverity;
  source?: UserNotificationSourceModule;
  outletId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type ListNotificationsResponse = {
  data: UserNotification[];
  meta: {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
  };
};

function buildQuery(params: ListNotificationsParams): string {
  const search = new URLSearchParams();
  if (params.unread) search.set("unread", "true");
  if (params.severity) search.set("severity", params.severity);
  if (params.source) search.set("source", params.source);
  if (typeof params.outletId === "number" && params.outletId >= 1) {
    search.set("outletId", String(params.outletId));
  }
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (typeof params.page === "number" && params.page >= 1) {
    search.set("page", String(params.page));
  }
  if (typeof params.limit === "number" && params.limit >= 1) {
    search.set("limit", String(params.limit));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function listUserNotifications(
  params: ListNotificationsParams = {},
): Promise<ListNotificationsResponse> {
  const response = await request<ListNotificationsResponse>(`/notifications${buildQuery(params)}`);
  return {
    data: response.data ?? [],
    meta: response.meta ?? { currentPage: 1, lastPage: 1, perPage: 20, total: 0 },
  };
}

export async function getUserNotificationUnreadCount(outletId?: number | null): Promise<number> {
  const query =
    typeof outletId === "number" && outletId >= 1 ? `?outletId=${outletId}` : "";
  const response = await request<{ count: number }>(`/notifications/unread-count${query}`);
  return typeof response.count === "number" ? response.count : 0;
}

export async function markUserNotificationRead(notificationId: number): Promise<UserNotification> {
  const response = await request<{ data: UserNotification }>(
    `/notifications/${notificationId}/read`,
    { method: "PATCH" },
  );
  return response.data;
}

export async function markAllUserNotificationsRead(outletId?: number | null): Promise<number> {
  const body =
    typeof outletId === "number" && outletId >= 1 ? { outletId } : undefined;
  const response = await request<{ count: number }>("/notifications/read-all", {
    method: "PATCH",
    body,
  });
  return typeof response.count === "number" ? response.count : 0;
}
