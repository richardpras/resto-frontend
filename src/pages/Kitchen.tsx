import { useState, useEffect } from "react";
import { Clock, Check, ChefHat, AlertTriangle, XCircle, MoreVertical } from "lucide-react";
import { motion } from "framer-motion";
import { KitchenTicketBoardSkeleton } from "@/components/skeletons/list/KitchenTicketBoardSkeleton";
import { SkeletonBusyRegion } from "@/components/skeletons/SkeletonBusyRegion";
import { toast } from "sonner";
import { useOutletStore } from "@/stores/outletStore";
import { PERMISSIONS, useAuthStore } from "@/stores/authStore";
import type { KitchenTicketStatus } from "@/domain/kitchenAdapters";
import type { KitchenTicketStatus as ApiKitchenTicketStatus } from "@/lib/api-integration/kitchenEndpoints";
import { useKitchenStore } from "@/stores/kitchenStore";
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

function elapsed(date: Date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const statusColors: Record<KitchenTicketStatus, string> = {
  queued: "bg-warning/10 text-warning border-warning/20",
  in_progress: "bg-info/10 text-info border-info/20",
  ready: "bg-success/10 text-success border-success/20",
  served: "bg-muted text-muted-foreground border-border/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};
const statusLabels: Record<KitchenTicketStatus, string> = {
  queued: "New",
  in_progress: "Cooking",
  ready: "Ready",
  served: "Served",
  cancelled: "Cancelled",
};

const KITCHEN_RECOVERY_PRESETS = ORDER_RECOVERY_PRESETS.map((p) =>
  p.targetStatus === "rejected" ? { ...p, hint: "Kitchen rejection" } : p,
);

export default function Kitchen() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canUseKitchen = hasPermission(PERMISSIONS.KITCHEN);
  const canReportItemRecovery = hasPermission("orders.recovery.request");
  const tickets = useKitchenStore((s) => s.tickets);
  const error = useKitchenStore((s) => s.error);
  const isLoading = useKitchenStore((s) => s.isLoading);
  const isSubmitting = useKitchenStore((s) => s.isSubmitting);
  const recoverySubmitting = useKitchenStore((s) => s.recoverySubmitting);
  const startPolling = useKitchenStore((s) => s.startPolling);
  const stopPolling = useKitchenStore((s) => s.stopPolling);
  const updateTicketStatus = useKitchenStore((s) => s.updateTicketStatus);
  const reportItemRecovery = useKitchenStore((s) => s.reportItemRecovery);
  const [, setTick] = useState(0);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryCtx, setRecoveryCtx] = useState<{
    orderId: string;
    orderItemId: string;
    itemName: string;
  } | null>(null);
  const [recoveryMode, setRecoveryMode] = useState<"preset" | "custom">("preset");
  const [customReason, setCustomReason] = useState("");

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
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

  const onUpdateTicketStatus = async (id: string, status: ApiKitchenTicketStatus) => {
    try {
      await updateTicketStatus(id, status);
    } catch {
      // Error toast handled by store error observer.
    }
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

  // Only show queued/in-progress/ready tickets
  const kitchenOrders = tickets.filter((ticket) =>
    ticket.status === "queued" || ticket.status === "in_progress" || ticket.status === "ready"
  );

  const nextStatus = (s: KitchenTicketStatus): ApiKitchenTicketStatus | null => {
    if (s === "queued") return "in_progress";
    if (s === "in_progress") return "ready";
    if (s === "ready") return "served";
    return null;
  };

  if (!canUseKitchen) {
    return (
      <div className="p-4 md:p-6 text-sm text-muted-foreground">
        You do not have permission to access Kitchen Display.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {(!activeOutletId || activeOutletId < 1) && (
        <div className="mb-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-amber-900 dark:text-amber-100">
          Select an outlet in the header with a configured numeric id (<code className="text-xs">outlet_bridge</code>) to show this kitchen&apos;s tickets.
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ChefHat className="h-6 w-6" /> Kitchen Display
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {kitchenOrders.filter((o) => o.status !== "ready").length} active orders
          </p>
        </div>
        <div className="flex gap-2">
          {(["queued", "in_progress", "ready"] as KitchenTicketStatus[]).map((s) => (
            <span key={s} className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${statusColors[s]}`}>
              {statusLabels[s]}: {kitchenOrders.filter((o) => o.status === s).length}
            </span>
          ))}
        </div>
      </div>

      <SkeletonBusyRegion busy={isLoading && kitchenOrders.length === 0} className="min-h-[240px]" label="Loading kitchen tickets">
        {isLoading && kitchenOrders.length === 0 ? (
          <KitchenTicketBoardSkeleton columns={8} />
        ) : kitchenOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
          <ChefHat className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">No active orders</p>
          <p className="text-sm">Confirmed orders from POS and QR will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {kitchenOrders
            .sort((a, b) => {
              const order: Record<string, number> = { queued: 0, in_progress: 1, ready: 2 };
              return (order[a.status] ?? 9) - (order[b.status] ?? 9);
            })
            .map((ticket) => {
              const next = nextStatus(ticket.status);
              const refDate = ticket.queuedAt || ticket.createdAt;
              const mins = Math.floor((Date.now() - new Date(refDate).getTime()) / 60000);
              const isLate = mins > 10 && ticket.status !== "ready";

              return (
                <motion.div key={ticket.id} layout
                  className={`bg-card rounded-2xl border pos-shadow-md overflow-hidden ${isLate ? "border-destructive/30" : "border-border/50"}`}>
                  <div className={`px-4 py-3 flex items-center justify-between border-b ${isLate ? "bg-destructive/5" : "bg-muted/30"}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{ticket.ticketNo}</span>
                      {isLate && <AlertTriangle className="h-4 w-4 text-destructive" />}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[ticket.status] || ""}`}>
                      {statusLabels[ticket.status] || ticket.status}
                    </span>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-muted-foreground">Order #{ticket.orderId}</span>
                      <span className={`flex items-center gap-1 text-xs font-mono font-medium ${isLate ? "text-destructive" : "text-muted-foreground"}`}>
                        <Clock className="h-3 w-3" />
                        {elapsed(new Date(refDate))}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {ticket.items.map((item) => (
                        <div key={item.id} className="flex items-start gap-2 group/row">
                          <span className="text-xs font-bold text-primary bg-primary/10 rounded-md h-5 w-5 flex items-center justify-center shrink-0">{item.qty}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <p className="text-sm font-medium text-foreground">{item.name}</p>
                              {canReportItemRecovery ? (
                                <button
                                  type="button"
                                  aria-label="Item issue"
                                  disabled={recoverySubmitting || isSubmitting}
                                  className="shrink-0 p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground opacity-70 group-hover/row:opacity-100"
                                  onClick={() => openRecovery(ticket.orderId, item.orderItemId, item.name)}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              ) : null}
                            </div>
                            {item.recoveryStatus ? (
                              <p className="text-[10px] text-amber-700 dark:text-amber-200 mt-0.5" data-testid="kitchen-item-recovery-badge">
                                {String(item.recoveryStatus).replace(/_/g, " ")}
                                {item.recoveryReason ? ` · ${item.recoveryReason}` : ""}
                              </p>
                            ) : null}
                            {item.notes && <p className="text-xs text-warning italic">⚠ {item.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="px-4 pb-4 flex gap-2">
                    {next && (
                      <button onClick={() => void onUpdateTicketStatus(ticket.id, next)}
                        disabled={isSubmitting || recoverySubmitting}
                        className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                        {next === "in_progress" ? <ChefHat className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        Mark as {statusLabels[next as KitchenTicketStatus]}
                      </button>
                    )}
                    {ticket.status !== "served" && ticket.status !== "cancelled" && (
                      <button onClick={() => void onCancelTicket(ticket.id)}
                        disabled={isSubmitting || recoverySubmitting}
                        className="py-2.5 px-3 rounded-xl border border-destructive/20 text-destructive text-sm hover:bg-destructive/5 transition-colors">
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
        </div>
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
