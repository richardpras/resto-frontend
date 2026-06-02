import { useEffect, useMemo, useState } from "react";
import { Clock, CheckCircle2, Package, Eye, X, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useOutletStore } from "@/stores/outletStore";
import { PERMISSIONS, useAuthStore } from "@/stores/authStore";
import type { QrOrderRequest } from "@/stores/qrOrderStore";
import { useQrOrderStore } from "@/stores/qrOrderStore";
import { QrOrderCardStackSkeleton } from "@/components/skeletons/list/QrOrderCardStackSkeleton";
import { SkeletonBusyRegion } from "@/components/skeletons/SkeletonBusyRegion";

const statusConfig: Record<QrOrderRequest["status"], { label: string; color: string; icon: typeof Clock }> = {
  pending_cashier_confirmation: { label: "Pending", color: "bg-warning/10 text-warning", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-success/10 text-success", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-destructive/10 text-destructive", icon: XCircle },
  expired: { label: "Expired", color: "bg-muted text-muted-foreground", icon: X },
};

function formatAgo(date: Date | null): string {
  if (!date) return "never";
  const diffMs = Date.now() - date.getTime();
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  if (sec < 60) return `${sec} sec ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  return `${hrs} hr ago`;
}

function urgencyFor(order: QrOrderRequest): { label: string; className: string } {
  const count = order.cashierCallCount ?? 0;
  if (count >= 3) return { label: "Urgent", className: "bg-destructive/10 text-destructive" };
  if (count >= 1) return { label: "Called", className: "bg-warning/10 text-warning" };
  return { label: "Normal", className: "bg-muted text-muted-foreground" };
}

export default function QROrders() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const requests = useQrOrderStore((s) => s.requests);
  const initialLoading = useQrOrderStore((s) => s.initialLoading);
  const backgroundRefreshing = useQrOrderStore((s) => s.backgroundRefreshing);
  const isSubmitting = useQrOrderStore((s) => s.isSubmitting);
  const error = useQrOrderStore((s) => s.error);
  const lastSyncAt = useQrOrderStore((s) => s.lastSyncAt);
  const startPolling = useQrOrderStore((s) => s.startPolling);
  const stopPolling = useQrOrderStore((s) => s.stopPolling);
  const confirmRequest = useQrOrderStore((s) => s.confirmRequest);
  const rejectRequest = useQrOrderStore((s) => s.rejectRequest);
  const [selectedOrder, setSelectedOrder] = useState<QrOrderRequest | null>(null);
  const canManage = hasPermission(PERMISSIONS.QR_ORDERS);

  useEffect(() => {
    if (!canManage) {
      stopPolling();
      return;
    }
    if (typeof activeOutletId !== "number" || activeOutletId < 1) {
      stopPolling();
      return;
    }
    startPolling({ outletId: activeOutletId, status: "pending_cashier_confirmation", perPage: 100 }, 10000);
    return () => stopPolling();
  }, [activeOutletId, canManage, startPolling, stopPolling]);

  useEffect(() => {
    if (!error) return;
    toast.error(error);
  }, [error]);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "pending_cashier_confirmation"),
    [requests],
  );

  const onConfirmOnly = async (id: string) => {
    try {
      await confirmRequest(id, { mode: "confirm_only" });
      toast.success("Confirmed as open bill.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to confirm request");
    }
  };

  const onPayAndConfirm = async (id: string, estimatedTotal: number) => {
    if (!Number.isFinite(estimatedTotal) || estimatedTotal <= 0) {
      toast.error("Estimated total unavailable for Pay & Confirm.");
      return;
    }
    try {
      await confirmRequest(id, {
        mode: "pay_and_confirm",
        payments: [{ method: "cash", amount: estimatedTotal }],
      });
      toast.success("Paid and confirmed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to confirm request");
    }
  };

  const onReject = async (id: string) => {
    try {
      await rejectRequest(id, "Rejected by cashier");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject request");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {(!activeOutletId || activeOutletId < 1) && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-amber-900 dark:text-amber-100">
          Select an outlet in the header with a configured numeric id to list QR requests for that outlet.
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">QR Requests</h1>
          <p className="text-sm text-muted-foreground">Pending cashier confirmation queue</p>
        </div>
        <div className="flex gap-2">
          <span className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-xl font-medium">
            {pendingRequests.length} pending
          </span>
        </div>
      </div>
      {lastSyncAt && (
        <p className="text-xs text-muted-foreground">
          Last refresh: {new Date(lastSyncAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      )}
      <SkeletonBusyRegion busy={initialLoading && pendingRequests.length === 0} label="Loading QR requests">
        {initialLoading && pendingRequests.length === 0 ? (
          <QrOrderCardStackSkeleton cards={3} />
        ) : pendingRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Package className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">No pending QR requests</p>
          <p className="text-xs">New customer requests will auto-refresh here</p>
        </div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence>
            {pendingRequests.map((order) => {
              const sc = statusConfig[order.status];
              const Icon = sc.icon;
              const urgency = urgencyFor(order);
              return (
                <motion.div key={order.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="bg-card rounded-2xl p-4 border border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{order.requestCode}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-lg font-medium flex items-center gap-1 ${sc.color}`}>
                          <Icon className="h-3 w-3" /> {sc.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {order.tableName && `Table ${order.tableName}`}
                        {order.customerName && ` • ${order.customerName}`}
                        {" • "}{new Date(order.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[11px] px-2 py-0.5 rounded-lg font-medium ${urgency.className}`}>
                          {urgency.label}
                        </span>
                        <p className="text-xs text-warning">
                          Called {order.cashierCallCount ?? 0}x
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last called {formatAgo(order.cashierCalledAt)}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{order.items.length} items</span>
                  </div>

                  <div className="flex items-center gap-1 mb-3 flex-wrap">
                    {order.items.map((item) => (
                      <span key={item.id} className="text-xs bg-muted px-2 py-1 rounded-lg text-muted-foreground">
                        Menu #{item.menuItemId} ×{item.qty}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedOrder(order)}
                      className="flex-1 py-2 rounded-xl text-xs font-medium border border-border hover:bg-muted transition-colors flex items-center justify-center gap-1">
                      <Eye className="h-3.5 w-3.5" /> Detail
                    </button>
                    <button
                      disabled={!canManage || isSubmitting}
                      onClick={() => onPayAndConfirm(order.id, order.estimatedTotal)}
                      aria-label={`Pay and confirm ${order.requestCode}`}
                      className="flex-1 py-2 rounded-xl text-xs font-medium bg-success text-success-foreground transition-colors flex items-center justify-center gap-1 disabled:opacity-60"
                    >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Pay & Confirm
                    </button>
                    <button
                      disabled={!canManage || isSubmitting}
                      onClick={() => onConfirmOnly(order.id)}
                      aria-label={`Confirm only ${order.requestCode}`}
                      className="flex-1 py-2 rounded-xl text-xs font-medium border border-primary/40 text-primary transition-colors flex items-center justify-center gap-1 disabled:opacity-60"
                    >
                      Confirm Only
                    </button>
                      <button
                        disabled={!canManage || isSubmitting}
                        onClick={() => onReject(order.id)}
                        aria-label={`Reject ${order.requestCode}`}
                        className="py-2 px-3 rounded-xl text-xs font-medium border border-destructive/20 text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-60"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      {backgroundRefreshing && pendingRequests.length > 0 && (
        <p className="text-xs text-muted-foreground">Refreshing queue...</p>
      )}
      </SkeletonBusyRegion>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedOrder(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{selectedOrder.requestCode}</h3>
                  <p className="text-xs text-muted-foreground">
                    QR Order
                    {selectedOrder.tableName && ` • Table ${selectedOrder.tableName}`}
                    {selectedOrder.customerName && ` • ${selectedOrder.customerName}`}
                  </p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-1.5 rounded-xl hover:bg-muted"><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>

              <div className="space-y-2 mb-4">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div>
                        <span className="text-foreground">Menu #{item.menuItemId}</span>
                        <span className="text-muted-foreground ml-1">×{item.qty}</span>
                        {item.notes && <p className="text-xs text-primary/70 italic">Note: {item.notes}</p>}
                      </div>
                    </div>
                    <span className="font-medium text-foreground">qty {item.qty}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                {new Date(selectedOrder.createdAt).toLocaleString("id-ID")}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
