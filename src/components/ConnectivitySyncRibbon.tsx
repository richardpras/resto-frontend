import { useEffect } from "react";
import { CloudOff, Radio, RefreshCw, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useOfflineSyncStore } from "@/stores/offlineSyncStore";
import { useOperationalDashboardStore } from "@/stores/operationalDashboardStore";

type Props = {
  outletId?: number | null;
  /** When false, skips auto terminal registration / replay (e.g. screen without outlet context). */
  enableReplay?: boolean;
  /** When false, defers terminal register/sync until POS critical data is ready. */
  terminalRegistrationReady?: boolean;
  showNativeControls?: boolean;
  onManualSync?: () => void;
};

export function ConnectivitySyncRibbon({
  outletId,
  enableReplay = true,
  terminalRegistrationReady = true,
  showNativeControls = false,
  onManualSync,
}: Props) {
  const { t } = useTranslation("ops");
  const initConnectivityListeners = useOfflineSyncStore((s) => s.initConnectivityListeners);
  const isOnline = useOfflineSyncStore((s) => s.isOnline);
  const apiUnreachable = useOfflineSyncStore((s) => s.apiUnreachable);
  const pendingQueueCount = useOfflineSyncStore((s) => s.pendingQueueCount);
  const syncPhase = useOfflineSyncStore((s) => s.syncPhase);
  const lastSyncError = useOfflineSyncStore((s) => s.lastSyncError);
  const lastConflict = useOfflineSyncStore((s) => s.lastBatchConflictCount);
  const lastRejectedStale = useOfflineSyncStore((s) => s.lastRejectedStaleCount);
  const refreshQueueCounts = useOfflineSyncStore((s) => s.refreshQueueCounts);
  const ensureTerminalPresence = useOfflineSyncStore((s) => s.ensureTerminalPresence);
  const flushQueueForOutlet = useOfflineSyncStore((s) => s.flushQueueForOutlet);
  const realtimeTransport = useOperationalDashboardStore((s) => s.realtimeTransport);

  useEffect(() => {
    initConnectivityListeners();
  }, [initConnectivityListeners]);

  useEffect(() => {
    if (!enableReplay || !outletId || outletId < 1) return;
    void refreshQueueCounts(outletId);
  }, [enableReplay, outletId, refreshQueueCounts]);

  useEffect(() => {
    if (!enableReplay || !terminalRegistrationReady || !outletId || outletId < 1) return;
    void ensureTerminalPresence(outletId);
    if (typeof navigator !== "undefined" && isOnline) {
      void flushQueueForOutlet(outletId);
    }
  }, [
    enableReplay,
    terminalRegistrationReady,
    outletId,
    ensureTerminalPresence,
    flushQueueForOutlet,
    isOnline,
  ]);

  const resilient = outletId !== null && outletId !== undefined && outletId >= 1;

  return (
    <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 border-b border-border/60 bg-muted/30 text-xs text-muted-foreground overflow-x-auto scrollbar-none">
      <span className="inline-flex items-center gap-1 font-medium text-foreground/80 shrink-0">
        {isOnline ? <Radio className="h-3.5 w-3.5 text-emerald-500" /> : <WifiOff className="h-3.5 w-3.5 text-amber-500" />}
        <span className="max-w-[7.5rem] sm:max-w-none truncate">
          {isOnline
            ? t("mobile.online", { defaultValue: "Online" })
            : apiUnreachable
              ? t("mobile.apiUnreachable", { defaultValue: "API unreachable" })
              : t("mobile.offline", { defaultValue: "Offline" })}
        </span>
      </span>
      <span className="opacity-70 shrink-0 hidden sm:inline">Realtime: {realtimeTransport}</span>
      {resilient && (
        <>
          {pendingQueueCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200 px-2 py-0.5 shrink-0">
              <CloudOff className="h-3 w-3" />
              <span className="sm:hidden">{pendingQueueCount}</span>
              <span className="hidden sm:inline">
                {t("mobile.queue", { defaultValue: "Queue" })} {pendingQueueCount}
              </span>
            </span>
          )}
          {syncPhase === "syncing" && (
            <span className="inline-flex items-center gap-1.5 text-primary shrink-0" aria-busy>
              <Skeleton className="h-3 w-3 rounded-full shrink-0" />
              <Skeleton className="h-3 w-16 rounded-md hidden sm:block" />
              <span className="sr-only">Syncing</span>
            </span>
          )}
          {lastConflict > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 text-orange-800 dark:text-orange-200 px-2 py-0.5 shrink-0">
              {t("mobile.conflicts", { defaultValue: "Conflicts" })} {lastConflict}
            </span>
          )}
          {lastRejectedStale > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 text-red-800 dark:text-red-200 px-2 py-0.5 shrink-0">
              {t("mobile.staleOps", { defaultValue: "Stale" })} {lastRejectedStale}
            </span>
          )}
          {lastSyncError && (
            <span className="text-destructive truncate max-w-[10rem] sm:max-w-xs shrink-0" title={lastSyncError}>
              Replay: {lastSyncError}
            </span>
          )}
          {showNativeControls && onManualSync && isOnline && pendingQueueCount > 0 && (
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs shrink-0 ml-auto" onClick={onManualSync}>
              <RefreshCw className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline">{t("mobile.syncNow", { defaultValue: "Sync now" })}</span>
            </Button>
          )}
        </>
      )}
    </div>
  );
}
