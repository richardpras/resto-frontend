import { useState, useEffect, useRef } from "react";
import { ChefHat, Maximize2, Minimize2 } from "lucide-react";
import { KitchenTicketBoardSkeleton } from "@/components/skeletons/list/KitchenTicketBoardSkeleton";
import { SkeletonBusyRegion } from "@/components/skeletons/SkeletonBusyRegion";
import { KitchenWorkflowBoard } from "@/components/kitchen/KitchenWorkflowBoard";
import { KitchenConnectionStatus } from "@/components/kitchen/KitchenConnectionStatus";
import { KitchenWorkflowSummary } from "@/components/kitchen/KitchenWorkflowSummary";
import { KitchenDayMetricsCard } from "@/components/kitchen/KitchenDayMetricsCard";
import { toast } from "sonner";
import { useOutletStore } from "@/stores/outletStore";
import { PERMISSIONS, useAuthStore } from "@/stores/authStore";
import { boardActiveTicketCount } from "@/domain/kitchenWorkflow";
import type { KitchenBoardColumn } from "@/domain/kitchenWorkflow";
import type { KitchenTicketStatus as ApiKitchenTicketStatus } from "@/lib/api-integration/kitchenEndpoints";
import { useKitchenStore } from "@/stores/kitchenStore";
import { useKitchenTicketSounds } from "@/hooks/useKitchenTicketSounds";
import { useKitchenFullscreen } from "@/hooks/useKitchenFullscreen";
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

const KITCHEN_RECOVERY_PRESETS = ORDER_RECOVERY_PRESETS.map((p) =>
  p.targetStatus === "rejected" ? { ...p, hint: "Kitchen rejection" } : p,
);

export default function Kitchen() {
  const displayRootRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useKitchenFullscreen(displayRootRef);
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
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

  useKitchenTicketSounds(tickets, lastTicketsUpdateSource, canUseKitchen);

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1 || !canUseKitchen) {
      stopPolling();
      return;
    }
    void startPolling({ outletId: activeOutletId, perPage: 200 });
    return () => stopPolling();
  }, [activeOutletId, canUseKitchen, startPolling, stopPolling]);

  useEffect(() => {
    if (!error) return;
    toast.error(error);
  }, [error]);

  const boardTickets = tickets.filter(
    (ticket) => ticket.status === "queued" || ticket.status === "in_progress" || ticket.status === "ready",
  );

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
    <div ref={displayRootRef} className="p-4 md:p-6 max-w-[1600px] bg-background min-h-screen" data-testid="kitchen-display-root">
      {(!activeOutletId || activeOutletId < 1) && (
        <div className="mb-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-amber-900 dark:text-amber-100">
          Select an outlet in the header with a configured numeric id (<code className="text-xs">outlet_bridge</code>) to show this kitchen&apos;s tickets.
        </div>
      )}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ChefHat className="h-6 w-6" /> Kitchen Display
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {boardActiveTicketCount(boardTickets)} active ticket(s) on the line
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <KitchenConnectionStatus
            realtimeConnected={realtimeConnected}
            pollingActive={pollTimer !== null}
            consecutiveFetchFailures={consecutiveFetchFailures}
            hasBlockingError={error !== null}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="kitchen-fullscreen-toggle"
            onClick={() => void toggleFullscreen()}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4 mr-1.5" /> : <Maximize2 className="h-4 w-4 mr-1.5" />}
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </Button>
        </div>
      </div>

      <KitchenDayMetricsCard tickets={tickets} nowMs={nowMs} />
      <KitchenWorkflowSummary tickets={boardTickets} />

      <SkeletonBusyRegion busy={isLoading && boardTickets.length === 0} className="min-h-[240px]" label="Loading kitchen tickets">
        {isLoading && boardTickets.length === 0 ? (
          <KitchenTicketBoardSkeleton />
        ) : boardTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground rounded-2xl border border-border/50 bg-card">
            <ChefHat className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">No active orders</p>
            <p className="text-sm">Confirmed orders from POS and QR will appear here</p>
          </div>
        ) : (
          <KitchenWorkflowBoard
            tickets={boardTickets}
            nowMs={nowMs}
            isSubmitting={isSubmitting}
            recoverySubmitting={recoverySubmitting}
            canReportItemRecovery={canReportItemRecovery}
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
