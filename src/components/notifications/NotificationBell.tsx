import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, AlertTriangle, Bell, CheckCircle2, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotificationStore } from "@/stores/notificationStore";
import { useOutletStore } from "@/stores/outletStore";
import { usePosRouteBackgroundDefer } from "@/hooks/usePosRouteBackgroundDefer";
import type { UserNotification, UserNotificationSeverity } from "@/lib/api-integration/notificationEndpoints";
import type { TFunction } from "i18next";

function severityIcon(severity: UserNotificationSeverity) {
  if (severity === "critical") return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
  if (severity === "warning") return <AlertTriangle className="h-3.5 w-3.5 text-warning" />;
  if (severity === "success") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
  return <Info className="h-3.5 w-3.5 text-muted-foreground" />;
}

export function formatNotificationTimeAgo(iso: string | null, t: TFunction): string {
  if (!iso) return "";
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return t("notifications.timeJustNow");
  if (minutes < 60) return t("notifications.timeMinutes", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("notifications.timeHours", { count: hours });
  return t("notifications.timeDays", { count: Math.floor(hours / 24) });
}

export function NotificationPreviewRow({
  item,
  onMarkRead,
}: {
  item: UserNotification;
  onMarkRead: (id: number) => void;
}) {
  const { t } = useTranslation("common");

  return (
    <DropdownMenuItem
      className="flex flex-col items-start gap-1 py-2.5 cursor-default focus:bg-muted"
      onSelect={(e) => e.preventDefault()}
    >
      <div className="flex items-start justify-between w-full gap-2">
        <div className="flex items-start gap-2 min-w-0">
          {severityIcon(item.severity)}
          <div className="min-w-0">
            <p className={`text-sm font-medium truncate ${item.isRead ? "text-muted-foreground" : "text-foreground"}`}>
              {item.title}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-2">{item.message}</p>
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0">{formatNotificationTimeAgo(item.createdAt, t)}</span>
      </div>
      <div className="flex items-center gap-2 pl-5">
        {!item.isRead ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => void onMarkRead(item.id)}
          >
            {t("notifications.markRead")}
          </Button>
        ) : (
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("notifications.read")}</span>
        )}
        {item.actionUrl ? (
          <Button type="button" variant="link" size="sm" className="h-7 px-0 text-xs" asChild>
            <Link to={item.actionUrl}>{t("common.open")}</Link>
          </Button>
        ) : null}
      </div>
    </DropdownMenuItem>
  );
}

export function NotificationBell() {
  const { t } = useTranslation("common");
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const preview = useNotificationStore((s) => s.preview);
  const loading = useNotificationStore((s) => s.loading);
  const refresh = useNotificationStore((s) => s.refresh);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const startPolling = useNotificationStore((s) => s.startPolling);
  const stopPolling = useNotificationStore((s) => s.stopPolling);
  const backgroundDeferReady = usePosRouteBackgroundDefer();

  useEffect(() => {
    if (!backgroundDeferReady) return;
    startPolling(activeOutletId, 30000);
    return () => stopPolling();
  }, [activeOutletId, backgroundDeferReady, startPolling, stopPolling]);

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) void refresh(activeOutletId);
      }}
    >
      <DropdownMenuTrigger asChild>
        <button type="button" className="relative p-2 rounded-lg hover:bg-muted transition-colors" aria-label={t("notifications.ariaLabel")}>
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadCount > 0 ? (
            <span className="absolute top-1 right-1 min-w-[1rem] h-4 px-1 rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>{t("notifications.title")}</span>
          {unreadCount > 0 ? <Badge variant="secondary">{t("notifications.unread", { count: unreadCount })}</Badge> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading && preview.length === 0 ? (
          <DropdownMenuItem disabled>{t("notifications.loading")}</DropdownMenuItem>
        ) : preview.length === 0 ? (
          <DropdownMenuItem disabled>{t("notifications.empty")}</DropdownMenuItem>
        ) : (
          preview.map((item) => (
            <NotificationPreviewRow
              key={item.id}
              item={item}
              onMarkRead={(id) => void markRead(id, activeOutletId)}
            />
          ))
        )}
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-2 py-1.5">
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => void markAllRead(activeOutletId)}
            >
              {t("notifications.markAllRead")}
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" variant="link" size="sm" className="text-xs" asChild>
            <Link to="/notifications">{t("notifications.viewAll")}</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
