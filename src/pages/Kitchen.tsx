import { useState, useEffect } from "react";
import { Clock, Check, ChefHat, AlertTriangle, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useKitchenStore } from "@/stores/kitchenStore";
import { toast } from "sonner";
import { useOutletStore } from "@/stores/outletStore";
import { PERMISSIONS, useAuthStore } from "@/stores/authStore";
import type { KitchenTicket, KitchenTicketStatus } from "@/domain/kitchenAdapters";
import type { KitchenTicketStatus as ApiKitchenTicketStatus } from "@/lib/api-integration/kitchenEndpoints";

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

export default function Kitchen() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canUseKitchen = hasPermission(PERMISSIONS.KITCHEN);
  const tickets = useKitchenStore((s) => s.tickets);
  const error = useKitchenStore((s) => s.error);
  const isLoading = useKitchenStore((s) => s.isLoading);
  const isSubmitting = useKitchenStore((s) => s.isSubmitting);
  const startPolling = useKitchenStore((s) => s.startPolling);
  const stopPolling = useKitchenStore((s) => s.stopPolling);
  const updateTicketStatus = useKitchenStore((s) => s.updateTicketStatus);
  const [, setTick] = useState(0);

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
            {isLoading ? " · Loading..." : ""}
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

      {kitchenOrders.length === 0 ? (
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
                        <div key={item.id} className="flex items-start gap-2">
                          <span className="text-xs font-bold text-primary bg-primary/10 rounded-md h-5 w-5 flex items-center justify-center shrink-0">{item.qty}</span>
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.name}</p>
                            {item.notes && <p className="text-xs text-warning italic">⚠ {item.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="px-4 pb-4 flex gap-2">
                    {next && (
                      <button onClick={() => void onUpdateTicketStatus(ticket.id, next)}
                        disabled={isSubmitting}
                        className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                        {next === "in_progress" ? <ChefHat className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        Mark as {statusLabels[next as KitchenTicketStatus]}
                      </button>
                    )}
                    {ticket.status !== "served" && ticket.status !== "cancelled" && (
                      <button onClick={() => void onCancelTicket(ticket.id)}
                        disabled={isSubmitting}
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
    </div>
  );
}
