import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { listQueuedOperationsForOutlet, type QueuedOfflineOperation } from "@/lib/offline/offlineOperationQueue";
import { describeQueuedOperation } from "@/mobile/offline/describeQueuedOperation";
import { useOfflineSyncStore } from "@/stores/offlineSyncStore";
import { useOutletStore } from "@/stores/outletStore";
import { cn } from "@/lib/utils";

function formatWhen(iso: string | null, locale: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(locale.startsWith("id") ? "id-ID" : "en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/**
 * Header connectivity indicator. Shows a badge when offline ops are queued;
 * tapping the badge opens the pending transaction list.
 */
export function OfflinePendingQueueButton({
  isOnline,
  connectivityTitle,
}: {
  isOnline: boolean;
  connectivityTitle: string;
}) {
  const { t, i18n } = useTranslation("ops");
  const { t: tCommon } = useTranslation("common");
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const pendingQueueCount = useOfflineSyncStore((s) => s.pendingQueueCount);
  const syncPhase = useOfflineSyncStore((s) => s.syncPhase);
  const isStoreOnline = useOfflineSyncStore((s) => s.isOnline);
  const refreshQueueCounts = useOfflineSyncStore((s) => s.refreshQueueCounts);
  const flushQueueForOutlet = useOfflineSyncStore((s) => s.flushQueueForOutlet);
  const ensureTerminalPresence = useOfflineSyncStore((s) => s.ensureTerminalPresence);
  const initConnectivityListeners = useOfflineSyncStore((s) => s.initConnectivityListeners);

  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<QueuedOfflineOperation[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    initConnectivityListeners();
  }, [initConnectivityListeners]);

  useEffect(() => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1) return;
    void refreshQueueCounts(activeOutletId);
    const timer = setInterval(() => {
      void refreshQueueCounts(activeOutletId);
    }, 15_000);
    return () => clearInterval(timer);
  }, [activeOutletId, refreshQueueCounts]);

  // Keep terminal registration + queue flush alive app-wide (header is always mounted).
  useEffect(() => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1) return;
    void ensureTerminalPresence(activeOutletId);
    if (typeof navigator !== "undefined" && isStoreOnline) {
      void flushQueueForOutlet(activeOutletId);
    }
  }, [activeOutletId, ensureTerminalPresence, flushQueueForOutlet, isStoreOnline]);

  const loadRows = useCallback(async () => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1) {
      setRows([]);
      return;
    }
    setLoadingList(true);
    try {
      const next = await listQueuedOperationsForOutlet(activeOutletId);
      setRows(next);
      await refreshQueueCounts(activeOutletId);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("mobile.queueLoadFailed", { defaultValue: "Could not load offline queue." }),
      );
    } finally {
      setLoadingList(false);
    }
  }, [activeOutletId, refreshQueueCounts, t]);

  useEffect(() => {
    if (!open) return;
    void loadRows();
  }, [open, loadRows]);

  const handleSyncNow = async () => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1) return;
    try {
      await flushQueueForOutlet(activeOutletId);
      await loadRows();
      toast.success(t("mobile.syncStarted", { defaultValue: "Syncing offline queue…" }));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("mobile.syncFailed", { defaultValue: "Sync failed." }),
      );
    }
  };

  const showBadge = pendingQueueCount > 0;

  return (
    <>
      <button
        type="button"
        className={cn(
          "relative flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-muted",
          isOnline ? "text-success" : "text-warning animate-pulse-soft",
        )}
        title={
          showBadge
            ? t("mobile.pendingOfflineAria", {
                count: pendingQueueCount,
                defaultValue: `${pendingQueueCount} offline transaction(s) waiting to sync`,
              })
            : connectivityTitle
        }
        aria-label={
          showBadge
            ? t("mobile.pendingOfflineAria", {
                count: pendingQueueCount,
                defaultValue: `${pendingQueueCount} offline transaction(s) waiting to sync`,
              })
            : connectivityTitle
        }
        onClick={() => {
          if (showBadge) setOpen(true);
        }}
      >
        {isOnline ? <Wifi className="h-4 w-4" aria-hidden /> : <WifiOff className="h-4 w-4" aria-hidden />}
        <span className="hidden md:inline ml-1.5 text-xs font-medium">{connectivityTitle}</span>
        {showBadge ? (
          <Badge
            variant="destructive"
            className="absolute -right-0.5 -top-0.5 h-5 min-w-5 px-1 text-[10px] pointer-events-none"
            data-testid="offline-pending-badge"
          >
            {pendingQueueCount > 99 ? "99+" : pendingQueueCount}
          </Badge>
        ) : null}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {t("mobile.pendingOfflineTitle", { defaultValue: "Offline transactions" })}
            </SheetTitle>
            <SheetDescription>
              {t("mobile.pendingOfflineBody", {
                defaultValue:
                  "These transactions are saved on this device and will sync when the connection is available.",
              })}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void loadRows()} disabled={loadingList}>
              {tCommon("actions.refresh", { defaultValue: "Refresh" })}
            </Button>
            {isOnline && pendingQueueCount > 0 ? (
              <Button type="button" size="sm" onClick={() => void handleSyncNow()} disabled={syncPhase === "syncing"}>
                <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", syncPhase === "syncing" && "animate-spin")} />
                {t("mobile.syncNow", { defaultValue: "Sync now" })}
              </Button>
            ) : null}
          </div>

          <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
            {loadingList ? (
              <p className="text-sm text-muted-foreground">
                {tCommon("status.loading", { defaultValue: "Loading…" })}
              </p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("mobile.pendingOfflineEmpty", { defaultValue: "No pending offline transactions." })}
              </p>
            ) : (
              rows.map((row) => {
                const summary = describeQueuedOperation(row);
                return (
                  <div
                    key={row.id}
                    className="rounded-xl border border-border bg-card px-3 py-3"
                    data-testid="offline-pending-row"
                  >
                    <p className="text-sm font-semibold text-foreground">
                      {t(summary.titleKey, { defaultValue: summary.titleDefault })}
                    </p>
                    <p className="mt-0.5 break-all text-xs text-muted-foreground">{summary.detail}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground/80">
                      {formatWhen(summary.occurredAt, i18n.language)}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
