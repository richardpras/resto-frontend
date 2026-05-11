import { useEffect } from "react";
import { CloudOff, Radio, WifiOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useOfflineSyncStore } from "@/stores/offlineSyncStore";
import { useOperationalDashboardStore } from "@/stores/operationalDashboardStore";

type Props = {
  outletId?: number | null;
  /** When false, skips auto terminal registration / replay (e.g. screen without outlet context). */
  enableReplay?: boolean;
};

export function ConnectivitySyncRibbon({ outletId, enableReplay = true }: Props) {
  const initConnectivityListeners = useOfflineSyncStore((s) => s.initConnectivityListeners);
  const isOnline = useOfflineSyncStore((s) => s.isOnline);
  const pendingQueueCount = useOfflineSyncStore((s) => s.pendingQueueCount);
  const syncPhase = useOfflineSyncStore((s) => s.syncPhase);
  const lastSyncError = useOfflineSyncStore((s) => s.lastSyncError);
  const lastConflict = useOfflineSyncStore((s) => s.lastBatchConflictCount);
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
    void ensureTerminalPresence(outletId);
    if (typeof navigator !== "undefined" && navigator.onLine) {
      void flushQueueForOutlet(outletId);
    }
  }, [enableReplay, outletId, refreshQueueCounts, ensureTerminalPresence, flushQueueForOutlet, isOnline]);

  const resilient = outletId !== null && outletId !== undefined && outletId >= 1;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-border/60 bg-muted/30 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
        {isOnline ? <Radio className="h-3.5 w-3.5 text-emerald-500" /> : <WifiOff className="h-3.5 w-3.5 text-amber-500" />}
        {isOnline ? "Online" : "Offline"}
      </span>
      <span className="opacity-70">Realtime: {realtimeTransport}</span>
      {resilient && (
        <>
          {pendingQueueCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200 px-2 py-0.5">
              <CloudOff className="h-3 w-3" />
              Queue {pendingQueueCount}
            </span>
          )}
          {syncPhase === "syncing" && (
            <span className="inline-flex items-center gap-1.5 text-primary" aria-busy>
              <Skeleton className="h-3 w-3 rounded-full shrink-0" />
              <Skeleton className="h-3 w-16 rounded-md" />
              <span className="sr-only">Syncing</span>
            </span>
          )}
          {lastConflict > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 text-orange-800 dark:text-orange-200 px-2 py-0.5">
              Conflicts {lastConflict}
            </span>
          )}
          {lastSyncError && <span className="text-destructive">Replay: {lastSyncError}</span>}
        </>
      )}
    </div>
  );
}
