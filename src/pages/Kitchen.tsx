import { useState, useEffect } from "react";
import { Clock, Check, ChefHat, AlertTriangle, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import type { Order } from "@/stores/orderStore";
import { listOrders, type OrderApi, updateOrderStatus as updateOrderStatusApi } from "@/lib/api";
import { toast } from "sonner";

type KitchenStatus = "confirmed" | "cooking" | "ready";

function elapsed(date: Date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const statusColors: Record<KitchenStatus, string> = {
  confirmed: "bg-warning/10 text-warning border-warning/20",
  cooking: "bg-info/10 text-info border-info/20",
  ready: "bg-success/10 text-success border-success/20",
};
const statusLabels: Record<KitchenStatus, string> = {
  confirmed: "New",
  cooking: "Cooking",
  ready: "Ready",
};

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
    tableNumber: order.tableNumber ?? "",
    createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
    confirmedAt: order.confirmedAt ? new Date(order.confirmedAt) : undefined,
    splitBill: order.splitBill as Order["splitBill"],
  };
}

export default function Kitchen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listOrders();
        setOrders(data.map(mapApiOrder));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load kitchen orders");
      }
    };
    void load();
  }, []);

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

  // Only show confirmed/cooking/ready orders
  const kitchenOrders = orders.filter((o) =>
    o.status === "confirmed" || o.status === "cooking" || o.status === "ready"
  );

  const nextStatus = (s: Order["status"]): Order["status"] | null => {
    if (s === "confirmed") return "cooking";
    if (s === "cooking") return "ready";
    return null;
  };

  return (
    <div className="p-4 md:p-6">
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
          {(["confirmed", "cooking", "ready"] as KitchenStatus[]).map((s) => (
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
              const order: Record<string, number> = { confirmed: 0, cooking: 1, ready: 2 };
              return (order[a.status] ?? 9) - (order[b.status] ?? 9);
            })
            .map((order) => {
              const next = nextStatus(order.status);
              const refDate = order.confirmedAt || order.createdAt;
              const mins = Math.floor((Date.now() - new Date(refDate).getTime()) / 60000);
              const isLate = mins > 10 && order.status !== "ready";

              return (
                <motion.div key={order.id} layout
                  className={`bg-card rounded-2xl border pos-shadow-md overflow-hidden ${isLate ? "border-destructive/30" : "border-border/50"}`}>
                  <div className={`px-4 py-3 flex items-center justify-between border-b ${isLate ? "bg-destructive/5" : "bg-muted/30"}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{order.code}</span>
                      {order.source === "qr" && (
                        <span className="text-[10px] bg-accent px-1.5 py-0.5 rounded font-medium text-accent-foreground">QR</span>
                      )}
                      {isLate && <AlertTriangle className="h-4 w-4 text-destructive" />}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status as KitchenStatus] || ""}`}>
                      {statusLabels[order.status as KitchenStatus] || order.status}
                    </span>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-muted-foreground">
                        {order.tableNumber ? `Table #${order.tableNumber.replace("table-", "")}` : order.orderType}
                        {order.customerName && ` • ${order.customerName}`}
                      </span>
                      <span className={`flex items-center gap-1 text-xs font-mono font-medium ${isLate ? "text-destructive" : "text-muted-foreground"}`}>
                        <Clock className="h-3 w-3" />
                        {elapsed(new Date(refDate))}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-xs font-bold text-primary bg-primary/10 rounded-md h-5 w-5 flex items-center justify-center shrink-0">{item.qty}</span>
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.name}</p>
                            {item.notes && <p className="text-xs text-warning italic">⚠ {item.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Payment status indicator */}
                    <div className="mt-3 pt-2 border-t border-border/30">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        order.paymentStatus === "paid" ? "bg-success/10 text-success" :
                        order.paymentStatus === "partial" ? "bg-warning/10 text-warning" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {order.paymentStatus === "paid" ? "💰 Paid" : order.paymentStatus === "partial" ? "⏳ Partial" : "🔴 Unpaid"}
                      </span>
                    </div>
                  </div>

                  <div className="px-4 pb-4 flex gap-2">
                    {next && (
                      <button onClick={() => updateOrderStatus(order.id, next)}
                        className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                        {next === "cooking" ? <ChefHat className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        Mark as {statusLabels[next as KitchenStatus]}
                      </button>
                    )}
                    {order.status !== "ready" && (
                      <button onClick={() => cancelOrder(order.id)}
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
