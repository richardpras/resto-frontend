import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CreditCard,
  QrCode,
  Smartphone,
  RefreshCw,
  X,
  CheckCircle2,
  Printer,
  Plus,
  Minus,
  Users,
  SplitSquareHorizontal,
  Undo2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { listOrders, type OrderApi } from "@/lib/api";
import { createPaymentAllocations } from "@/features/pos/splitPaymentUtils";
import { toApiPaymentMethod, isGatewayPaymentMethod } from "@/features/pos/paymentMethodUtils";
import { buildSplitPaymentsPayload } from "@/features/pos/buildSplitPaymentsPayload";
import { byItemFullyAllocated, maxQtyForPersonOnLine } from "@/features/pos/splitBillAssignmentUtils";
import { applyByItemTotalDuesWithTaxScale } from "@/features/pos/splitBillProportionalDues";
import type { OrderPaymentPayload } from "@/lib/api-integration/endpoints";
import { toast } from "sonner";
import { ApiHttpError } from "@/lib/api-integration/client";
import { useOutletStore } from "@/stores/outletStore";
import { useOrderStore, type Order, type SplitPerson } from "@/stores/orderStore";
import { useOrderPaymentHistoryStore } from "@/stores/orderPaymentHistoryStore";
import { usePaymentStore } from "@/stores/paymentStore";
import { OrderPaymentHistoryPanel } from "@/components/pos/OrderPaymentHistoryPanel";
import { QrisPaymentModal } from "@/components/payments/QrisPaymentModal";

const POS_TENANT_ID = Number(import.meta.env.VITE_API_TENANT_ID ?? 1) || 1;

const paymentMethods = [
  { label: "Cash", icon: Banknote },
  { label: "QRIS", icon: QrCode },
  { label: "E-Wallet", icon: Smartphone },
  { label: "Card", icon: CreditCard },
];

type CashierOrder = {
  id: string;
  code: string;
  customerName: string;
  tableName: string;
  tableNumber: string;
  total: number;
  paidTotal: number;
  balanceDue: number;
  paymentStatus: "unpaid" | "partial" | "paid";
  status: "pending" | "confirmed" | "cooking" | "ready" | "completed" | "cancelled";
  createdAt?: string;
  source: OrderApi["source"];
  orderChannel?: OrderApi["orderChannel"];
  items: OrderApi["items"];
  payments: OrderApi["payments"];
  splitBill?: OrderApi["splitBill"];
};

type AllocationLine = { orderItemId: number; qty: number; amount: number };

function formatRp(amount: number): string {
  return "Rp " + amount.toLocaleString("id-ID");
}

function operationalChannelLabel(source: OrderApi["source"], channel?: OrderApi["orderChannel"] | null): string {
  if (source === "qr" || channel === "qr") return "QR";
  if (channel === "dine_in") return "POS · Dine-in";
  if (channel === "takeaway") return "POS · Takeaway";
  return "POS";
}

function snapshotCashierOrder(order: CashierOrder): CashierOrder {
  return {
    ...order,
    items: order.items.map((i) => ({ ...i })),
    payments: order.payments.map((p) => ({
      ...p,
      allocations: p.allocations?.map((a) => ({ ...a })),
    })),
  };
}

function mapOrder(order: OrderApi): CashierOrder {
  const paidTotal = order.payments.reduce((sum, payment) => sum + payment.amount, 0);
  return {
    id: order.id,
    code: order.code,
    customerName: order.customerName ?? "",
    tableName: order.tableName ?? "",
    tableNumber: order.tableNumber ?? "",
    total: order.total,
    paidTotal,
    balanceDue: Math.max(0, order.total - paidTotal),
    paymentStatus: order.paymentStatus,
    status: order.status,
    createdAt: order.createdAt,
    source: order.source,
    orderChannel: order.orderChannel ?? undefined,
    items: order.items,
    payments: order.payments,
    splitBill: order.splitBill,
  };
}

/** After `fetchOrder` / `addOrderPaymentsRemote`, map store `Order` into cashier list shape. */
function storeOrderToCashier(order: Order): CashierOrder {
  const paidTotal = order.payments.reduce((sum, p) => sum + p.amount, 0);
  const payments: OrderApi["payments"] = order.payments.map((p, idx) => ({
    id: `local-${order.id}-${idx}`,
    method: p.method,
    amount: p.amount,
    paidAt: p.paidAt instanceof Date ? p.paidAt.toISOString() : new Date(p.paidAt).toISOString(),
    allocations: p.allocations?.map((a) => ({
      orderItemId: Number(a.orderItemId),
      qty: a.qty,
      amount: a.amount,
    })),
  }));
  return {
    id: order.id,
    code: order.code,
    customerName: order.customerName ?? "",
    tableName: order.tableName ?? "",
    tableNumber: order.tableNumber ?? "",
    total: order.total,
    paidTotal,
    balanceDue: Math.max(0, order.total - paidTotal),
    paymentStatus: order.paymentStatus,
    status: order.status,
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : undefined,
    source: order.source,
    orderChannel: order.orderChannel ?? undefined,
    items: order.items as CashierOrder["items"],
    payments,
    splitBill: order.splitBill as OrderApi["splitBill"],
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

function buildBalancePaymentPayload(order: CashierOrder, paymentLabel: string, amount: number): OrderPaymentPayload {
  const splitAllocations = buildSplitSettlementAllocations(order);
  const allocationPaidByItem = new Map<string, number>();
  for (const payment of order.payments) {
    for (const allocation of payment.allocations ?? []) {
      allocationPaidByItem.set(
        String(allocation.orderItemId),
        (allocationPaidByItem.get(String(allocation.orderItemId)) ?? 0) + Math.max(0, allocation.amount),
      );
    }
  }
  const remainingSplitAllocations = splitAllocations.map((allocation) => ({
    ...allocation,
    amount: Math.max(0, allocation.amount - (allocationPaidByItem.get(String(allocation.orderItemId)) ?? 0)),
  }));

  const allocations = createPaymentAllocations(remainingSplitAllocations, amount);
  const base: OrderPaymentPayload = {
    method: toApiPaymentMethod(paymentLabel),
    amount,
    paidAt: new Date().toISOString(),
  };
  /** API: `allocations` is nullable but if present must be min:1 — never send `[]`. */
  if (allocations.length > 0) {
    base.allocations = allocations.map((a) => ({
      orderItemId: Number(a.orderItemId),
      qty: a.qty,
      amount: a.amount,
    }));
  }
  return base;
}

export default function Cashier() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const addOrderPaymentsRemote = useOrderStore((s) => s.addOrderPaymentsRemote);
  const fetchOrderRemote = useOrderStore((s) => s.fetchOrder);
  const paymentIsSubmitting = usePaymentStore((s) => s.isSubmitting);
  const paymentError = usePaymentStore((s) => s.error);
  const paymentTransaction = usePaymentStore((s) => s.currentTransaction);
  const paymentExpiryCountdown = usePaymentStore((s) => s.expiryCountdown);
  const paymentCreateTransaction = usePaymentStore((s) => s.createPaymentTransaction);
  const paymentPollTransactionStatus = usePaymentStore((s) => s.pollTransactionStatus);
  const paymentRetry = usePaymentStore((s) => s.retryPayment);
  const paymentExpire = usePaymentStore((s) => s.expireTransaction);
  const paymentReconcile = usePaymentStore((s) => s.reconcileTransaction);
  const paymentSimulateSandboxPaid = usePaymentStore((s) => s.simulateSandboxPaid);
  const paymentSimulateViaProvider = usePaymentStore((s) => s.simulateViaProvider);
  const paymentResetAsync = usePaymentStore((s) => s.resetAsync);
  const allowSandboxSimulation =
    String(import.meta.env.VITE_ENABLE_SANDBOX_PAYMENT_SIMULATOR ?? "").toLowerCase() === "true" ||
    import.meta.env.DEV;
  const [providerSimulating, setProviderSimulating] = useState(false);

  const [orders, setOrders] = useState<CashierOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [paymentModalOrder, setPaymentModalOrder] = useState<CashierOrder | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingGatewayPayments, setPendingGatewayPayments] = useState<OrderPaymentPayload[]>([]);
  const [gatewayOrderId, setGatewayOrderId] = useState<string | null>(null);

  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitSourceOrder, setSplitSourceOrder] = useState<CashierOrder | null>(null);
  const [splitPersons, setSplitPersons] = useState<SplitPerson[]>([]);
  const [splitMethod, setSplitMethod] = useState<"equal" | "by-item">("equal");
  const [splitCount, setSplitCount] = useState(2);
  const [payingPersonIdx, setPayingPersonIdx] = useState<number | null>(null);
  const [splitPayMethod, setSplitPayMethod] = useState<string | null>(null);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  const splitAllowsByItem = (splitSourceOrder?.paidTotal ?? 0) <= 0;

  const loadOpenOrders = useCallback(async () => {
    setLoading(true);
    try {
      if (typeof activeOutletId !== "number" || activeOutletId < 1) {
        setOrders([]);
        setSelectedOrderId(null);
        return;
      }
      const baseFilters = {
        tenantId: POS_TENANT_ID,
        outletId: activeOutletId,
        source: "pos" as const,
        orderType: "Dine-in" as const,
        status: "confirmed" as const,
        perPage: 200,
      };
      /** One list request; server has single `paymentStatus` filter so we filter client-side. */
      const data = await listOrders(baseFilters);
      const merged = data.filter(
        (order) => order.paymentStatus === "unpaid" || order.paymentStatus === "partial",
      );
      setOrders(merged.map(mapOrder));
      setSelectedOrderId((prev) => (prev && !merged.some((order) => order.id === prev) ? null : prev));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load open cashier orders");
    } finally {
      setLoading(false);
    }
  }, [activeOutletId]);

  useEffect(() => {
    void loadOpenOrders();
  }, [loadOpenOrders]);

  useEffect(() => {
    useOrderPaymentHistoryStore.getState().resetForOutletContextChange();
  }, [activeOutletId]);

  useEffect(() => {
    if (showPaymentModal) return;
    void paymentResetAsync();
  }, [showPaymentModal, paymentResetAsync]);

  useEffect(() => {
    if (!showPaymentModal || !paymentTransaction) return;
    const isQris = (selectedPayment ?? "").toLowerCase() === "qris" || paymentTransaction.method === "qris";
    if (isQris && paymentTransaction.qrString) {
      setShowQrisModal(true);
    }
  }, [showPaymentModal, paymentTransaction, selectedPayment]);

  useEffect(() => {
    if (!activeOutletId || activeOutletId < 1) {
      setShowPaymentModal(false);
      setPaymentModalOrder(null);
      setSelectedPayment(null);
      setPendingGatewayPayments([]);
      setGatewayOrderId(null);
      setShowSplitModal(false);
      setSplitSourceOrder(null);
      setSplitPersons([]);
      setPayingPersonIdx(null);
      setSplitPayMethod(null);
    }
  }, [activeOutletId]);

  useEffect(() => {
    if (!showPaymentModal || !paymentTransaction || paymentTransaction.status !== "paid") return;
    if (!gatewayOrderId || pendingGatewayPayments.length === 0) return;
    void (async () => {
      const paymentsToCommit = pendingGatewayPayments;
      setPendingGatewayPayments([]);
      try {
        await addOrderPaymentsRemote(gatewayOrderId, paymentsToCommit);
        toast.success("Payment completed.");
        await loadOpenOrders();
        setShowPaymentModal(false);
        setShowSplitModal(false);
        setSplitSourceOrder(null);
        setSplitPersons([]);
        setPaymentModalOrder(null);
        setGatewayOrderId(null);
        setSelectedPayment(null);
        setSelectedOrderId(null);
      } catch (error) {
        setPendingGatewayPayments(paymentsToCommit);
        toast.error(error instanceof ApiHttpError ? error.message : "Failed to record payment");
      }
    })();
  }, [
    showPaymentModal,
    paymentTransaction,
    gatewayOrderId,
    pendingGatewayPayments,
    addOrderPaymentsRemote,
    loadOpenOrders,
  ]);

  const resetSplitState = () => {
    setShowSplitModal(false);
    setSplitSourceOrder(null);
    setSplitPersons([]);
    setSplitMethod("equal");
    setSplitCount(2);
    setPayingPersonIdx(null);
    setSplitPayMethod(null);
  };

  const openPaymentModal = () => {
    if (!selectedOrder || selectedOrder.balanceDue <= 0) return;
    void paymentResetAsync();
    setSelectedPayment(null);
    setPendingGatewayPayments([]);
    setGatewayOrderId(null);
    setPaymentModalOrder(snapshotCashierOrder(selectedOrder));
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    if (submitting) return;
    setShowQrisModal(false);
    setShowPaymentModal(false);
    setPaymentModalOrder(null);
    setSelectedPayment(null);
    setPendingGatewayPayments([]);
    setGatewayOrderId(null);
  };

  const beginSplitBill = (source: CashierOrder) => {
    void paymentResetAsync();
    setSelectedPayment(null);
    setPendingGatewayPayments([]);
    setGatewayOrderId(null);
    setShowPaymentModal(false);
    setPaymentModalOrder(null);
    const snap = snapshotCashierOrder(source);
    setSplitSourceOrder(snap);
    setSplitMethod("equal");
    setSplitCount(2);
    setPayingPersonIdx(null);
    setSplitPayMethod(null);
    const balance = snap.balanceDue;
    const perPerson = Math.ceil(balance / 2);
    setSplitPersons(
      Array.from({ length: 2 }, (_, i) => ({
        label: `Person ${i + 1}`,
        items: [],
        payments: [],
        totalDue: i === 1 ? balance - perPerson : perPerson,
      })),
    );
    setShowSplitModal(true);
  };

  const openSplitFromPanel = () => {
    if (!selectedOrder || selectedOrder.balanceDue <= 0) return;
    beginSplitBill(selectedOrder);
  };

  const initCashierSplitFromPaymentModal = () => {
    if (!paymentModalOrder || paymentModalOrder.balanceDue <= 0) return;
    beginSplitBill(paymentModalOrder);
  };

  const closeSplitModal = () => {
    if (submitting) return;
    resetSplitState();
  };

  const buildEqualSplit = (count: number, balanceDue: number) => {
    const perPerson = Math.ceil(balanceDue / count);
    setSplitPersons(
      Array.from({ length: count }, (_, i) => ({
        label: `Person ${i + 1}`,
        items: [],
        payments: [],
        totalDue: i === count - 1 ? balanceDue - perPerson * (count - 1) : perPerson,
      })),
    );
  };

  const buildItemSplit = (count: number) => {
    setSplitPersons(
      Array.from({ length: count }, (_, i) => ({
        label: `Person ${i + 1}`,
        items: [],
        payments: [],
        totalDue: 0,
      })),
    );
  };

  const adjustPersonLineQty = (personIdx: number, itemId: string, delta: number) => {
    if (!splitSourceOrder) return;
    const line = splitSourceOrder.items.find((it) => String(it.id) === itemId);
    if (!line) return;
    const lineQty = line.qty;
    setSplitPersons((prev) => {
      const maxMine = maxQtyForPersonOnLine(prev, personIdx, itemId, lineQty);
      const current = prev[personIdx]?.items.find((it) => it.itemId === itemId)?.qty ?? 0;
      let newQty = current + delta;
      if (newQty < 0) newQty = 0;
      if (newQty > maxMine) newQty = maxMine;

      const updatedPeople = prev.map((p, i) => {
        if (i !== personIdx) return { ...p, items: p.items.map((x) => ({ ...x })) };
        let items: SplitPerson["items"];
        if (newQty === 0) {
          items = p.items.filter((it) => it.itemId !== itemId);
        } else {
          const idx = p.items.findIndex((it) => it.itemId === itemId);
          if (idx === -1) items = [...p.items, { itemId, qty: newQty }];
          else items = p.items.map((it, j) => (j === idx ? { ...it, qty: newQty } : it));
        }
        return { ...p, items };
      });

      const lines = splitSourceOrder.items.map((l) => ({ id: String(l.id), price: l.price, qty: l.qty }));
      const full = byItemFullyAllocated(
        updatedPeople,
        lines.map((l) => ({ id: l.id, qty: l.qty })),
      );
      return applyByItemTotalDuesWithTaxScale(updatedPeople, lines, splitSourceOrder.balanceDue, full);
    });
  };

  const handleSplitPersonPay = () => {
    if (payingPersonIdx === null || !splitPayMethod) return;
    const idx = payingPersonIdx;
    const method = splitPayMethod;
    let recorded: { label: string; amount: number } | null = null;
    setSplitPersons((prev) => {
      const person = prev[idx];
      if (!person) return prev;
      const alreadyPaid = person.payments.reduce((s, p) => s + p.amount, 0);
      const remaining = person.totalDue - alreadyPaid;
      if (remaining <= 0) return prev;
      recorded = { label: person.label, amount: remaining };
      return prev.map((p, i) =>
        i === idx
          ? { ...p, payments: [...p.payments, { method, amount: remaining, paidAt: new Date() }] }
          : p,
      );
    });
    setPayingPersonIdx(null);
    setSplitPayMethod(null);
    if (recorded) {
      toast.success(`${recorded.label} paid ${formatRp(recorded.amount)} via ${method}`);
    }
  };

  /** Draft-only: clears recorded method for this person until you tap Complete split (nothing hits the API). */
  const undoSplitPersonDraftPayment = (personIdx: number) => {
    if (submitting) return;
    const label = splitPersons[personIdx]?.label ?? "Person";
    setSplitPersons((prev) => prev.map((p, i) => (i === personIdx ? { ...p, payments: [] } : p)));
    if (payingPersonIdx === personIdx) {
      setPayingPersonIdx(null);
      setSplitPayMethod(null);
    }
    toast.message(`${label}: payment choice cleared — pick a method again.`);
  };

  const byItemAllocationComplete = useMemo(() => {
    if (splitMethod !== "by-item" || !splitSourceOrder) return true;
    return byItemFullyAllocated(
      splitPersons,
      splitSourceOrder.items.map((l) => ({ id: String(l.id), qty: l.qty })),
    );
  }, [splitMethod, splitSourceOrder, splitPersons]);

  const allSplitPaid = splitPersons.every((p) => {
    const paid = p.payments.reduce((s, pm) => s + pm.amount, 0);
    return paid >= p.totalDue;
  });

  const completeCashierSplit = async () => {
    if (submitting || splitPersons.length === 0 || !splitSourceOrder) return;
    if (typeof activeOutletId !== "number" || activeOutletId < 1) {
      toast.error("Select an outlet in the header.");
      return;
    }
    if (!allSplitPaid) return;
    if (!byItemAllocationComplete) {
      toast.error("Assign every unit of each line across people before completing.");
      return;
    }
    const draftPaymentSum = splitPersons.reduce(
      (s, p) => s + p.payments.reduce((t, pm) => t + pm.amount, 0),
      0,
    );
    if (Math.abs(draftPaymentSum - splitSourceOrder.balanceDue) > 0.02) {
      toast.error(
        "Recorded split amounts do not match the balance due. Use Change on a person row to clear duplicate payments, then confirm again.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const fresh = await fetchOrderRemote(splitSourceOrder.id);
      const batch = buildSplitPaymentsPayload(fresh, splitPersons, splitMethod, fresh.items);
      const alreadyPaidRemote = fresh.payments.reduce((s, p) => s + p.amount, 0);
      const batchTotal = batch.reduce((s, p) => s + p.amount, 0);
      if (alreadyPaidRemote + batchTotal > fresh.total + 0.02) {
        toast.error(
          "Draft payments exceed the order balance (duplicate confirm or stale split). Use Change to clear a row and set methods again.",
        );
        setSubmitting(false);
        return;
      }
      const immediatePayments = batch.filter((payment) => !isGatewayPaymentMethod(payment.method));
      const gatewayPayments = batch.filter((payment) => isGatewayPaymentMethod(payment.method));
      const paidOrder =
        immediatePayments.length > 0 ? await addOrderPaymentsRemote(fresh.id, immediatePayments) : fresh;
      if (gatewayPayments.length > 0) {
        const gatewayTotal = gatewayPayments.reduce((sum, payment) => sum + payment.amount, 0);
        const tx = await paymentCreateTransaction({
          orderId: fresh.id,
          outletId: activeOutletId,
          method: gatewayPayments.length === 1 ? gatewayPayments[0].method : "mixed",
          amount: gatewayTotal,
          splitPayments: gatewayPayments,
        });
        setGatewayOrderId(fresh.id);
        setPendingGatewayPayments(gatewayPayments);
        paymentPollTransactionStatus(tx.id);
        setShowSplitModal(false);
        setSplitSourceOrder(null);
        setSplitPersons([]);
        setPaymentModalOrder(snapshotCashierOrder(storeOrderToCashier(paidOrder)));
        setShowPaymentModal(true);
        toast.success("Split bill saved. Complete the gateway checkout to finish payment.", { icon: "💰" });
        return;
      }
      toast.success("Split bill payments recorded.", { icon: "💰" });
      await loadOpenOrders();
      resetSplitState();
      setSelectedOrderId(null);
    } catch (error) {
      toast.error(error instanceof ApiHttpError ? error.message : "Split payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  const completeCashierPayment = async () => {
    if (!paymentModalOrder || !selectedPayment || submitting) return;
    if (typeof activeOutletId !== "number" || activeOutletId < 1) {
      toast.error("Select an outlet in the header.");
      return;
    }
    const amount = paymentModalOrder.balanceDue;
    if (amount <= 0) {
      toast.error("Nothing to pay.");
      return;
    }

    const payload = buildBalancePaymentPayload(paymentModalOrder, selectedPayment, amount);

    setSubmitting(true);
    try {
      if (selectedPayment === "Cash") {
        await addOrderPaymentsRemote(paymentModalOrder.id, [payload]);
        toast.success("Payment recorded.");
        await loadOpenOrders();
        setSelectedOrderId(null);
        closePaymentModal();
        return;
      }

      if (!isGatewayPaymentMethod(payload.method)) {
        toast.error("Unsupported payment method.");
        return;
      }

      setGatewayOrderId(paymentModalOrder.id);
      setPendingGatewayPayments([payload]);
      const tx = await paymentCreateTransaction({
        orderId: paymentModalOrder.id,
        outletId: activeOutletId,
        method: payload.method,
        amount,
      });
      paymentPollTransactionStatus(tx.id);
      if (payload.method === "qris" && tx.qrString) {
        setShowQrisModal(true);
        toast.success("QRIS ready. Ask customer to scan the QR.");
      } else {
        toast.success("Payment checkout created. Ask customer to complete payment.");
      }
    } catch (error) {
      toast.error(error instanceof ApiHttpError ? error.message : "Payment failed");
      setPendingGatewayPayments([]);
      setGatewayOrderId(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {(!activeOutletId || activeOutletId < 1) && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-amber-900 dark:text-amber-100">
          Select an outlet in the header with a numeric id from <code className="text-xs">outlet_bridge</code> to load cashier queues for that outlet.
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Cashier Payments</h1>
          <p className="text-sm text-muted-foreground">Dine-in confirmed orders in unpaid or partial status.</p>
        </div>
        <button
          type="button"
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
                type="button"
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
                  {(order.tableName?.trim() || order.tableNumber)
                    ? `Table ${order.tableName?.trim() || order.tableNumber}`
                    : "No table"}{" "}
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

              {typeof activeOutletId === "number" && activeOutletId >= 1 ? (
                <OrderPaymentHistoryPanel
                  outletId={activeOutletId}
                  orderId={selectedOrder.id}
                  orderChannelLabel={operationalChannelLabel(selectedOrder.source, selectedOrder.orderChannel)}
                />
              ) : null}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={openPaymentModal}
                  disabled={selectedOrder.balanceDue <= 0}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                  Pay balance
                </button>
                <button
                  type="button"
                  onClick={openSplitFromPanel}
                  disabled={selectedOrder.balanceDue <= 0}
                  className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors flex items-center justify-center gap-2"
                >
                  <SplitSquareHorizontal className="h-4 w-4" />
                  Split bill
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showPaymentModal && paymentModalOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => closePaymentModal()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl p-6 w-full max-w-md pos-shadow-md"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-foreground">Payment</h3>
                <button type="button" onClick={() => closePaymentModal()} className="p-1 rounded-lg hover:bg-muted">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground">Balance due</p>
                <p className="text-3xl font-bold text-foreground mt-1">{formatRp(paymentModalOrder.balanceDue)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {paymentMethods.map((pm) => (
                  <button
                    key={pm.label}
                    type="button"
                    onClick={() => setSelectedPayment(pm.label)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                      selectedPayment === pm.label
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-primary/30 hover:bg-primary/5"
                    }`}
                  >
                    <pm.icon className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium text-foreground">{pm.label}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={initCashierSplitFromPaymentModal}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all mb-4"
              >
                <SplitSquareHorizontal className="h-4 w-4" /> Split bill
              </button>
              <button
                type="button"
                onClick={() => void completeCashierPayment()}
                disabled={!selectedPayment || submitting || paymentIsSubmitting}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity mb-3"
              >
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />{" "}
                  {submitting || paymentIsSubmitting ? "Processing…" : "Complete Payment"}
                </span>
              </button>
              {paymentTransaction && selectedPayment !== "Cash" && (
                <div className="mb-3 rounded-xl border border-border p-3 space-y-2 text-xs">
                  <p className="font-semibold text-foreground">Online Checkout</p>
                  <p className="text-muted-foreground">
                    Status: <span className="font-medium text-foreground">{paymentTransaction.status}</span>
                  </p>
                  {paymentTransaction.status === "paid" && (
                    <p className="rounded-lg bg-success/10 px-2 py-1 text-success">
                      Payment completed. Refreshing order payment...
                    </p>
                  )}
                  {paymentTransaction.status === "expired" && (
                    <p className="rounded-lg bg-destructive/10 px-2 py-1 text-destructive">
                      Payment expired. Retry to create a new checkout.
                    </p>
                  )}
                  {paymentTransaction.status === "failed" && (
                    <p className="rounded-lg bg-destructive/10 px-2 py-1 text-destructive">
                      Payment failed. Retry or choose another method.
                    </p>
                  )}
                  {paymentTransaction.checkoutUrl && (
                    <a href={paymentTransaction.checkoutUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                      Open checkout
                    </a>
                  )}
                  {paymentTransaction.deeplinkUrl && (
                    <a href={paymentTransaction.deeplinkUrl} target="_blank" rel="noreferrer" className="block text-primary underline">
                      Open payment app
                    </a>
                  )}
                  {paymentTransaction.qrString && (
                    <pre className="rounded bg-muted p-2 whitespace-pre-wrap break-all">{paymentTransaction.qrString}</pre>
                  )}
                  {paymentTransaction.vaNumber && (
                    <p className="text-muted-foreground">
                      VA: <span className="font-medium text-foreground">{paymentTransaction.vaNumber}</span>
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    Expires in: <span className="font-medium text-foreground">{paymentExpiryCountdown}s</span>
                  </p>
                  {paymentError && <p className="text-destructive">{paymentError}</p>}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void paymentRetry(paymentTransaction.id)}
                      disabled={paymentIsSubmitting}
                      className="rounded-lg border border-border px-2 py-1"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => void paymentReconcile(paymentTransaction.id)}
                      disabled={paymentIsSubmitting}
                      className="rounded-lg border border-border px-2 py-1"
                    >
                      Reconcile
                    </button>
                    <button
                      type="button"
                      onClick={() => void paymentExpire(paymentTransaction.id)}
                      disabled={paymentIsSubmitting}
                      className="rounded-lg border border-border px-2 py-1"
                    >
                      Expire
                    </button>
                    {allowSandboxSimulation && (
                      <button
                        type="button"
                        onClick={() => void paymentSimulateSandboxPaid(paymentTransaction.id)}
                        disabled={paymentIsSubmitting}
                        className="rounded-lg border border-amber-500/30 px-2 py-1 text-amber-700 dark:text-amber-300"
                      >
                        Simulate Sandbox Payment
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 text-success text-sm">
                <Printer className="h-4 w-4" />
                <span className="font-medium">Print: Ready</span>
                <span className="text-xs opacity-70 ml-auto">Cashier Printer</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <QrisPaymentModal
        open={showPaymentModal && showQrisModal && !!paymentTransaction?.qrString}
        qrString={paymentTransaction?.qrString ?? ""}
        amount={paymentTransaction?.amount ?? paymentModalOrder?.balanceDue ?? 0}
        expirySeconds={paymentExpiryCountdown}
        status={paymentTransaction?.status ?? "pending"}
        orderLabel={paymentModalOrder?.code}
        outletLabel={typeof activeOutletId === "number" ? `Outlet ${activeOutletId}` : undefined}
        isSubmitting={paymentIsSubmitting}
        error={paymentError}
        onRequestClose={() => setShowQrisModal(false)}
        onRetry={() => void (paymentTransaction ? paymentRetry(paymentTransaction.id) : Promise.resolve())}
        onReconcile={() => void (paymentTransaction ? paymentReconcile(paymentTransaction.id) : Promise.resolve())}
        onExpire={() => void (paymentTransaction ? paymentExpire(paymentTransaction.id) : Promise.resolve())}
        showSandboxSimulate={allowSandboxSimulation}
        onSimulateSandboxPaid={() => void (paymentTransaction ? paymentSimulateSandboxPaid(paymentTransaction.id) : Promise.resolve())}
        showProviderSimulate={allowSandboxSimulation}
        providerSimulating={providerSimulating}
        onSimulateViaXendit={() => void (async () => {
          if (!paymentTransaction) return;
          setProviderSimulating(true);
          try {
            await paymentSimulateViaProvider(paymentTransaction.id);
            toast.success("Provider simulation dispatched. Waiting for Xendit webhook callback.");
          } catch (error) {
            toast.error(error instanceof ApiHttpError ? error.message : "Provider simulation failed");
          } finally {
            setProviderSimulating(false);
          }
        })()}
      />

      <AnimatePresence>
        {showSplitModal && splitSourceOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-[52] flex items-center justify-center p-4"
            onClick={() => closeSplitModal()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl p-6 w-full max-w-lg pos-shadow-md max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-foreground">Split Bill</h3>
                <button type="button" onClick={() => closeSplitModal()} className="p-1 rounded-lg hover:bg-muted">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              <div className="text-center mb-5">
                <p className="text-sm text-muted-foreground">Balance due</p>
                <p className="text-2xl font-bold text-foreground">{formatRp(splitSourceOrder.balanceDue)}</p>
                {!splitAllowsByItem && (
                  <p className="text-xs text-muted-foreground mt-2">Equal split only — partial payments already recorded.</p>
                )}
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setSplitMethod("equal");
                    buildEqualSplit(splitCount, splitSourceOrder.balanceDue);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                    splitMethod === "equal" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  Equal Split
                </button>
                <button
                  type="button"
                  disabled={!splitAllowsByItem}
                  title={!splitAllowsByItem ? "Split by item is only available when no payments have been recorded yet." : undefined}
                  onClick={() => {
                    setSplitMethod("by-item");
                    buildItemSplit(splitCount);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                    splitMethod === "by-item" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  } ${!splitAllowsByItem ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Split by Item
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    const c = Math.max(2, splitCount - 1);
                    setSplitCount(c);
                    if (splitMethod === "equal") buildEqualSplit(c, splitSourceOrder.balanceDue);
                    else if (splitAllowsByItem) buildItemSplit(c);
                  }}
                  className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80"
                >
                  <Minus className="h-4 w-4 text-muted-foreground" />
                </button>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{splitCount}</p>
                  <p className="text-xs text-muted-foreground">people</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const c = Math.min(10, splitCount + 1);
                    setSplitCount(c);
                    if (splitMethod === "equal") buildEqualSplit(c, splitSourceOrder.balanceDue);
                    else if (splitAllowsByItem) buildItemSplit(c);
                  }}
                  className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80"
                >
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {splitMethod === "by-item" && splitAllowsByItem && (
                <div className="mb-5 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Use − / + to give each person a quantity. Units cannot exceed the line qty on the order.
                  </p>
                  {!byItemAllocationComplete && (
                    <p className="text-xs text-amber-900 dark:text-amber-100 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
                      Assign all units of every item before you can complete split payments.
                    </p>
                  )}
                  {splitPersons.map((person, pIdx) => (
                    <div key={pIdx} className="bg-background rounded-xl p-3 border border-border/50">
                      <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Users className="h-3.5 w-3.5" /> {person.label}
                        <span className="ml-auto text-xs font-bold text-primary">{formatRp(person.totalDue)}</span>
                      </p>
                      <div className="space-y-2">
                        {splitSourceOrder.items.map((item) => {
                          const itemId = String(item.id);
                          const mine = person.items.find((it) => it.itemId === itemId)?.qty ?? 0;
                          const maxMine = maxQtyForPersonOnLine(splitPersons, pIdx, itemId, item.qty);
                          return (
                            <div
                              key={itemId}
                              className="flex items-center justify-between gap-2 rounded-lg border border-border/40 px-2 py-1.5"
                            >
                              <span className="text-xs text-foreground min-w-0 flex-1 truncate" title={item.name}>
                                {item.name}
                                <span className="text-muted-foreground"> ×{item.qty}</span>
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  aria-label={`Remove one ${item.name} from ${person.label}`}
                                  disabled={mine <= 0 || submitting}
                                  onClick={() => adjustPersonLineQty(pIdx, itemId, -1)}
                                  className="h-7 w-7 rounded-lg border border-border text-sm font-medium hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  −
                                </button>
                                <span className="w-7 text-center text-xs font-semibold tabular-nums">{mine}</span>
                                <button
                                  type="button"
                                  aria-label={`Add one ${item.name} to ${person.label}`}
                                  disabled={mine >= maxMine || submitting}
                                  onClick={() => adjustPersonLineQty(pIdx, itemId, 1)}
                                  className="h-7 w-7 rounded-lg border border-border text-sm font-medium hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2 mb-5">
                {splitPersons.map((person, i) => {
                  const paid = person.payments.reduce((s, p) => s + p.amount, 0);
                  const isPaid = paid >= person.totalDue && person.totalDue > 0;
                  const hasDraftPayment = person.payments.length > 0;
                  const methodSummary = person.payments.map((p) => p.method).join(" + ");
                  return (
                    <div key={i} className="space-y-2">
                      <div
                        className={`flex flex-wrap items-center gap-2 sm:gap-3 rounded-xl p-3 border transition-all ${
                          isPaid ? "bg-success/5 border-success/20" : "bg-background border-border/50"
                        }`}
                      >
                        <span className="text-sm font-medium text-foreground flex-1 min-w-[6rem]">{person.label}</span>
                        <span className="text-sm font-bold text-foreground">{formatRp(person.totalDue)}</span>
                        {isPaid ? (
                          <span className="px-3 py-1 rounded-lg text-xs font-medium bg-success/10 text-success shrink-0">
                            ✓ Paid ({methodSummary})
                          </span>
                        ) : hasDraftPayment ? (
                          <span className="px-3 py-1 rounded-lg text-xs font-medium bg-muted text-foreground shrink-0">
                            {formatRp(paid)} recorded ({methodSummary})
                          </span>
                        ) : null}
                        {!isPaid && (
                          <button
                            type="button"
                            onClick={() => {
                              setPayingPersonIdx(i);
                              setSplitPayMethod(null);
                            }}
                            className="px-3 py-1 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 shrink-0"
                          >
                            {hasDraftPayment ? "Add more" : "Add Payment"}
                          </button>
                        )}
                        {hasDraftPayment && (
                          <button
                            type="button"
                            title="Clear this person’s draft payment so you can pick another method"
                            onClick={() => undoSplitPersonDraftPayment(i)}
                            disabled={submitting}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 disabled:opacity-40"
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                            Change
                          </button>
                        )}
                      </div>
                      <AnimatePresence initial={false}>
                        {payingPersonIdx === i && (
                          <motion.div
                            key={`split-pay-row-${i}`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="bg-accent/30 rounded-xl p-4 border border-accent">
                              <p className="text-sm font-semibold text-foreground mb-3">
                                Pay for {person.label}: {formatRp(person.totalDue)}
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                                {paymentMethods.map((pm) => (
                                  <button
                                    key={pm.label}
                                    type="button"
                                    onClick={() => setSplitPayMethod(pm.label)}
                                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs transition-all ${
                                      splitPayMethod === pm.label ? "border-primary bg-primary/5" : "border-border"
                                    }`}
                                  >
                                    <pm.icon className="h-4 w-4 text-primary" />
                                    {pm.label}
                                  </button>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPayingPersonIdx(null)}
                                  className="flex-1 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-medium"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSplitPersonPay}
                                  disabled={!splitPayMethod}
                                  className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40"
                                >
                                  Confirm Payment
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => void completeCashierSplit()}
                disabled={
                  !allSplitPaid || !byItemAllocationComplete || splitPersons.length === 0 || submitting
                }
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                {submitting
                  ? "Saving…"
                  : !byItemAllocationComplete && splitMethod === "by-item"
                    ? "Assign all item units"
                    : allSplitPaid
                      ? "Complete split & record payments"
                      : `${splitPersons.filter((p) => p.payments.reduce((s, pm) => s + pm.amount, 0) >= p.totalDue && p.totalDue > 0).length}/${splitPersons.length} paid`}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
