import { useState, useEffect, useRef, useMemo } from "react";
import { ChefHat } from "lucide-react";
import { KitchenTicketBoardSkeleton } from "@/components/skeletons/list/KitchenTicketBoardSkeleton";
import { SkeletonBusyRegion } from "@/components/skeletons/SkeletonBusyRegion";
import { KdsBoard } from "@/components/kitchen/KdsBoard";
import { KdsHeader } from "@/components/kitchen/KdsHeader";
import { KdsMetricsStrip } from "@/components/kitchen/KdsMetricsStrip";
import { toast } from "sonner";
import { useOutletStore } from "@/stores/outletStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { PERMISSIONS, useAuthStore } from "@/stores/authStore";
import type { KitchenBoardColumn } from "@/domain/kitchenWorkflow";
import type { KitchenTicketStatus as ApiKitchenTicketStatus } from "@/lib/api-integration/kitchenEndpoints";
import { useKitchenStore } from "@/stores/kitchenStore";
import { useKitchenTicketSounds } from "@/hooks/useKitchenTicketSounds";
import { useKitchenFullscreen } from "@/hooks/useKitchenFullscreen";
import { useKdsFocusMode } from "@/hooks/useKdsFocusMode";
import { useKdsStationFilter } from "@/hooks/useKdsStationFilter";
import { useKdsNewTicketHighlights } from "@/hooks/useKdsNewTicketHighlights";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ORDER_RECOVERY_PRESETS } from "@/domain/orderRecoveryPresets";
import { cn } from "@/lib/utils";

const KITCHEN_RECOVERY_PRESETS = ORDER_RECOVERY_PRESETS.map((p) =>
  p.targetStatus === "rejected" ? { ...p, hint: "Kitchen rejection" } : p,
);

export default function Kitchen() {
  const displayRootRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useKitchenFullscreen(displayRootRef);
  const { focusMode, setFocusMode } = useKdsFocusMode();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const outlets = useSettingsStore((s) => s.outlets);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canUseKitchen = hasPermission(PERMISSIONS.KITCHEN);
  const canReportItemRecovery = hasPermission("orders.recovery.request");
  const tickets = useKitchenStore((s) => s.tickets);
  const error = useKitchenStore((s) => s.error);
  const isLoading = useKitchenStore((s) => s.isLoading);
  const isSubmitting = useKitchenStore((s) => s.isSubmitting);
  const recoverySubmitting = useKitchenStore((s) => s.recoverySubmitting);
  const lastTicketsUpdateSource = useKitchenStore((s) => s.lastTicketsUpdateSource);
  const realtimeConnected = useKitchenStore((s) => s.realtimeConnected);
  const pollTimer = useKitchenStore((s) => s.pollTimer);
  const consecutiveFetchFailures = useKitchenStore((s) => s.consecutiveFetchFailures);
  const startPolling = useKitchenStore((s) => s.startPolling);
  const stopPolling = useKitchenStore((s) => s.stopPolling);
  const updateTicketStatus = useKitchenStore((s) => s.updateTicketStatus);
  const reportItemRecovery = useKitchenStore((s) => s.reportItemRecovery);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryCtx, setRecoveryCtx] = useState<{
    orderId: string;
    orderItemId: string;
    itemName: string;
  } | null>(null);
  const [recoveryMode, setRecoveryMode] = useState<"preset" | "custom">("preset");
  const [customReason, setCustomReason] = useState("");
  const outletName = useMemo(() => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1) return null;
    return outlets.find((o) => o.id === activeOutletId)?.name ?? null;
  }, [activeOutletId, outlets]);

  useKitchenTicketSounds(tickets, lastTicketsUpdateSource, canUseKitchen);

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const {
    availableStations,
    station,
    setStation,
    stationCodeForApi,
    showStationBadges,
    stationSelectorVisible,
    filteredTickets: stationFilteredTickets,
  } = useKdsStationFilter(
    useMemo(
      () =>
        tickets.filter(
          (ticket) =>
            ticket.status === "queued" || ticket.status === "in_progress" || ticket.status === "ready",
        ),
      [tickets],
    ),
  );

  useEffect(() => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1 || !canUseKitchen) {
      stopPolling();
      return;
    }
    void startPolling({
      outletId: activeOutletId,
      perPage: 200,
      ...(stationCodeForApi ? { stationCode: stationCodeForApi } : {}),
    });
    return () => stopPolling();
  }, [activeOutletId, canUseKitchen, stationCodeForApi, startPolling, stopPolling]);

  useEffect(() => {
    if (!error) return;
    toast.error(error);
  }, [error]);

  const boardTickets = stationFilteredTickets;

  const newTicketIds = useKdsNewTicketHighlights(boardTickets, lastTicketsUpdateSource);

  const onUpdateTicketStatus = async (id: string, status: ApiKitchenTicketStatus) => {
    try {
      await updateTicketStatus(id, status);
    } catch {
      // Error toast handled by store error observer.
    }
  };

  const onAdvance = (ticketId: string, column: KitchenBoardColumn) => {
    void onUpdateTicketStatus(ticketId, column.nextStatus);
  };

  const onCancelTicket = async (id: string) => {
    await onUpdateTicketStatus(id, "cancelled");
  };

  const openRecovery = (orderId: string, orderItemId: string, itemName: string) => {
    setRecoveryCtx({ orderId, orderItemId, itemName });
    setRecoveryMode("preset");
    setCustomReason("");
    setRecoveryOpen(true);
  };

  const submitRecoveryPreset = async (targetStatus: string, hint?: string) => {
    if (!recoveryCtx) return;
    try {
      await reportItemRecovery(recoveryCtx.orderId, recoveryCtx.orderItemId, targetStatus, hint ?? null);
      toast.success("Recovery recorded");
      setRecoveryOpen(false);
      setRecoveryCtx(null);
    } catch {
      // store surfaces error toast via effect
    }
  };

  const submitRecoveryCustom = async () => {
    if (!recoveryCtx) return;
    const trimmed = customReason.trim();
    if (!trimmed) {
      toast.error("Enter a reason");
      return;
    }
    try {
      await reportItemRecovery(recoveryCtx.orderId, recoveryCtx.orderItemId, "custom_reason", trimmed);
      toast.success("Recovery recorded");
      setRecoveryOpen(false);
      setRecoveryCtx(null);
    } catch {
      // error toast via store
    }
  };

  if (!canUseKitchen) {
    return (
      <div className="p-4 md:p-6 text-sm text-muted-foreground">
        You do not have permission to access Kitchen Display.
      </div>
    );
  }

  return (
    <div
      ref={displayRootRef}
      className={cn(
        "kds-display flex flex-col p-3 sm:p-4",
        isFullscreen
          ? "fixed inset-0 z-[300] h-dvh max-h-dvh w-screen overflow-hidden"
          : "min-h-screen",
      )}
      data-testid="kitchen-display-root"
      data-kds-focus-mode={focusMode}
      data-kds-fullscreen={isFullscreen ? "true" : "false"}
    >
      {(!activeOutletId || activeOutletId < 1) && (
        <div className="mb-3 p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-sm text-amber-100">
          Select an outlet in the header to show this kitchen&apos;s tickets.
        </div>
      )}

      <KdsHeader
        outletName={outletName}
        nowMs={nowMs}
        isFullscreen={isFullscreen}
        focusMode={focusMode}
        onFocusModeChange={setFocusMode}
        onToggleFullscreen={() => void toggleFullscreen()}
        realtimeConnected={realtimeConnected}
        pollingActive={pollTimer !== null}
        consecutiveFetchFailures={consecutiveFetchFailures}
        hasBlockingError={error !== null}
        stationSelectorVisible={stationSelectorVisible}
        availableStations={availableStations}
        station={station}
        onStationChange={setStation}
      />

      <KdsMetricsStrip tickets={tickets} nowMs={nowMs} />

      <SkeletonBusyRegion
        busy={isLoading && boardTickets.length === 0}
        className={cn("kds-board-region flex-1 min-h-0 flex flex-col", isFullscreen && "overflow-hidden")}
        label="Loading kitchen tickets"
      >
        {isLoading && boardTickets.length === 0 ? (
          <KitchenTicketBoardSkeleton />
        ) : boardTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-24 text-kds-muted-fg rounded-2xl border border-kds-card-border bg-kds-card/40">
            <ChefHat className="h-20 w-20 mb-4 opacity-25" />
            <p className="text-xl font-semibold text-kds-fg">No active orders</p>
            <p className="text-sm mt-1">Confirmed orders from POS and QR will appear here</p>
          </div>
        ) : (
          <KdsBoard
            tickets={boardTickets}
            nowMs={nowMs}
            focusMode={focusMode}
            isFullscreen={isFullscreen}
            isSubmitting={isSubmitting}
            recoverySubmitting={recoverySubmitting}
            canReportItemRecovery={canReportItemRecovery}
            newTicketIds={newTicketIds}
            showStationBadges={showStationBadges}
            onAdvance={onAdvance}
            onCancel={onCancelTicket}
            onItemIssue={openRecovery}
          />
        )}
      </SkeletonBusyRegion>

      <Dialog open={recoveryOpen} onOpenChange={setRecoveryOpen}>
        <DialogContent className="max-w-md" data-testid="kitchen-recovery-dialog">
          <DialogHeader>
            <DialogTitle>Item issue</DialogTitle>
            {recoveryCtx ? (
              <p className="text-xs text-muted-foreground pt-1">
                Order #{recoveryCtx.orderId} · {recoveryCtx.itemName}
              </p>
            ) : null}
          </DialogHeader>
          {recoveryMode === "preset" ? (
            <div className="grid gap-2">
              {KITCHEN_RECOVERY_PRESETS.map((p) => (
                <Button
                  key={p.targetStatus + p.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="justify-start h-auto py-2 text-left"
                  disabled={recoverySubmitting}
                  onClick={() => void submitRecoveryPreset(p.targetStatus, p.hint)}
                >
                  {p.label}
                </Button>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={recoverySubmitting}
                onClick={() => setRecoveryMode("custom")}
              >
                Custom reason…
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Describe the issue"
                rows={3}
                className="text-sm"
              />
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" size="sm" onClick={() => setRecoveryMode("preset")}>
                  Back
                </Button>
                <Button type="button" size="sm" disabled={recoverySubmitting} onClick={() => void submitRecoveryCustom()}>
                  Submit
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
