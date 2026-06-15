import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
import { getOpenBillByTable, listOrders, type OpenBillByTableApi, type OrderApi } from "@/lib/api";
import { OrderSourceBadge } from "@/components/orders/OrderSourceBadge";
import { PosPrintStatusBar } from "@/components/pos/PosPrintStatusBar";
import { createPaymentAllocations } from "@/features/pos/splitPaymentUtils";
import {
  apiMethodFromCheckoutMethod,
  isGatewayPaymentMethod,
  toApiPaymentMethod,
} from "@/features/pos/paymentMethodUtils";
import {
  FALLBACK_CHECKOUT_METHODS,
  iconForCheckoutMethod,
  isCashCheckoutMethod,
  isGatewayCheckoutMethod,
  isManualQrisCheckoutMethod,
} from "@/features/pos/paymentMethodCapabilities";
import { findCheckoutMethod, useOutletCheckoutMethods } from "@/features/pos/useOutletCheckoutMethods";
import { PaymentMethodTileGrid } from "@/components/pos/PaymentMethodTileGrid";
import {
  gatewayRetryLabel,
  isTerminalGatewayStatus,
  pendingGatewayCheckoutTotal,
  remapSettlementBatchMethod,
  shouldBlockDuplicateGatewayAttempt,
  splitPaymentsForGatewayCreate,
} from "@/features/pos/gatewayCheckoutUtils";
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
import { StaticQrisPaymentModal } from "@/components/payments/StaticQrisPaymentModal";
import { useAuthStore } from "@/stores/authStore";
import { canReconcilePayments } from "@/domain/permissionGates";
import { PosSessionPanel } from "@/components/pos/PosSessionPanel";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";

const POS_TENANT_ID = Number(import.meta.env.VITE_API_TENANT_ID ?? 1) || 1;

type CashierOrder = {
  id: string;
  outletId?: number;
  tableId?: number;
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
    outletId: typeof order.outletId === "number" ? order.outletId : undefined,
    tableId: typeof order.tableId === "number" ? order.tableId : undefined,
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
    outletId: undefined,
    tableId: Number.isFinite(Number(order.tableId)) ? Number(order.tableId) : undefined,
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

function buildBalancePaymentPayload(order: CashierOrder, apiMethod: string, amount: number): OrderPaymentPayload {
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
    method: apiMethod,
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
  const { t } = useOpsTranslation();
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
  const authUser = useAuthStore((s) => s.user);
  const showReconcile = canReconcilePayments(authUser);

  const [orders, setOrders] = useState<CashierOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [qrisModalSuppressedTxId, setQrisModalSuppressedTxId] = useState<string | null>(null);
  const [paymentModalOrder, setPaymentModalOrder] = useState<CashierOrder | null>(null);
  const [selectedCheckoutCode, setSelectedCheckoutCode] = useState<string | null>(null);
  const [showStaticQrisModal, setShowStaticQrisModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingGatewayPayments, setPendingGatewayPayments] = useState<OrderPaymentPayload[]>([]);
  const [gatewayOrderId, setGatewayOrderId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [openBill, setOpenBill] = useState<OpenBillByTableApi | null>(null);
  const [openBillLoading, setOpenBillLoading] = useState(false);
  const [selectedOpenBillOrderIds, setSelectedOpenBillOrderIds] = useState<Set<number>>(new Set());
  const [openBillSettling, setOpenBillSettling] = useState(false);

  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitSourceOrder, setSplitSourceOrder] = useState<CashierOrder | null>(null);
  const [splitPersons, setSplitPersons] = useState<SplitPerson[]>([]);
  const [splitMethod, setSplitMethod] = useState<"equal" | "by-item">("equal");
  const [splitCount, setSplitCount] = useState(2);
  const [payingPersonIdx, setPayingPersonIdx] = useState<number | null>(null);
  const [splitPayMethod, setSplitPayMethod] = useState<string | null>(null);
  const { data: checkoutMethods = FALLBACK_CHECKOUT_METHODS } = useOutletCheckoutMethods(activeOutletId, {
    enabled: showPaymentModal || showSplitModal,
  });
  const checkoutTiles = useMemo(
    () => checkoutMethods.map((method) => ({ method, icon: iconForCheckoutMethod(method) })),
    [checkoutMethods],
  );
  const selectedCheckoutMethod = findCheckoutMethod(checkoutMethods, selectedCheckoutCode);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );
  const openBillTableOptions = useMemo(() => {
    const seen = new Set<string>();
    return orders
      .filter((o) => typeof o.tableId === "number" && o.tableId > 0 && typeof o.outletId === "number")
      .map((o) => ({
        tableId: o.tableId as number,
        outletId: o.outletId as number,
        label: o.tableName?.trim() || o.tableNumber ? `${o.tableName?.trim() || o.tableNumber}` : `Table ${o.tableId}`,
      }))
      .filter((entry) => {
        const key = `${entry.outletId}-${entry.tableId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [orders]);

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
      toast.error(error instanceof Error ? error.message : t("cashier.loadOrdersFailed"));
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
    if (paymentTransaction.status !== "pending") return;
    if (qrisModalSuppressedTxId === paymentTransaction.id) return;
    const gatewayQris =
      Boolean(selectedCheckoutMethod && isGatewayCheckoutMethod(selectedCheckoutMethod)) ||
      paymentTransaction.method === "qris";
    if (gatewayQris && paymentTransaction.qrString) {
      setShowQrisModal(true);
    }
  }, [showPaymentModal, paymentTransaction, selectedCheckoutMethod, qrisModalSuppressedTxId]);

  useEffect(() => {
    if (!activeOutletId || activeOutletId < 1) {
      setShowPaymentModal(false);
      setPaymentModalOrder(null);
      setSelectedCheckoutCode(null);
      setShowStaticQrisModal(false);
      setPendingGatewayPayments([]);
      setGatewayOrderId(null);
      setShowSplitModal(false);
      setSplitSourceOrder(null);
      setSplitPersons([]);
      setPayingPersonIdx(null);
      setSplitPayMethod(null);
      setSelectedTableId(null);
      setOpenBill(null);
      setSelectedOpenBillOrderIds(new Set());
    }
  }, [activeOutletId]);

  useEffect(() => {
    if (!selectedOrder || typeof selectedOrder.tableId !== "number" || selectedOrder.tableId < 1) return;
    setSelectedTableId(selectedOrder.tableId);
  }, [selectedOrder]);

  const loadOpenBill = useCallback(async () => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1 || typeof selectedTableId !== "number" || selectedTableId < 1) {
      setOpenBill(null);
      setSelectedOpenBillOrderIds(new Set());
      return;
    }
    setOpenBillLoading(true);
    try {
      const data = await getOpenBillByTable(activeOutletId, selectedTableId);
      setOpenBill(data);
      setSelectedOpenBillOrderIds((prev) => {
        const next = new Set<number>();
        for (const order of data.orders) {
          if (prev.has(order.id)) next.add(order.id);
        }
        return next;
      });
    } catch (error) {
      setOpenBill(null);
      setSelectedOpenBillOrderIds(new Set());
      toast.error(error instanceof Error ? error.message : t("cashier.loadBillFailed"));
    } finally {
      setOpenBillLoading(false);
    }
  }, [activeOutletId, selectedTableId]);

  useEffect(() => {
    void loadOpenBill();
  }, [loadOpenBill]);

  useEffect(() => {
    if (!showPaymentModal || !paymentTransaction || paymentTransaction.status !== "paid") return;
    if (!gatewayOrderId || pendingGatewayPayments.length === 0) return;
    void (async () => {
      const paymentsToCommit = pendingGatewayPayments;
      setPendingGatewayPayments([]);
      try {
        await addOrderPaymentsRemote(gatewayOrderId, paymentsToCommit);
        toast.success(t("shared.paymentCompleted"));
        await loadOpenOrders();
        setShowPaymentModal(false);
        setShowSplitModal(false);
        setSplitSourceOrder(null);
        setSplitPersons([]);
        setPaymentModalOrder(null);
        setGatewayOrderId(null);
        setSelectedCheckoutCode(null);
      setShowStaticQrisModal(false);
        setSelectedOrderId(null);
      } catch (error) {
        setPendingGatewayPayments(paymentsToCommit);
        if (gatewayOrderId) {
          try {
            await fetchOrderRemote(gatewayOrderId);
          } catch {
            // Best-effort sync after gateway payment commit failure.
          }
        }
        setShowQrisModal(false);
        setShowPaymentModal(false);
        setPaymentModalOrder(null);
        setGatewayOrderId(null);
        setSelectedCheckoutCode(null);
        void paymentResetAsync();
        await loadOpenOrders();
        toast.error(error instanceof ApiHttpError ? error.message : t("cashier.recordFailed"));
      }
    })();
  }, [
    showPaymentModal,
    paymentTransaction,
    gatewayOrderId,
    pendingGatewayPayments,
    addOrderPaymentsRemote,
    loadOpenOrders,
    fetchOrderRemote,
    paymentResetAsync,
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
    setSelectedCheckoutCode(null);
    setShowStaticQrisModal(false);
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
    setSelectedCheckoutCode(null);
    setShowStaticQrisModal(false);
    setPendingGatewayPayments([]);
    setGatewayOrderId(null);
  };

  const beginSplitBill = (source: CashierOrder) => {
    void paymentResetAsync();
    setSelectedCheckoutCode(null);
    setShowStaticQrisModal(false);
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
        label: t("shared.person", { n: i + 1 }),
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
        label: t("shared.person", { n: i + 1 }),
        items: [],
        payments: [],
        totalDue: i === count - 1 ? balanceDue - perPerson * (count - 1) : perPerson,
      })),
    );
  };

  const buildItemSplit = (count: number) => {
    setSplitPersons(
      Array.from({ length: count }, (_, i) => ({
        label: t("shared.person", { n: i + 1 }),
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
    const hadDraftPayments = splitPersons.some((p) => p.payments.length > 0);
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
      const next = applyByItemTotalDuesWithTaxScale(updatedPeople, lines, splitSourceOrder.balanceDue);
      return next.map((p) => ({ ...p, payments: [] }));
    });
    if (hadDraftPayments) {
      toast.message("Split payment drafts cleared — item assignment changed.");
    }
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
      toast.success(t("shared.paidVia", { label: recorded.label, amount: formatRp(recorded.amount), method }));
    }
  };

  /** Draft-only: clears recorded method for this person until you tap Complete split (nothing hits the API). */
  const undoSplitPersonDraftPayment = (personIdx: number) => {
    if (submitting) return;
    const label = splitPersons[personIdx]?.label ?? t("shared.person", { n: personIdx + 1 });
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
      toast.error(t("shared.selectOutlet"));
      return;
    }
    if (!allSplitPaid) return;
    if (!byItemAllocationComplete) {
      toast.error(t("shared.assignAllUnitsToast"));
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
      const immediatePayments = batch.filter((payment) => !isGatewayPaymentMethod(payment.method, checkoutMethods));
      const gatewayPayments = batch.filter((payment) => isGatewayPaymentMethod(payment.method, checkoutMethods));
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
        toast.success(t("shared.splitSavedGateway"), { icon: "💰" });
        return;
      }
      toast.success(t("cashier.splitRecorded"), { icon: "💰" });
      await loadOpenOrders();
      resetSplitState();
      setSelectedOrderId(null);
    } catch (error) {
      toast.error(error instanceof ApiHttpError ? error.message : t("cashier.splitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const completeCashierPayment = async () => {
    if (!paymentModalOrder || !selectedCheckoutMethod || submitting) return;
    if (typeof activeOutletId !== "number" || activeOutletId < 1) {
      toast.error(t("shared.selectOutlet"));
      return;
    }
    const amount = paymentModalOrder.balanceDue;
    if (amount <= 0) {
      toast.error(t("shared.nothingToPay"));
      return;
    }

    const apiMethod = apiMethodFromCheckoutMethod(selectedCheckoutMethod);
    const payload = buildBalancePaymentPayload(paymentModalOrder, apiMethod, amount);
    const cashMethod = isCashCheckoutMethod(selectedCheckoutMethod);
    const manualQrisMethod = isManualQrisCheckoutMethod(selectedCheckoutMethod);
    const gatewayMethod = isGatewayCheckoutMethod(selectedCheckoutMethod);

    if (paymentTransaction?.status === "pending") {
      if (
        gatewayMethod &&
        isGatewayPaymentMethod(payload.method, checkoutMethods) &&
        shouldBlockDuplicateGatewayAttempt(paymentTransaction.method, payload.method)
      ) {
        toast.error(t("pos.qrPending"));
        return;
      }
      try {
        await paymentExpire(paymentTransaction.id);
        setShowQrisModal(false);
        setQrisModalSuppressedTxId(paymentTransaction.id);
        setPendingGatewayPayments([]);
        useOrderPaymentHistoryStore.getState().refreshOrderAfterPaymentMutation(activeOutletId, paymentModalOrder.id);
      } catch (error) {
        toast.error(error instanceof ApiHttpError ? error.message : t("shared.failedCancelCheckout"));
        return;
      }
    }

    if (
      gatewayMethod &&
      isGatewayPaymentMethod(payload.method, checkoutMethods) &&
      paymentTransaction &&
      isTerminalGatewayStatus(paymentTransaction.status)
    ) {
      setSubmitting(true);
      try {
        const tx = await paymentRetry(paymentTransaction.id, {
          splitPayments:
            pendingGatewayPayments.length > 0
              ? splitPaymentsForGatewayCreate(pendingGatewayPayments)
              : undefined,
        });
        useOrderPaymentHistoryStore.getState().refreshOrderAfterPaymentMutation(activeOutletId, paymentModalOrder.id);
        if (payload.method === "qris" && tx.qrString) {
          setQrisModalSuppressedTxId(null);
          setShowQrisModal(true);
          toast.success(t("pos.qrisReady"));
        } else {
          toast.success(t("pos.checkoutCreated"));
        }
      } catch (error) {
        toast.error(error instanceof ApiHttpError ? error.message : t("cashier.paymentFailed"));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const checkoutAmount =
      pendingGatewayPayments.length > 0
        ? pendingGatewayCheckoutTotal(pendingGatewayPayments)
        : amount;

    setSubmitting(true);
    try {
      if (cashMethod) {
        const cashBatch =
          pendingGatewayPayments.length > 0
            ? remapSettlementBatchMethod(pendingGatewayPayments, payload.method)
            : [payload];
        await addOrderPaymentsRemote(paymentModalOrder.id, cashBatch);
        setPendingGatewayPayments([]);
        toast.success(t("shared.paymentRecorded"));
        await loadOpenOrders();
        setSelectedOrderId(null);
        closePaymentModal();
        return;
      }

      if (manualQrisMethod) {
        setShowStaticQrisModal(true);
        toast.message(t("pos.showQris"), {
          description: t("pos.verifyTransfer"),
        });
        return;
      }

      if (!gatewayMethod || !isGatewayPaymentMethod(payload.method, checkoutMethods)) {
        toast.error(t("shared.unsupportedPayment"));
        return;
      }

      setGatewayOrderId(paymentModalOrder.id);
      if (pendingGatewayPayments.length === 0) {
        setPendingGatewayPayments([payload]);
      }
      const gatewayBatch =
        pendingGatewayPayments.length > 0
          ? remapSettlementBatchMethod(pendingGatewayPayments, payload.method)
          : [payload];
      const tx = await paymentCreateTransaction({
        orderId: paymentModalOrder.id,
        outletId: activeOutletId,
        method: payload.method,
        amount: checkoutAmount,
        splitPayments:
          gatewayBatch.length > 1 || pendingGatewayPayments.length > 0
            ? splitPaymentsForGatewayCreate(gatewayBatch)
            : undefined,
      });
      useOrderPaymentHistoryStore.getState().refreshOrderAfterPaymentMutation(activeOutletId, paymentModalOrder.id);
      paymentPollTransactionStatus(tx.id);
      if (payload.method === "qris" && tx.qrString) {
        setQrisModalSuppressedTxId(null);
        setShowQrisModal(true);
        toast.success(t("pos.qrisReady"));
      } else {
        toast.success(t("pos.checkoutCreated"));
      }
    } catch (error) {
      toast.error(error instanceof ApiHttpError ? error.message : t("cashier.paymentFailed"));
      setPendingGatewayPayments([]);
      setGatewayOrderId(null);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmCashierStaticQrisPayment = async () => {
    if (!paymentModalOrder || !selectedCheckoutMethod || submitting) return;
    const apiMethod = apiMethodFromCheckoutMethod(selectedCheckoutMethod);
    setSubmitting(true);
    try {
      if (paymentTransaction?.status === "pending") {
        await paymentExpire(paymentTransaction.id);
        setQrisModalSuppressedTxId(paymentTransaction.id);
      }
      const checkoutAmount =
        pendingGatewayPayments.length > 0
          ? pendingGatewayCheckoutTotal(pendingGatewayPayments)
          : paymentModalOrder.balanceDue;
      const batch =
        pendingGatewayPayments.length > 0
          ? remapSettlementBatchMethod(pendingGatewayPayments, apiMethod)
          : [
              buildBalancePaymentPayload(paymentModalOrder, apiMethod, checkoutAmount),
            ];
      await addOrderPaymentsRemote(paymentModalOrder.id, batch);
      setPendingGatewayPayments([]);
      setShowStaticQrisModal(false);
      if (typeof activeOutletId === "number") {
        useOrderPaymentHistoryStore.getState().refreshOrderAfterPaymentMutation(activeOutletId, paymentModalOrder.id);
      }
      toast.success(t("pos.staticQrisRecorded"));
      await loadOpenOrders();
      setSelectedOrderId(null);
      closePaymentModal();
    } catch (error) {
      toast.error(error instanceof ApiHttpError ? error.message : t("cashier.paymentFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedApiMethod = selectedCheckoutMethod
    ? apiMethodFromCheckoutMethod(selectedCheckoutMethod)
    : null;
  const gatewayCheckoutPending =
    Boolean(
      selectedApiMethod &&
        isGatewayPaymentMethod(selectedApiMethod, checkoutMethods) &&
        paymentTransaction?.status === "pending" &&
        shouldBlockDuplicateGatewayAttempt(paymentTransaction.method, selectedApiMethod),
    );

  const abandonCashierPendingGateway = async () => {
    if (!paymentTransaction || paymentTransaction.status !== "pending") {
      setShowQrisModal(false);
      return;
    }
    await paymentExpire(paymentTransaction.id);
    setShowQrisModal(false);
    setQrisModalSuppressedTxId(paymentTransaction.id);
    if (paymentModalOrder && typeof activeOutletId === "number") {
      useOrderPaymentHistoryStore.getState().refreshOrderAfterPaymentMutation(activeOutletId, paymentModalOrder.id);
    }
  };

  const handleCashierSelectPaymentMethod = (code: string) => {
    const nextMethod = findCheckoutMethod(checkoutMethods, code);
    const nextApiMethod = nextMethod ? apiMethodFromCheckoutMethod(nextMethod) : toApiPaymentMethod(code);
    const pending = paymentTransaction?.status === "pending" ? paymentTransaction : null;
    if (pending && !shouldBlockDuplicateGatewayAttempt(pending.method, nextApiMethod)) {
      void (async () => {
        try {
          await abandonCashierPendingGateway();
          setSelectedCheckoutCode(code);
          setShowStaticQrisModal(false);
          toast.success(t("shared.previousCheckoutCancelled"));
        } catch (error) {
          toast.error(error instanceof ApiHttpError ? error.message : t("shared.failedSwitchMethod"));
        }
      })();
      return;
    }
    setSelectedCheckoutCode(code);
    setShowStaticQrisModal(false);
  };

  const handleCashierChangePaymentMethodFromQris = () => {
    void (async () => {
      try {
        await abandonCashierPendingGateway();
        setSelectedCheckoutCode(null);
        setShowStaticQrisModal(false);
        toast.success(t("shared.chooseCashMethod"));
      } catch (error) {
        toast.error(error instanceof ApiHttpError ? error.message : t("shared.failedChangeMethod"));
      }
    })();
  };
  const canRetryGatewayCheckout =
    Boolean(
      selectedApiMethod &&
        isGatewayPaymentMethod(selectedApiMethod, checkoutMethods) &&
        paymentTransaction &&
        isTerminalGatewayStatus(paymentTransaction.status),
    );
  const primaryCashierPaymentLabel =
    canRetryGatewayCheckout && selectedApiMethod
      ? gatewayRetryLabel(selectedApiMethod)
      : submitting || paymentIsSubmitting
        ? t("shared.processingPayment")
        : t("shared.completePayment");

  const handleCashierGatewayRetry = async (transactionId: string) => {
    const tx = await paymentRetry(transactionId, {
      splitPayments:
        pendingGatewayPayments.length > 0
          ? splitPaymentsForGatewayCreate(pendingGatewayPayments)
          : undefined,
    });
    if (paymentModalOrder && typeof activeOutletId === "number") {
      useOrderPaymentHistoryStore.getState().refreshOrderAfterPaymentMutation(activeOutletId, paymentModalOrder.id);
    }
    if (tx.method === "qris" && tx.qrString) {
      setQrisModalSuppressedTxId(null);
      setShowQrisModal(true);
    }
    return tx;
  };

  const paymentCheckoutAmount =
    pendingGatewayPayments.length > 0
      ? pendingGatewayCheckoutTotal(pendingGatewayPayments)
      : paymentTransaction?.amount ?? paymentModalOrder?.balanceDue ?? 0;
  const splitCheckoutActive = pendingGatewayPayments.length > 0;

  const settleOpenBillOrders = async (mode: "selected" | "all") => {
    if (!openBill || openBill.orders.length === 0) return;
    const targetOrderIds =
      mode === "all"
        ? openBill.orders.map((o) => o.id)
        : openBill.orders.filter((o) => selectedOpenBillOrderIds.has(o.id)).map((o) => o.id);
    if (targetOrderIds.length === 0) {
      toast.error(t("cashier.openBillSelect"));
      return;
    }

    const toPay = openBill.orders.filter((o) => targetOrderIds.includes(o.id) && o.remainingPayable > 0);
    if (toPay.length === 0) {
      toast.message(t("cashier.openBillSettled"));
      return;
    }

    setOpenBillSettling(true);
    try {
      for (const order of toPay) {
        await addOrderPaymentsRemote(String(order.id), [
          {
            method: "cash",
            amount: order.remainingPayable,
            paidAt: new Date().toISOString(),
          },
        ]);
      }
      toast.success(t("cashier.openBillRecorded"));
      await loadOpenOrders();
      await loadOpenBill();
    } catch (error) {
      toast.error(error instanceof ApiHttpError ? error.message : t("cashier.openBillFailed"));
    } finally {
      setOpenBillSettling(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {(!activeOutletId || activeOutletId < 1) && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-amber-900 dark:text-amber-100">
          {t("cashier.selectOutletBridge")}
        </div>
      )}
      <PosSessionPanel outletId={activeOutletId} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("cashier.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("cashier.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadOpenOrders()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm hover:bg-muted"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("cashier.refresh")}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground">
              {t("cashier.noOpenOrders")}
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
                    ? t("cashier.tableLabel", { name: order.tableName?.trim() || order.tableNumber })
                    : t("shared.noTable")}{" "}
                  {order.customerName ? `• ${order.customerName}` : ""}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <div className="space-y-2 border-b border-border/60 pb-3">
            <p className="text-xs text-muted-foreground">{t("cashier.openBillTitle")}</p>
            <select
              value={selectedTableId ?? ""}
              onChange={(e) => setSelectedTableId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">{t("cashier.selectTable")}</option>
              {openBillTableOptions.map((table) => (
                <option key={`${table.outletId}-${table.tableId}`} value={table.tableId}>
                  {table.label}
                </option>
              ))}
            </select>
            {openBillLoading ? (
              <p className="text-xs text-muted-foreground">{t("cashier.loadingOpenBill")}</p>
            ) : openBill ? (
              <div className="space-y-2 rounded-xl border border-border/70 p-3 bg-background/70">
                <p className="text-sm font-semibold text-foreground">
                  {t("cashier.tableOrders", { name: openBill.table.name, n: openBill.orderCount })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("cashier.subtotalTaxService", { subtotal: formatRp(openBill.subtotal), tax: formatRp(openBill.tax), service: formatRp(openBill.service) })}
                </p>
                <p className="text-sm font-bold text-primary">{t("cashier.remaining")} {formatRp(openBill.remainingPayable)}</p>
                <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                  {openBill.orders.map((order) => (
                    <label key={order.id} className="flex items-center gap-2 rounded-lg border border-border/50 px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={selectedOpenBillOrderIds.has(order.id)}
                        onChange={(e) =>
                          setSelectedOpenBillOrderIds((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(order.id);
                            else next.delete(order.id);
                            return next;
                          })
                        }
                      />
                      <span className="text-xs text-foreground flex-1 min-w-0">
                        <span className="block truncate font-medium">{order.code}</span>
                        <span className="mt-0.5 inline-flex" data-testid="open-bill-source-badge">
                          <OrderSourceBadge source={order.orderSource ?? null} />
                        </span>
                      </span>
                      <span className="text-xs font-semibold text-foreground">{formatRp(order.remainingPayable)}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedOrderId(String(order.id))}
                        className="text-[11px] px-2 py-0.5 rounded border border-border hover:bg-muted"
                      >
                        {t("cashier.open")}
                      </button>
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void settleOpenBillOrders("selected")}
                    disabled={openBillSettling}
                    className="py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted disabled:opacity-50"
                  >
                    {t("cashier.paySelected")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void settleOpenBillOrders("all")}
                    disabled={openBillSettling}
                    className="py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {t("cashier.payFullTable")}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t("cashier.noOpenBill")}</p>
            )}
          </div>
          {!selectedOrder ? (
            <p className="text-sm text-muted-foreground">{t("cashier.selectOrder")}</p>
          ) : (
            <>
              <div>
                <p className="text-xs text-muted-foreground">{t("cashier.order")}</p>
                <p className="font-semibold text-foreground">{selectedOrder.code}</p>
                <p className="text-xs text-muted-foreground">
                  {t("cashier.totalPaidLine", { total: formatRp(selectedOrder.total), paid: formatRp(selectedOrder.paidTotal) })}
                </p>
                <p className="text-sm font-bold text-primary mt-1">
                  {t("cashier.balanceDueLabel")} {formatRp(selectedOrder.balanceDue)}
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
                  {t("cashier.payBalance")}
                </button>
                <button
                  type="button"
                  onClick={openSplitFromPanel}
                  disabled={selectedOrder.balanceDue <= 0}
                  className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors flex items-center justify-center gap-2"
                >
                  <SplitSquareHorizontal className="h-4 w-4" />
                  {t("shared.splitBill")}
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
              className="bg-card rounded-2xl p-4 sm:p-6 w-full max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto pos-shadow-md"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-foreground">{t("shared.payment")}</h3>
                <button type="button" onClick={() => closePaymentModal()} className="p-1 rounded-lg hover:bg-muted">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground">{t("shared.balanceDue")}</p>
                <p className="text-3xl font-bold text-foreground mt-1">{formatRp(paymentCheckoutAmount)}</p>
                {splitCheckoutActive ? (
                  <p className="text-xs text-muted-foreground mt-1">{t("shared.splitGatewayPortion")}</p>
                ) : null}
              </div>
              <PaymentMethodTileGrid
                className="mb-4"
                tiles={checkoutTiles}
                selectedCode={selectedCheckoutCode}
                onSelect={handleCashierSelectPaymentMethod}
                disabled={submitting || paymentIsSubmitting}
              />
              <button
                type="button"
                onClick={initCashierSplitFromPaymentModal}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all mb-4"
              >
                <SplitSquareHorizontal className="h-4 w-4" /> {t("shared.splitBill")}
              </button>
              <button
                type="button"
                onClick={() => void completeCashierPayment()}
                disabled={!selectedCheckoutCode || submitting || paymentIsSubmitting || gatewayCheckoutPending}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity mb-3"
              >
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />{" "}
                  {submitting || paymentIsSubmitting ? t("shared.processing") : primaryCashierPaymentLabel}
                </span>
              </button>
              {paymentTransaction && selectedCheckoutMethod && !isCashCheckoutMethod(selectedCheckoutMethod) && (
                <div className="mb-3 rounded-xl border border-border p-3 space-y-2 text-xs">
                  <p className="font-semibold text-foreground">{t("shared.onlineCheckout")}</p>
                  <p className="text-muted-foreground">
                    {t("shared.statusColon")} <span className="font-medium text-foreground">{paymentTransaction.status}</span>
                  </p>
                  {paymentTransaction.status === "paid" && (
                    <p className="rounded-lg bg-success/10 px-2 py-1 text-success">
                      {t("shared.paymentRefreshing")}
                    </p>
                  )}
                  {paymentTransaction.status === "expired" && (
                    <p className="rounded-lg bg-destructive/10 px-2 py-1 text-destructive">
                      {t("shared.qrExpired")}
                    </p>
                  )}
                  {paymentTransaction.status === "failed" && (
                    <p className="rounded-lg bg-destructive/10 px-2 py-1 text-destructive">
                      {t("shared.qrFailed")}
                    </p>
                  )}
                  {paymentTransaction.status === "cancelled" && (
                    <p className="rounded-lg bg-muted px-2 py-1 text-muted-foreground">
                      {t("shared.qrCancelled")}
                    </p>
                  )}
                  {paymentTransaction.checkoutUrl && (
                    <a href={paymentTransaction.checkoutUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                      {t("shared.openCheckout")}
                    </a>
                  )}
                  {paymentTransaction.deeplinkUrl && (
                    <a href={paymentTransaction.deeplinkUrl} target="_blank" rel="noreferrer" className="block text-primary underline">
                      {t("shared.openPaymentApp")}
                    </a>
                  )}
                  {paymentTransaction.qrString && (
                    <pre className="rounded bg-muted p-2 whitespace-pre-wrap break-all">{paymentTransaction.qrString}</pre>
                  )}
                  {paymentTransaction.vaNumber && (
                    <p className="text-muted-foreground">
                      {t("shared.va")} <span className="font-medium text-foreground">{paymentTransaction.vaNumber}</span>
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    {t("shared.expiresInColon")} <span className="font-medium text-foreground">{paymentExpiryCountdown}s</span>
                  </p>
                  {paymentError && <p className="text-destructive">{paymentError}</p>}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCashierGatewayRetry(paymentTransaction.id)}
                      disabled={paymentIsSubmitting}
                      className="rounded-lg border border-border px-2 py-1"
                    >
                      {gatewayRetryLabel(paymentTransaction.method)}
                    </button>
                    {showReconcile ? (
                      <button
                        type="button"
                        onClick={() => void paymentReconcile(paymentTransaction.id)}
                        disabled={paymentIsSubmitting}
                        className="rounded-lg border border-border px-2 py-1"
                      >
                        {t("shared.reconcile")}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void paymentExpire(paymentTransaction.id)}
                      disabled={paymentIsSubmitting}
                      className="rounded-lg border border-border px-2 py-1"
                    >
                      {t("shared.expire")}
                    </button>
                    {allowSandboxSimulation && (
                      <button
                        type="button"
                        onClick={() => void paymentSimulateSandboxPaid(paymentTransaction.id)}
                        disabled={paymentIsSubmitting}
                        className="rounded-lg border border-amber-500/30 px-2 py-1 text-amber-700 dark:text-amber-300"
                      >
                        {t("shared.simulateSandbox")}
                      </button>
                    )}
                  </div>
                </div>
              )}
              <PosPrintStatusBar outletId={typeof activeOutletId === "number" ? activeOutletId : null} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <QrisPaymentModal
        open={showPaymentModal && showQrisModal && !!paymentTransaction?.qrString}
        qrString={paymentTransaction?.qrString ?? ""}
        amount={paymentTransaction?.amount ?? paymentCheckoutAmount}
        expirySeconds={paymentExpiryCountdown}
        status={paymentTransaction?.status ?? "pending"}
        orderLabel={paymentModalOrder?.code}
        outletLabel={typeof activeOutletId === "number" ? t("shared.outlet", { id: activeOutletId }) : undefined}
        isSubmitting={paymentIsSubmitting}
        error={paymentError}
        onRequestClose={() => {
          setShowQrisModal(false);
          if (paymentTransaction?.status === "pending") {
            setQrisModalSuppressedTxId(paymentTransaction.id);
          }
        }}
        onChangePaymentMethod={handleCashierChangePaymentMethodFromQris}
        checkoutHint={
          splitCheckoutActive
            ? t("shared.qrisSplitCheckoutHint")
            : t("shared.qrisCheckoutHint")
        }
        onRetry={() => void (paymentTransaction ? handleCashierGatewayRetry(paymentTransaction.id) : Promise.resolve())}
        onReconcile={() => void (paymentTransaction ? paymentReconcile(paymentTransaction.id) : Promise.resolve())}
        showReconcile={showReconcile}
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
            toast.success(t("shared.providerSimDispatched"));
          } catch (error) {
            toast.error(error instanceof ApiHttpError ? error.message : t("shared.providerSimFailed"));
          } finally {
            setProviderSimulating(false);
          }
        })()}
      />
      <StaticQrisPaymentModal
        open={showPaymentModal && showStaticQrisModal}
        imageUrl={String(selectedCheckoutMethod?.settings?.qr_image_url ?? "")}
        instructions={String(selectedCheckoutMethod?.settings?.instructions ?? "")}
        amount={paymentCheckoutAmount}
        orderLabel={paymentModalOrder?.code}
        isSubmitting={submitting}
        onRequestClose={() => setShowStaticQrisModal(false)}
        onChangePaymentMethod={() => {
          setShowStaticQrisModal(false);
          setSelectedCheckoutCode(null);
        }}
        onConfirmPaid={() => void confirmCashierStaticQrisPayment()}
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
                <h3 className="text-lg font-bold text-foreground">{t("shared.splitBill")}</h3>
                <button type="button" onClick={() => closeSplitModal()} className="p-1 rounded-lg hover:bg-muted">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              <div className="text-center mb-5">
                <p className="text-sm text-muted-foreground">{t("shared.balanceDue")}</p>
                <p className="text-2xl font-bold text-foreground">{formatRp(splitSourceOrder.balanceDue)}</p>
                {!splitAllowsByItem && (
                  <p className="text-xs text-muted-foreground mt-2">{t("cashier.equalSplitOnly")}</p>
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
                  {t("shared.equalSplit")}
                </button>
                <button
                  type="button"
                  disabled={!splitAllowsByItem}
                  title={!splitAllowsByItem ? t("shared.splitByItemTooltip") : undefined}
                  onClick={() => {
                    setSplitMethod("by-item");
                    buildItemSplit(splitCount);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                    splitMethod === "by-item" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  } ${!splitAllowsByItem ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {t("shared.splitByItem")}
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
                  <p className="text-xs text-muted-foreground">{t("shared.people")}</p>
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
                    {t("shared.splitByItemHint")}
                  </p>
                  {!byItemAllocationComplete && (
                    <p className="text-xs text-amber-900 dark:text-amber-100 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
                      {t("shared.assignAllItemsWarning")}
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
                            {t("shared.paidWithMethods", { methods: methodSummary })}
                          </span>
                        ) : hasDraftPayment ? (
                          <span className="px-3 py-1 rounded-lg text-xs font-medium bg-muted text-foreground shrink-0">
                            {t("shared.recordedWithMethods", { amount: formatRp(paid), methods: methodSummary })}
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
                            {hasDraftPayment ? t("shared.addMore") : t("shared.addPayment")}
                          </button>
                        )}
                        {hasDraftPayment && (
                          <button
                            type="button"
                            title={t("shared.clearDraftPayment")}
                            onClick={() => undoSplitPersonDraftPayment(i)}
                            disabled={submitting}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 disabled:opacity-40"
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                            {t("shared.change")}
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
                                {t("shared.payFor", { label: person.label, amount: formatRp(person.totalDue) })}
                              </p>
                              <PaymentMethodTileGrid
                                className="mb-3"
                                variant="compact"
                                tiles={checkoutTiles}
                                selectedCode={
                                  checkoutTiles.find((t) => t.method.label === splitPayMethod)?.method
                                    .paymentMethodCode ?? null
                                }
                                onSelect={(code) => {
                                  const tile = checkoutTiles.find((t) => t.method.paymentMethodCode === code);
                                  setSplitPayMethod(tile?.method.label ?? null);
                                }}
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPayingPersonIdx(null)}
                                  className="flex-1 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-medium"
                                >
                                  {t("shared.cancel")}
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSplitPersonPay}
                                  disabled={!splitPayMethod}
                                  className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40"
                                >
                                  {t("shared.confirmPayment")}
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
                  ? t("shared.saving")
                  : !byItemAllocationComplete && splitMethod === "by-item"
                    ? t("shared.assignAllItemUnits")
                    : allSplitPaid
                      ? t("shared.completeSplitRecord")
                      : t("shared.paidProgress", { paid: splitPersons.filter((p) => p.payments.reduce((s, pm) => s + pm.amount, 0) >= p.totalDue && p.totalDue > 0).length, total: splitPersons.length })}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
