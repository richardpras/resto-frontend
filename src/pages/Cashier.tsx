import { useEffect, useMemo, useState } from "react";
import { Banknote, CreditCard, QrCode, Smartphone, RefreshCw } from "lucide-react";
import { addOrderPayments, listOrders, type OrderApi } from "@/lib/api";
import { createPaymentAllocations } from "@/features/pos/splitPaymentUtils";
import { toast } from "sonner";

type PaymentMethod = "cash" | "qris" | "ewallet" | "card";

type CashierOrder = {
  id: string;
  code: string;
  customerName: string;
  tableNumber: string;
  total: number;
  paidTotal: number;
  balanceDue: number;
  paymentStatus: "unpaid" | "partial" | "paid";
  status: "pending" | "confirmed" | "cooking" | "ready" | "completed" | "cancelled";
  createdAt?: string;
  items: OrderApi["items"];
  payments: OrderApi["payments"];
  splitBill?: OrderApi["splitBill"];
};

type PaymentDraft = { method: PaymentMethod; amount: number };
type AllocationLine = { orderItemId: number; qty: number; amount: number };

const paymentMethods: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "qris", label: "QRIS", icon: QrCode },
  { id: "ewallet", label: "E-Wallet", icon: Smartphone },
  { id: "card", label: "Card", icon: CreditCard },
];

function formatRp(amount: number): string {
  return "Rp " + amount.toLocaleString("id-ID");
}

function mapOrder(order: OrderApi): CashierOrder {
  const paidTotal = order.payments.reduce((sum, payment) => sum + payment.amount, 0);
  return {
    id: order.id,
    code: order.code,
    customerName: order.customerName ?? "",
    tableNumber: order.tableNumber ?? "",
    total: order.total,
    paidTotal,
    balanceDue: Math.max(0, order.total - paidTotal),
    paymentStatus: order.paymentStatus,
    status: order.status,
    createdAt: order.createdAt,
    items: order.items,
    payments: order.payments,
    splitBill: order.splitBill,
  };
}

function buildSplitSettlementAllocations(order: CashierOrder): AllocationLine[] {
  if (!order.splitBill || typeof order.splitBill !== "object") return [];
  const rawPersons = (order.splitBill as { persons?: Array<{ items?: Array<{ itemId: string; qty: number }> }> }).persons;
  if (!Array.isArray(rawPersons)) return [];

  const qtyByItem = new Map<string, number>();
  for (const person of rawPersons) {
    if (!Array.isArray(person.items)) continue;
    for (const item of person.items) {
      qtyByItem.set(item.itemId, (qtyByItem.get(item.itemId) ?? 0) + Math.max(0, item.qty));
    }
  }
  if (qtyByItem.size === 0) return [];

  const orderItemIdByMenuId = new Map<string, number>();
  const priceByMenuId = new Map<string, number>();
  for (const item of order.items) {
    if (item.orderItemId) {
      const orderItemId = Number(item.orderItemId);
      if (Number.isFinite(orderItemId)) {
        orderItemIdByMenuId.set(item.id, orderItemId);
      }
    }
    priceByMenuId.set(item.id, item.price);
  }

  return Array.from(qtyByItem.entries())
    .map(([menuItemId, qty]) => ({
      orderItemId: orderItemIdByMenuId.get(menuItemId) ?? 0,
      qty,
      amount: qty * (priceByMenuId.get(menuItemId) ?? 0),
    }))
    .filter((line) => line.orderItemId > 0 && line.qty > 0 && line.amount > 0);
}

export default function Cashier() {
  const [orders, setOrders] = useState<CashierOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentDraft[]>([{ method: "cash", amount: 0 }]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  const draftTotal = payments.reduce((sum, payment) => sum + (Number.isFinite(payment.amount) ? payment.amount : 0), 0);

  const loadOpenOrders = async () => {
    setLoading(true);
    try {
      const data = await listOrders({
        source: "pos",
        orderType: "Dine-in",
        status: "confirmed",
        paymentStatus: "unpaid",
        perPage: 200,
      });
      const partialData = await listOrders({
        source: "pos",
        orderType: "Dine-in",
        status: "confirmed",
        paymentStatus: "partial",
        perPage: 200,
      });
      const merged = [...data, ...partialData].reduce<OrderApi[]>((acc, order) => {
        if (!acc.some((existing) => existing.id === order.id)) acc.push(order);
        return acc;
      }, []);
      setOrders(merged.map(mapOrder));
      if (selectedOrderId && !merged.some((order) => order.id === selectedOrderId)) {
        setSelectedOrderId(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load open cashier orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOpenOrders();
  }, []);

  useEffect(() => {
    if (!selectedOrder) return;
    setPayments([{ method: "cash", amount: selectedOrder.balanceDue }]);
  }, [selectedOrder?.id]);

  const addPaymentLine = () => {
    setPayments((prev) => [...prev, { method: "qris", amount: 0 }]);
  };

  const updatePaymentLine = (index: number, patch: Partial<PaymentDraft>) => {
    setPayments((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const removePaymentLine = (index: number) => {
    setPayments((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const submitPayment = async () => {
    if (!selectedOrder) return;
    if (payments.some((payment) => payment.amount <= 0)) {
      toast.error("Payment amount must be greater than 0.");
      return;
    }
    if (draftTotal > selectedOrder.balanceDue) {
      toast.error("Total payment exceeds balance due.");
      return;
    }

    try {
      const splitAllocations = buildSplitSettlementAllocations(selectedOrder);
      const allocationPaidByItem = new Map<string, number>();
      for (const payment of selectedOrder.payments) {
        for (const allocation of payment.allocations ?? []) {
          allocationPaidByItem.set(
            String(allocation.orderItemId),
            (allocationPaidByItem.get(String(allocation.orderItemId)) ?? 0) + Math.max(0, allocation.amount)
          );
        }
      }
      const remainingSplitAllocations = splitAllocations.map((allocation) => ({
        ...allocation,
        amount: Math.max(0, allocation.amount - (allocationPaidByItem.get(String(allocation.orderItemId)) ?? 0)),
      }));

      await addOrderPayments(selectedOrder.id, {
        payments: payments.map((payment) => ({
          method: payment.method,
          amount: payment.amount,
          paidAt: new Date().toISOString(),
          allocations: createPaymentAllocations(remainingSplitAllocations, payment.amount),
        })),
      });
      toast.success("Payment recorded.");
      await loadOpenOrders();
      setSelectedOrderId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record payment");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Cashier Payments</h1>
          <p className="text-sm text-muted-foreground">Dine-in confirmed orders in unpaid or partial status.</p>
        </div>
        <button
          onClick={() => void loadOpenOrders()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm hover:bg-muted"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground">
              No open unpaid dine-in orders.
            </div>
          ) : (
            orders.map((order) => (
              <button
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                data-testid={`cashier-order-${order.id}`}
                className={`w-full text-left bg-card border rounded-2xl p-4 transition-colors ${
                  selectedOrderId === order.id ? "border-primary" : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">{order.code}</p>
                  <p className="font-bold text-foreground">{formatRp(order.balanceDue)}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {order.tableNumber ? `Table ${order.tableNumber}` : "No table"}{" "}
                  {order.customerName ? `• ${order.customerName}` : ""}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          {!selectedOrder ? (
            <p className="text-sm text-muted-foreground">Select an order to collect payment.</p>
          ) : (
            <>
              <div>
                <p className="text-xs text-muted-foreground">Order</p>
                <p className="font-semibold text-foreground">{selectedOrder.code}</p>
                <p className="text-xs text-muted-foreground">
                  Total {formatRp(selectedOrder.total)} • Paid {formatRp(selectedOrder.paidTotal)}
                </p>
                <p className="text-sm font-bold text-primary mt-1">
                  Balance Due {formatRp(selectedOrder.balanceDue)}
                </p>
              </div>

              <div className="space-y-2">
                {payments.map((line, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <select
                      value={line.method}
                      onChange={(event) => updatePaymentLine(index, { method: event.target.value as PaymentMethod })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                    >
                      {paymentMethods.map((method) => (
                        <option key={method.id} value={method.id}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={line.amount}
                      onChange={(event) => updatePaymentLine(index, { amount: Number(event.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                    />
                    <button
                      onClick={() => removePaymentLine(index)}
                      className="px-3 py-2 rounded-xl border border-border text-xs hover:bg-muted"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addPaymentLine}
                className="w-full py-2 rounded-xl border border-border text-sm hover:bg-muted"
              >
                Add Payment Method
              </button>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Payment Total</span>
                <span className="font-semibold text-foreground">{formatRp(draftTotal)}</span>
              </div>

              <button
                onClick={() => void submitPayment()}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50"
                disabled={draftTotal <= 0}
              >
                Record Payment
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
