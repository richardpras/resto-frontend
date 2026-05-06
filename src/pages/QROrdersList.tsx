import { useEffect, useState } from "react";
import type { Order } from "@/stores/orderStore";
import { Clock, CheckCircle2, ChefHat, Package, Eye, X, CreditCard, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { listOrders, type OrderApi, updateOrderStatus as updateOrderStatusApi } from "@/lib/api";
import { toast } from "sonner";
import { useOutletStore } from "@/stores/outletStore";

const POS_TENANT_ID = Number(import.meta.env.VITE_API_TENANT_ID ?? 1) || 1;

function formatRp(n: number) { return "Rp " + n.toLocaleString("id-ID"); }

const statusConfig: Record<Order["status"], { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-warning/10 text-warning", icon: Clock },
  cooking: { label: "Cooking", color: "bg-info/10 text-info", icon: ChefHat },
  ready: { label: "Ready", color: "bg-success/10 text-success", icon: Package },
  completed: { label: "Completed", color: "bg-muted text-muted-foreground", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-destructive/10 text-destructive", icon: X },
};

const paymentColors = {
  unpaid: "bg-destructive/10 text-destructive",
  partial: "bg-warning/10 text-warning",
  paid: "bg-success/10 text-success",
};

const filters = ["all", "confirmed", "cooking", "ready", "completed"] as const;

function mapApiOrder(order: OrderApi): Order {
  return {
    id: order.id,
    code: order.code,
    source: order.source,
    orderType: order.orderType,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      qty: item.qty,
      emoji: item.emoji ?? "",
      notes: item.notes ?? "",
    })),
    subtotal: order.subtotal,
    tax: order.tax,
    total: order.total,
    status: order.status,
    paymentStatus: order.paymentStatus,
    payments: order.payments.map((payment) => ({
      method: payment.method,
      amount: payment.amount,
      paidAt: payment.paidAt ? new Date(payment.paidAt) : new Date(),
    })),
    customerName: order.customerName ?? "",
    customerPhone: order.customerPhone ?? "",
    tableId: order.tableId != null ? String(order.tableId) : undefined,
    tableName: order.tableName ?? undefined,
    tableNumber: order.tableNumber ?? "",
    createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
    confirmedAt: order.confirmedAt ? new Date(order.confirmedAt) : undefined,
    splitBill: order.splitBill as Order["splitBill"],
  };
}

export default function QROrders() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const load = async () => {
      if (typeof activeOutletId !== "number" || activeOutletId < 1) {
        setOrders([]);
        return;
      }
      try {
        const data = await listOrders({ tenantId: POS_TENANT_ID, outletId: activeOutletId, perPage: 200 });
        setOrders(data.map(mapApiOrder));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load orders");
      }
    };
    void load();
  }, [activeOutletId]);

  const updateOrderStatus = async (id: string, status: Order["status"]) => {
    try {
      const updated = await updateOrderStatusApi(id, { status });
      setOrders((prev) => prev.map((o) => (o.id === id ? mapApiOrder(updated) : o)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update order status");
    }
  };

  const cancelOrder = async (id: string) => {
    try {
      const updated = await updateOrderStatusApi(id, { status: "cancelled" });
      setOrders((prev) => prev.map((o) => (o.id === id ? mapApiOrder(updated) : o)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel order");
    }
  };

  // Show ALL orders (both POS and QR)
  const allOrders = orders;
  const filtered = filter === "all" ? allOrders : allOrders.filter((o) => o.status === filter);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {(!activeOutletId || activeOutletId < 1) && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-amber-900 dark:text-amber-100">
          Select an outlet in the header with a configured numeric id to list QR and POS orders for that outlet only.
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">All Orders</h1>
          <p className="text-sm text-muted-foreground">POS and QR orders in one view</p>
        </div>
        <div className="flex gap-2">
          <span className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-xl font-medium">
            {allOrders.filter((o) => o.status === "confirmed").length} new
          </span>
          <span className="text-xs bg-warning/10 text-warning px-3 py-1.5 rounded-xl font-medium">
            {allOrders.filter((o) => o.paymentStatus === "unpaid" && o.status !== "cancelled").length} unpaid
          </span>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-medium capitalize whitespace-nowrap transition-all ${filter === f ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border hover:text-foreground"}`}>
            {f === "all" ? `All (${allOrders.length})` : `${f} (${allOrders.filter((o) => o.status === f).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Package className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">No orders yet</p>
          <p className="text-xs">Orders from POS and QR will appear here</p>
        </div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence>
            {filtered.map((order) => {
              const sc = statusConfig[order.status];
              const Icon = sc.icon;
              return (
                <motion.div key={order.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="bg-card rounded-2xl p-4 border border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{order.code}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${order.source === "qr" ? "bg-accent text-accent-foreground" : "bg-primary/10 text-primary"}`}>
                          {order.source === "qr" ? "QR" : "POS"}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-lg font-medium flex items-center gap-1 ${sc.color}`}>
                          <Icon className="h-3 w-3" /> {sc.label}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${paymentColors[order.paymentStatus]}`}>
                          {order.paymentStatus === "paid" ? "💰 Paid" : order.paymentStatus === "partial" ? "⏳ Partial" : "Unpaid"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(order.tableName?.trim() || order.tableNumber) &&
                          `Table #${order.tableName?.trim() || order.tableNumber}`}
                        {order.customerName && ` • ${order.customerName}`}
                        {" • "}{new Date(order.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-foreground">{formatRp(order.total)}</span>
                  </div>

                  <div className="flex items-center gap-1 mb-3 flex-wrap">
                    {order.items.map((item) => (
                      <span key={item.id} className="text-xs bg-muted px-2 py-1 rounded-lg text-muted-foreground">
                        {item.emoji} {item.name} ×{item.qty}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedOrder(order)}
                      className="flex-1 py-2 rounded-xl text-xs font-medium border border-border hover:bg-muted transition-colors flex items-center justify-center gap-1">
                      <Eye className="h-3.5 w-3.5" /> Detail
                    </button>
                    {order.status === "confirmed" && (
                      <button onClick={() => updateOrderStatus(order.id, "cooking")}
                        className="flex-1 py-2 rounded-xl text-xs font-medium bg-info/90 text-info-foreground transition-colors flex items-center justify-center gap-1">
                        <ChefHat className="h-3.5 w-3.5" /> Start Cook
                      </button>
                    )}
                    {order.status === "cooking" && (
                      <button onClick={() => updateOrderStatus(order.id, "ready")}
                        className="flex-1 py-2 rounded-xl text-xs font-medium bg-success text-success-foreground transition-colors flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Mark Ready
                      </button>
                    )}
                    {order.status === "ready" && (
                      <button onClick={() => updateOrderStatus(order.id, "completed")}
                        className="flex-1 py-2 rounded-xl text-xs font-medium bg-primary text-primary-foreground transition-colors flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                      </button>
                    )}
                    {order.status !== "completed" && order.status !== "cancelled" && (
                      <button onClick={() => cancelOrder(order.id)}
                        className="py-2 px-3 rounded-xl text-xs font-medium border border-destructive/20 text-destructive hover:bg-destructive/5 transition-colors">
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

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
                  <h3 className="text-lg font-bold text-foreground">{selectedOrder.code}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedOrder.source === "qr" ? "QR Order" : "POS Order"}
                    {(selectedOrder.tableName?.trim() || selectedOrder.tableNumber) &&
                      ` • Table #${selectedOrder.tableName?.trim() || selectedOrder.tableNumber}`}
                    {selectedOrder.customerName && ` • ${selectedOrder.customerName}`}
                  </p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-1.5 rounded-xl hover:bg-muted"><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>

              <div className="space-y-2 mb-4">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{item.emoji}</span>
                      <div>
                        <span className="text-foreground">{item.name}</span>
                        <span className="text-muted-foreground ml-1">×{item.qty}</span>
                        {item.notes && <p className="text-xs text-primary/70 italic">📝 {item.notes}</p>}
                      </div>
                    </div>
                    <span className="font-medium text-foreground">{formatRp(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatRp(selectedOrder.subtotal)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>{formatRp(selectedOrder.tax)}</span></div>
                <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border"><span>Total</span><span>{formatRp(selectedOrder.total)}</span></div>
              </div>

              {/* Payment details */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${paymentColors[selectedOrder.paymentStatus]}`}>
                    {selectedOrder.paymentStatus.toUpperCase()}
                  </span>
                </div>
                {selectedOrder.payments.length > 0 && (
                  <div className="space-y-1">
                    {selectedOrder.payments.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-muted rounded-lg px-3 py-2">
                        <span className="flex items-center gap-1.5"><CreditCard className="h-3 w-3" /> {p.method}</span>
                        <span className="font-medium">{formatRp(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Split bill details */}
              {selectedOrder.splitBill && (
                <div className="mt-4 border-t border-border pt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Split Bill ({selectedOrder.splitBill.method})</p>
                  {selectedOrder.splitBill.persons.map((person, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1">
                      <span className="text-foreground">{person.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatRp(person.totalDue)}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          person.payments.reduce((s, p) => s + p.amount, 0) >= person.totalDue ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                        }`}>
                          {person.payments[0]?.method || "unpaid"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

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
