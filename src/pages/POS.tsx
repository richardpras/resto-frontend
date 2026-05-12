import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Plus, Minus, Trash2, X, CreditCard, Banknote, QrCode, Smartphone,
  SplitSquareHorizontal, Printer, MessageSquare, CheckCircle2, ChefHat, Users, User, Phone, Tag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { deriveRuntimeFloorTables, useOrderStore, type Order, type SplitPerson } from "@/stores/orderStore";
import { usePromotionStore, type AppliedPromo } from "@/stores/promotionStore";
import { useMemberStore, type Member } from "@/stores/memberStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useLoyaltyStore } from "@/stores/loyaltyStore";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { ApiHttpError, getApiAccessToken } from "@/lib/api-integration/client";
import {
  listMenuItems,
  type CreateOrderPayload,
  type OrderPaymentPayload,
} from "@/lib/api-integration/endpoints";
import { listFloorTables } from "@/lib/api-integration/tableEndpoints";
import { useOutletStore } from "@/stores/outletStore";
import { usePosSessionStore } from "@/stores/posSessionStore";
import { usePaymentStore } from "@/stores/paymentStore";
import { useAuthStore } from "@/stores/authStore";
import { useOrderPaymentHistoryStore } from "@/stores/orderPaymentHistoryStore";
import { getUserCapabilities } from "@/domain/accessControl";
import { ConnectivitySyncRibbon } from "@/components/ConnectivitySyncRibbon";
import { PosMenuGridSkeleton } from "@/components/skeletons/card/PosMenuGridSkeleton";
import { SkeletonBusyRegion } from "@/components/skeletons/SkeletonBusyRegion";
import { OrderPaymentHistoryPanel } from "@/components/pos/OrderPaymentHistoryPanel";
import { PosOrderRecoveryPanel } from "@/components/pos/PosOrderRecoveryPanel";
import { QrisPaymentModal } from "@/components/payments/QrisPaymentModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toApiPaymentMethod, isGatewayPaymentMethod } from "@/features/pos/paymentMethodUtils";
import { buildSplitPaymentsPayload } from "@/features/pos/buildSplitPaymentsPayload";
import { byItemFullyAllocated, maxQtyForPersonOnLine } from "@/features/pos/splitBillAssignmentUtils";
import { applyByItemTotalDuesWithTaxScale } from "@/features/pos/splitBillProportionalDues";

type MenuItem = {
  id: string; name: string; price: number; category: string; emoji: string;
};
type CartItem = MenuItem & { qty: number; notes: string };

/** Matches template/dev setup; override with `VITE_API_TENANT_ID` in web/.env */
const POS_TENANT_ID = Number(import.meta.env.VITE_API_TENANT_ID ?? 1) || 1;

function buildCartPayload(
  cart: CartItem[],
  subtotal: number,
  tax: number,
  total: number,
  discount: number,
  customerName: string,
  customerPhone: string,
  selectedTable: string,
): Pick<
  CreateOrderPayload,
  "items" | "subtotal" | "tax" | "total" | "customerName" | "customerPhone" | "tableId" | "discountAmount"
> {
  return {
    items: cart.map((c) => ({
      id: c.id,
      name: c.name,
      price: c.price,
      qty: c.qty,
      emoji: c.emoji,
      notes: c.notes || undefined,
    })),
    subtotal,
    tax,
    total,
    ...(discount > 0 ? { discountAmount: discount } : {}),
    ...(customerName.trim() ? { customerName: customerName.trim() } : {}),
    ...(customerPhone.trim() ? { customerPhone: customerPhone.trim() } : {}),
    ...(selectedTable && /^\d+$/.test(selectedTable.trim()) ? { tableId: Number(selectedTable.trim()) } : {}),
  };
}

const orderTypes = ["Dine-in", "Takeaway", "Online"];
const paymentMethods = [
  { label: "Cash", icon: Banknote },
  { label: "QRIS", icon: QrCode },
  { label: "E-Wallet", icon: Smartphone },
  { label: "Card", icon: CreditCard },
];

function formatRp(n: number) { return "Rp " + n.toLocaleString("id-ID"); }

function operationalChannelFromOrder(order: Order | null): string {
  if (!order) return "POS";
  if (order.source === "qr" || order.orderChannel === "qr") return "QR";
  if (order.orderChannel === "dine_in") return "POS · Dine-in";
  if (order.orderChannel === "takeaway") return "POS · Takeaway";
  return "POS";
}

export default function POS() {
  const authUser = useAuthStore((s) => s.user);
  const capabilities = useMemo(() => getUserCapabilities(authUser), [authUser]);
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const { tables, orders, updateTableStatus, replaceFloorTables } = useOrderStore();
  const createOrderRemote = useOrderStore((s) => s.createOrderRemote);
  const fetchOrderRemote = useOrderStore((s) => s.fetchOrder);
  const addOrderPaymentsRemote = useOrderStore((s) => s.addOrderPaymentsRemote);
  const { getBestPromo, getApplicablePromos } = usePromotionStore();
  const [activeCat, setActiveCat] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState("Dine-in");
  const [notesItem, setNotesItem] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const { members, fetchMembers } = useMemberStore();
  const membersLoading = useMemberStore((s) => s.loading);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [redeemPointsInput, setRedeemPointsInput] = useState("");
  const [giftCardInput, setGiftCardInput] = useState("");
  const [appliedPoints, setAppliedPoints] = useState(0);
  const [appliedGiftCard, setAppliedGiftCard] = useState(0);
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  // Modal states
  const [showPayment, setShowPayment] = useState(false);
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [showSplit, setShowSplit] = useState(false);
  const [showConfirmSent, setShowConfirmSent] = useState(false);
  const [showConfirmOrderDialog, setShowConfirmOrderDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [pendingGatewayPayments, setPendingGatewayPayments] = useState<OrderPaymentPayload[]>([]);
  const [showPromoList, setShowPromoList] = useState(false);
  const [manualPromo, setManualPromo] = useState<AppliedPromo | null>(null);

  const currentOpenOrder = useMemo(
    () => (currentOrderId ? orders.find((o) => o.id === currentOrderId) ?? null : null),
    [orders, currentOrderId],
  );

  // Split bill state
  const [splitPersons, setSplitPersons] = useState<SplitPerson[]>([]);
  const [splitMethod, setSplitMethod] = useState<"equal" | "by-item">("equal");
  const [splitCount, setSplitCount] = useState(2);
  const [payingPersonIdx, setPayingPersonIdx] = useState<number | null>(null);
  const [splitPayMethod, setSplitPayMethod] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fetchCurrentPosSession = usePosSessionStore((s) => s.fetchCurrent);
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
  const previousOutletIdRef = useRef<number | null>(null);
  const customers = useCustomerStore((s) => s.customers);
  const fetchCustomers = useCustomerStore((s) => s.fetchCustomers);
  const loyaltyBalances = useLoyaltyStore((s) => s.pointsBalanceByCustomer);
  const refreshLoyalty = useLoyaltyStore((s) => s.refreshForOutlet);
  const enqueueRedemption = useLoyaltyStore((s) => s.enqueueRedemption);
  const crmLazyFetchedRef = useRef<Record<number, boolean>>({});

  useEffect(() => {
    if (!capabilities.crm || !showMemberPicker) return;
    if (typeof activeOutletId !== "number" || activeOutletId < 1) return;
    if (crmLazyFetchedRef.current[activeOutletId]) return;
    crmLazyFetchedRef.current[activeOutletId] = true;
    void fetchMembers().catch((e) => {
      if (e instanceof ApiHttpError) toast.error(e.message);
    });
    void Promise.all([
      fetchCustomers({ outletId: activeOutletId, page: 1, perPage: 50 }),
      refreshLoyalty(activeOutletId),
    ]);
  }, [activeOutletId, capabilities.crm, fetchCustomers, fetchMembers, refreshLoyalty, showMemberPicker]);

  const { data: floorMasters } = useQuery({
    queryKey: ["floor-tables", activeOutletId ?? 0],
    queryFn: () => listFloorTables(activeOutletId!),
    enabled: typeof activeOutletId === "number" && activeOutletId >= 1 && Boolean(getApiAccessToken()),
  });

  useEffect(() => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1 || !getApiAccessToken()) {
      replaceFloorTables([]);
      return;
    }
    if (!floorMasters) return;
    replaceFloorTables(deriveRuntimeFloorTables(floorMasters, orders));
  }, [floorMasters, orders, activeOutletId, replaceFloorTables]);

  useEffect(() => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1 || !getApiAccessToken()) {
      return;
    }
    void fetchCurrentPosSession(activeOutletId).catch(() => {
      // POS session guard is non-blocking for current UI flow.
    });
  }, [activeOutletId, fetchCurrentPosSession]);

  useEffect(() => {
    if (showPayment) return;
    paymentResetAsync();
  }, [showPayment, paymentResetAsync]);

  useEffect(() => {
    if (!showPayment || !paymentTransaction) return;
    const isQris = (selectedPayment ?? "").toLowerCase() === "qris" || paymentTransaction.method === "qris";
    if (isQris && paymentTransaction.qrString) {
      setShowQrisModal(true);
    }
  }, [showPayment, paymentTransaction, selectedPayment]);

  // Prevent outlet context leaks (cart, split/payment modal state) across outlet switch.
  useEffect(() => {
    const nextOutletId = typeof activeOutletId === "number" && activeOutletId >= 1 ? activeOutletId : null;
    const previousOutletId = previousOutletIdRef.current;
    const outletContextChanged = previousOutletId !== nextOutletId;
    if (outletContextChanged) {
      useOrderPaymentHistoryStore.getState().resetForOutletContextChange();
    }
    const didOutletSwitch =
      previousOutletId !== null &&
      nextOutletId !== null &&
      previousOutletId !== nextOutletId;

    if (didOutletSwitch) {
      resetCart();
      setShowPayment(false);
      setShowSplit(false);
      setShowConfirmSent(false);
      setSelectedPayment(null);
      setCurrentOrderId(null);
      setPendingGatewayPayments([]);
      setPayingPersonIdx(null);
      setSplitPayMethod(null);
      paymentResetAsync();
    }
    previousOutletIdRef.current = nextOutletId;
  }, [activeOutletId, paymentResetAsync]);

  useEffect(() => {
    return () => {
      paymentResetAsync();
    };
  }, [paymentResetAsync]);

  const { data: menuApiItems = [], isLoading: menuLoading, isError: menuError, refetch: refetchMenu } = useQuery({
    queryKey: ["menu-items", POS_TENANT_ID, activeOutletId ?? 0],
    queryFn: () =>
      listMenuItems({
        tenantId: POS_TENANT_ID,
        perPage: 200,
        ...(typeof activeOutletId === "number" && activeOutletId >= 1 ? { outletId: activeOutletId } : {}),
      }),
    enabled: typeof activeOutletId === "number" && activeOutletId >= 1,
  });

  const menuItems: MenuItem[] = useMemo(() => {
    return menuApiItems
      .filter((m) => m.available !== false)
      .map((m) => ({
        id: String(m.id),
        name: m.name,
        price: m.price,
        category: m.category?.trim() ? m.category : "Uncategorized",
        emoji: m.emoji ?? "🍽️",
      }));
  }, [menuApiItems]);

  const categories = useMemo(() => {
    const set = new Set(menuItems.map((m) => m.category));
    return ["All", ...Array.from(set).sort()];
  }, [menuItems]);

  const filtered = menuItems.filter(
    (m) => (activeCat === "All" || m.category === activeCat) &&
      m.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) return prev.map((c) => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1, notes: "" }];
    });
  };
  const updateQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter((c) => c.qty > 0));
  };
  const updateNotes = (id: string, notes: string) => {
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, notes } : c));
  };

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  // Promo logic
  const cartForPromo = cart.map((c) => ({ id: c.id, name: c.name, price: c.price, qty: c.qty }));
  const autoPromo = getBestPromo(cartForPromo, subtotal);
  const appliedPromo = manualPromo || autoPromo;
  const discount = appliedPromo?.discountAmount || 0;
  const applicablePromos = getApplicablePromos(cartForPromo, subtotal);
  const tax = Math.round((subtotal - discount) * 0.1);
  const baseTotal = subtotal - discount + tax;
  const total = Math.max(0, baseTotal - appliedGiftCard - Math.round(appliedPoints / 10));
  const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);
  const selectedCustomer = customers.find(
    (customer) =>
      selectedMember &&
      (customer.phone === selectedMember.phone || customer.name.toLowerCase() === selectedMember.name.toLowerCase()),
  );
  const availablePoints = selectedCustomer ? (loyaltyBalances[selectedCustomer.id] ?? selectedCustomer.pointsBalance ?? 0) : 0;
  const availableGiftCard = selectedCustomer ? selectedCustomer.giftCardBalance ?? 0 : 0;

  const availableTables = tables.filter((t) => t.status === "available");
  const selectedTableLabel =
    selectedTable && tables.length > 0
      ? tables.find((t) => String(t.id) === String(selectedTable))?.name ?? `Table #${selectedTable}`
      : null;

  const outletOrderFields = useMemo((): Pick<CreateOrderPayload, "outletId"> => {
    if (typeof activeOutletId === "number" && activeOutletId >= 1) return { outletId: activeOutletId };
    return {};
  }, [activeOutletId]);

  const orderContextReady = typeof activeOutletId === "number" && activeOutletId >= 1;

  function requireOutletOrderContext(): boolean {
    if (typeof activeOutletId !== "number" || activeOutletId < 1) {
      toast.error("Select an outlet in the header.");
      return false;
    }
    return true;
  }

  function toastApiError(e: unknown): void {
    if (e instanceof ApiHttpError) {
      toast.error(e.message);
      return;
    }
    toast.error("Something went wrong. Try again.");
  }

  // FLOW 1: Confirm Order → Send to Kitchen (single POST: confirmed + unpaid → kitchen ticket)
  const handleConfirmOrder = async () => {
    if (cart.length === 0 || submitting) return;
    if (!requireOutletOrderContext()) return;
    setSubmitting(true);
    try {
      const code = "POS-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const payload: CreateOrderPayload = {
        tenantId: POS_TENANT_ID,
        ...outletOrderFields,
        code,
        source: "pos",
        orderType,
        status: "confirmed",
        paymentStatus: "unpaid",
        payments: [],
        confirmedAt: new Date().toISOString(),
        ...buildCartPayload(cart, subtotal, tax, total, discount, customerName, customerPhone, selectedTable),
      };
      const storedOrder = await createOrderRemote(payload);
      if (selectedTable) {
        updateTableStatus(selectedTable, "occupied", storedOrder.id);
      }
      setCurrentOrderId(storedOrder.id);
      resetCart();
      setShowConfirmSent(true);
      toast.success(`Order ${storedOrder.code} sent to kitchen!`, { icon: "🍳" });
    } catch (e) {
      toastApiError(e);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmSendToKitchenFromDialog = async () => {
    await handleConfirmOrder();
    setShowConfirmOrderDialog(false);
  };

  // FLOW 2: Pay Now (Takeaway/Quick)
  const handlePayNow = () => {
    if (cart.length === 0) return;
    setShowPayment(true);
  };

  const completeDirectPayment = async () => {
    if (!selectedPayment || submitting) return;
    if (!requireOutletOrderContext()) return;
    setSubmitting(true);
    try {
      const code = "POS-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const payload: CreateOrderPayload = {
        tenantId: POS_TENANT_ID,
        ...outletOrderFields,
        code,
        source: "pos",
        orderType,
        status: "confirmed",
        paymentStatus: selectedPayment === "Cash" ? "paid" : "unpaid",
        payments: selectedPayment === "Cash" ? [
          {
            method: toApiPaymentMethod(selectedPayment),
            amount: total,
            paidAt: new Date().toISOString(),
          },
        ] : [],
        confirmedAt: new Date().toISOString(),
        ...buildCartPayload(cart, subtotal, tax, total, discount, customerName, customerPhone, selectedTable),
      };
      const storedOrder = await createOrderRemote(payload);
      if (selectedTable) {
        updateTableStatus(selectedTable, "occupied", storedOrder.id);
      }
      setCurrentOrderId(storedOrder.id);
      if (selectedPayment === "Cash") {
        if (selectedCustomer && appliedPoints > 0) {
          await enqueueRedemption({
            customerId: selectedCustomer.id,
            pointsUsed: appliedPoints,
            amountValue: Math.round(appliedPoints / 10),
            replayFingerprint: `pos-${storedOrder.id}-${selectedCustomer.id}-${appliedPoints}`,
          });
        }
        resetCart();
        setShowPayment(false);
        setSelectedPayment(null);
        setPendingGatewayPayments([]);
        toast.success(`Order ${storedOrder.code} paid & sent to kitchen!`, { icon: "✅" });
        return;
      }
      const gatewayPayment: OrderPaymentPayload = {
        method: toApiPaymentMethod(selectedPayment),
        amount: total,
        paidAt: new Date().toISOString(),
      };
      const tx = await paymentCreateTransaction({
        orderId: storedOrder.id,
        outletId: activeOutletId ?? undefined,
        method: gatewayPayment.method,
        amount: total,
      });
      setPendingGatewayPayments([gatewayPayment]);
      paymentPollTransactionStatus(tx.id);
      if (gatewayPayment.method === "qris" && tx.qrString) {
        setShowQrisModal(true);
        toast.success("QRIS ready. Ask customer to scan the QR.");
      } else {
        toast.success("Payment checkout created. Ask customer to complete payment.");
      }
    } catch (e) {
      toastApiError(e);
    } finally {
      setSubmitting(false);
    }
  };

  const resetCart = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setSelectedTable("");
    setManualPromo(null);
    setAppliedPoints(0);
    setAppliedGiftCard(0);
    setRedeemPointsInput("");
    setGiftCardInput("");
  };

  const applyPointsRedemption = () => {
    if (!selectedCustomer) {
      toast.error("Select a member linked to CRM customer first.");
      return;
    }
    const requested = Math.max(0, Number(redeemPointsInput || 0));
    const capped = Math.min(requested, availablePoints);
    setAppliedPoints(capped);
  };

  const applyGiftCardRedemption = () => {
    if (!selectedCustomer) {
      toast.error("Select a member linked to CRM customer first.");
      return;
    }
    const requested = Math.max(0, Number(giftCardInput || 0));
    const capped = Math.min(requested, availableGiftCard, baseTotal);
    setAppliedGiftCard(capped);
  };

  // Split bill helpers
  const initSplitBill = () => {
    setShowPayment(false);
    setShowSplit(true);
    setSplitMethod("equal");
    setSplitCount(2);
    buildEqualSplit(2);
  };

  const buildEqualSplit = (count: number) => {
    const perPerson = Math.ceil(total / count);
    setSplitPersons(
      Array.from({ length: count }, (_, i) => ({
        label: `Person ${i + 1}`,
        items: [],
        payments: [],
        totalDue: i === count - 1 ? total - perPerson * (count - 1) : perPerson,
      }))
    );
  };

  const buildItemSplit = (count: number) => {
    setSplitPersons(
      Array.from({ length: count }, (_, i) => ({
        label: `Person ${i + 1}`,
        items: [],
        payments: [],
        totalDue: 0,
      }))
    );
  };

  const adjustPersonLineQty = (personIdx: number, itemId: string, delta: number) => {
    const line = cart.find((c) => c.id === itemId);
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

      const lines = cart.map((l) => ({ id: l.id, price: l.price, qty: l.qty }));
      const full = byItemFullyAllocated(
        updatedPeople,
        lines.map((l) => ({ id: l.id, qty: l.qty })),
      );
      return applyByItemTotalDuesWithTaxScale(updatedPeople, lines, total, full);
    });
  };

  const allSplitPaid = splitPersons.every((p) => {
    const paid = p.payments.reduce((s, pm) => s + pm.amount, 0);
    return paid >= p.totalDue;
  });

  const byItemAllocationComplete = useMemo(() => {
    if (splitMethod !== "by-item") return true;
    return byItemFullyAllocated(splitPersons, cart.map((l) => ({ id: l.id, qty: l.qty })));
  }, [splitMethod, splitPersons, cart]);

  const completeSplitOrder = async () => {
    if (submitting || splitPersons.length === 0) return;
    if (!requireOutletOrderContext()) return;
    if (!allSplitPaid) return;
    if (!byItemAllocationComplete) {
      toast.error("Assign every unit of each line across people before completing.");
      return;
    }
    const draftPaymentSum = splitPersons.reduce(
      (s, p) => s + p.payments.reduce((t, pm) => t + pm.amount, 0),
      0,
    );
    if (Math.abs(draftPaymentSum - total) > 0.02) {
      toast.error(
        "Split payment drafts do not match the order total. Use Change on a person row to clear duplicate payments, then confirm again.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const code = "POS-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const created = await createOrderRemote({
        tenantId: POS_TENANT_ID,
        ...outletOrderFields,
        code,
        source: "pos",
        orderType,
        status: "confirmed",
        paymentStatus: "unpaid",
        payments: [],
        confirmedAt: new Date().toISOString(),
        splitBill: { method: splitMethod === "equal" ? "equal" : "by-item", persons: splitPersons },
        ...buildCartPayload(cart, subtotal, tax, total, discount, customerName, customerPhone, selectedTable),
      });
      const fresh = await fetchOrderRemote(created.id);
      const batch = buildSplitPaymentsPayload(fresh, splitPersons, splitMethod, cart);
      const immediatePayments = batch.filter((payment) => !isGatewayPaymentMethod(payment.method));
      const gatewayPayments = batch.filter((payment) => isGatewayPaymentMethod(payment.method));
      const paidOrder = immediatePayments.length > 0
        ? await addOrderPaymentsRemote(created.id, immediatePayments)
        : fresh;
      const totalPaid = paidOrder.payments.reduce((s, p) => s + p.amount, 0);
      if (selectedTable) {
        updateTableStatus(selectedTable, totalPaid >= total && gatewayPayments.length === 0 ? "available" : "waiting-payment", created.id);
      }
      if (gatewayPayments.length > 0) {
        const gatewayTotal = gatewayPayments.reduce((sum, payment) => sum + payment.amount, 0);
        const tx = await paymentCreateTransaction({
          orderId: created.id,
          outletId: activeOutletId ?? undefined,
          method: gatewayPayments.length === 1 ? gatewayPayments[0].method : "mixed",
          amount: gatewayTotal,
          splitPayments: gatewayPayments,
        });
        setCurrentOrderId(created.id);
        setPendingGatewayPayments(gatewayPayments);
        paymentPollTransactionStatus(tx.id);
        setShowSplit(false);
        setShowPayment(true);
        toast.success("Split bill saved. Complete the gateway checkout to finish payment.", { icon: "💰" });
        return;
      }
      resetCart();
      setShowSplit(false);
      toast.success("Split bill order saved!", { icon: "💰" });
    } catch (e) {
      toastApiError(e);
    } finally {
      setSubmitting(false);
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
      toast.success(`${recorded.label} paid ${formatRp(recorded.amount)} via ${method}`);
    }
  };

  useEffect(() => {
    if (!showPayment || !paymentTransaction || paymentTransaction.status !== "paid") return;
    if (!currentOrderId || pendingGatewayPayments.length === 0) return;
    void (async () => {
      const paymentsToCommit = pendingGatewayPayments;
      setPendingGatewayPayments([]);
      try {
        await addOrderPaymentsRemote(currentOrderId, paymentsToCommit);
        if (selectedCustomer && appliedPoints > 0) {
          await enqueueRedemption({
            customerId: selectedCustomer.id,
            pointsUsed: appliedPoints,
            amountValue: Math.round(appliedPoints / 10),
            replayFingerprint: `pos-${currentOrderId}-${selectedCustomer.id}-${appliedPoints}`,
          });
        }
        resetCart();
        setShowPayment(false);
        setShowSplit(false);
        setSelectedPayment(null);
        toast.success("Payment completed.");
      } catch (error) {
        setPendingGatewayPayments(paymentsToCommit);
        toastApiError(error);
      }
    })();
  }, [showPayment, paymentTransaction, currentOrderId, pendingGatewayPayments, addOrderPaymentsRemote, selectedCustomer, appliedPoints, enqueueRedemption]);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <ConnectivitySyncRibbon outletId={activeOutletId} />
      <div className="flex flex-1 min-h-0">
      {/* Menu Panel */}
      <div className="flex-1 flex flex-col min-w-0 p-4 md:p-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text" placeholder="Search menu..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex gap-1.5 bg-card rounded-xl p-1 border border-border">
            {orderTypes.map((t) => (
              <button key={t} onClick={() => setOrderType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${orderType === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >{t}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((c) => (
            <button key={c} onClick={() => setActiveCat(c)}
              className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${activeCat === c ? "bg-primary text-primary-foreground shadow-sm" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}
            >{c}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {(!activeOutletId || activeOutletId < 1) && (
            <div className="mb-4 p-4 rounded-xl border border-border bg-muted/20 text-sm text-muted-foreground text-center">
              Select an outlet in the header to load the menu for that location.
            </div>
          )}
          <SkeletonBusyRegion busy={!!menuLoading} className="min-h-[12rem]" label="Loading menu">
            {menuLoading && <PosMenuGridSkeleton items={8} />}
            {menuError && !menuLoading && (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-center px-4">
              <p className="text-sm text-destructive">Could not load menu from the server.</p>
              <button
                type="button"
                onClick={() => void refetchMenu()}
                className="text-sm font-medium text-primary underline"
              >
                Retry
              </button>
            </div>
          )}
            {!menuLoading && !menuError && menuItems.length === 0 && activeOutletId && activeOutletId >= 1 && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm text-center px-4">
              No menu items mapped for this outlet (check Menu → Outlet Settings and menu_item_outlets).
            </div>
          )}
            {!menuLoading && !menuError && menuItems.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((item) => {
              const inCart = cart.find((c) => c.id === item.id);
              return (
                <motion.button key={item.id} whileTap={{ scale: 0.97 }} onClick={() => addToCart(item)}
                  className={`relative bg-card rounded-2xl p-4 border transition-all text-left hover:pos-shadow-md ${inCart ? "border-primary/30 ring-1 ring-primary/10" : "border-border/50"}`}
                >
                  <span className="text-3xl block mb-2">{item.emoji}</span>
                  <p className="text-sm font-medium text-foreground leading-tight">{item.name}</p>
                  <p className="text-sm font-bold text-primary mt-1">{formatRp(item.price)}</p>
                  {inCart && (
                    <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{inCart.qty}</span>
                  )}
                </motion.button>
              );
            })}
          </div>
          )}
          </SkeletonBusyRegion>
        </div>
      </div>

      {/* Cart Panel */}
      <div className="w-[340px] lg:w-[380px] bg-card border-l flex flex-col shrink-0 hidden md:flex">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-foreground">Current Order</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg">{orderType} • {totalItems} items</span>
          </div>
          {currentOrderId && typeof activeOutletId === "number" && activeOutletId >= 1 ? (
            <div className="mb-3">
              <OrderPaymentHistoryPanel
                outletId={activeOutletId}
                orderId={currentOrderId}
                orderChannelLabel={operationalChannelFromOrder(currentOpenOrder)}
              />
              <PosOrderRecoveryPanel order={currentOpenOrder} />
            </div>
          ) : null}
          {/* Customer Info */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input type="text" placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-background border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20" />
              </div>
              <div className="relative flex-1">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input type="text" placeholder="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-background border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20" />
              </div>
            </div>
            {/* Member selector */}
            {selectedMember ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/50 border border-accent">
                <Star className="h-3.5 w-3.5 text-primary fill-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{selectedMember.name}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedMember.points} pts</p>
                </div>
                <button onClick={() => setSelectedMember(null)} className="text-xs text-muted-foreground hover:text-destructive">×</button>
              </div>
            ) : (
              <button
                onClick={() => setShowMemberPicker(true)}
                disabled={!capabilities.crm}
                className="w-full px-3 py-2 rounded-lg bg-background border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Select member (optional)
              </button>
            )}
            {selectedMember && (
              <div className="space-y-2 rounded-lg border border-border/60 bg-background p-2.5">
                <p className="text-[11px] text-muted-foreground">
                  Points: <span className="font-semibold text-foreground">{availablePoints}</span>
                  {" • "}Gift Card/Store Credit: <span className="font-semibold text-foreground">{formatRp(availableGiftCard)}</span>
                </p>
                <div className="flex gap-2">
                  <input
                    value={redeemPointsInput}
                    onChange={(e) => setRedeemPointsInput(e.target.value)}
                    placeholder="Redeem points"
                    className="w-full rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5 text-xs"
                  />
                  <button onClick={applyPointsRedemption} className="rounded-lg bg-muted px-2 py-1.5 text-xs font-medium">
                    Apply
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    value={giftCardInput}
                    onChange={(e) => setGiftCardInput(e.target.value)}
                    placeholder="Use gift card amount"
                    className="w-full rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5 text-xs"
                  />
                  <button onClick={applyGiftCardRedemption} className="rounded-lg bg-muted px-2 py-1.5 text-xs font-medium">
                    Apply
                  </button>
                </div>
              </div>
            )}
            {orderType === "Dine-in" && (
              <select value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground">
                <option value="">Select table...</option>
                {availableTables.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.seats} seats)</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <AnimatePresence>
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <ShoppingCartEmpty />
                <p className="text-sm mt-3">No items yet</p>
                <p className="text-xs">Tap menu items to add</p>
              </div>
            ) : (
              cart.map((item) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="bg-background rounded-xl p-3 border border-border/50">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatRp(item.price)}</p>
                      {item.notes && <p className="text-xs text-info mt-1 italic">📝 {item.notes}</p>}
                    </div>
                    <p className="text-sm font-bold text-foreground">{formatRp(item.price * item.qty)}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.id, -1)} className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                        {item.qty === 1 ? <Trash2 className="h-3.5 w-3.5 text-destructive" /> : <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-foreground">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    <button onClick={() => setNotesItem(notesItem === item.id ? null : item.id)} className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  {notesItem === item.id && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} className="mt-2 overflow-hidden">
                      <textarea
                        rows={1}
                        value={item.notes}
                        onChange={(e) => updateNotes(item.id, e.target.value)}
                        placeholder="Add notes (e.g. no spicy)"
                        className="w-full resize-y min-h-9 max-h-28 text-xs px-3 py-2 rounded-lg bg-muted border-0 focus:outline-none focus:ring-1 focus:ring-primary/20 leading-snug [field-sizing:content]"
                      />
                    </motion.div>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="p-4 border-t space-y-3">
          {/* Promo badge */}
          {appliedPromo && cart.length > 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Tag className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-emerald-700 truncate">{appliedPromo.promoName}</p>
                <p className="text-[10px] text-emerald-600">-{formatRp(appliedPromo.discountAmount)}</p>
              </div>
              {applicablePromos.length > 1 && (
                <button onClick={() => setShowPromoList(!showPromoList)}
                  className="text-[10px] font-medium text-emerald-600 hover:text-emerald-700 underline whitespace-nowrap">
                  {applicablePromos.length} promos
                </button>
              )}
              {manualPromo && (
                <button onClick={() => setManualPromo(null)} className="p-1 rounded hover:bg-emerald-500/10">
                  <X className="h-3 w-3 text-emerald-600" />
                </button>
              )}
            </div>
          )}
          {/* Promo selector */}
          {showPromoList && applicablePromos.length > 1 && (
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {applicablePromos.map((p) => (
                <button key={p.promoId} onClick={() => { setManualPromo(p); setShowPromoList(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${appliedPromo?.promoId === p.promoId ? "bg-primary/10 text-primary font-medium" : "bg-muted/50 text-muted-foreground hover:text-foreground"}`}>
                  <span className="truncate">{p.promoName}</span>
                  <span className="font-semibold shrink-0 ml-2">-{formatRp(p.discountAmount)}</span>
                </button>
              ))}
            </div>
          )}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatRp(subtotal)}</span></div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium"><span>Discount</span><span>-{formatRp(discount)}</span></div>
            )}
            {appliedPoints > 0 && (
              <div className="flex justify-between text-primary font-medium"><span>Loyalty Redemption</span><span>-{formatRp(Math.round(appliedPoints / 10))}</span></div>
            )}
            {appliedGiftCard > 0 && (
              <div className="flex justify-between text-primary font-medium"><span>Gift Card / Store Credit</span><span>-{formatRp(appliedGiftCard)}</span></div>
            )}
            <div className="flex justify-between text-muted-foreground"><span>Tax (10%)</span><span>{formatRp(tax)}</span></div>
            <div className="flex justify-between font-bold text-foreground text-base pt-1 border-t border-border/50"><span>Total</span><span>{formatRp(total)}</span></div>
          </div>
          <div className="flex gap-2">
            {orderType === "Dine-in" ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowConfirmOrderDialog(true)}
                  disabled={cart.length === 0 || submitting || menuLoading || !!menuError || !orderContextReady}
                  className="flex-1 py-3 rounded-xl bg-accent text-accent-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <ChefHat className="h-4 w-4" /> Confirm Order
                </button>
                <button onClick={handlePayNow} disabled={cart.length === 0 || submitting || menuLoading || !!menuError || !orderContextReady}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  <CreditCard className="h-4 w-4" /> Pay Now
                </button>
              </>
            ) : (
              <button onClick={handlePayNow} disabled={cart.length === 0 || submitting || menuLoading || !!menuError || !orderContextReady}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
                Pay {formatRp(total)}
              </button>
            )}
          </div>
        </div>
      </div>

      <Dialog
        open={showConfirmOrderDialog}
        onOpenChange={(open) => {
          if (!submitting) setShowConfirmOrderDialog(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-primary" />
              Send order to kitchen?
            </DialogTitle>
            <DialogDescription>
              This will confirm the order as unpaid and notify the kitchen.
            </DialogDescription>
            <div className="grid gap-1.5 text-sm pt-2">
              <div>
                <span className="text-muted-foreground">Items:</span>{" "}
                <span className="font-medium text-foreground">{totalItems}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total:</span>{" "}
                <span className="font-semibold text-foreground">{formatRp(total)}</span>
              </div>
              {orderType === "Dine-in" && selectedTableLabel ? (
                <div>
                  <span className="text-muted-foreground">Table:</span>{" "}
                  <span className="font-medium text-foreground">{selectedTableLabel}</span>
                </div>
              ) : null}
            </div>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={submitting} onClick={() => setShowConfirmOrderDialog(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={submitting} onClick={() => void confirmSendToKitchenFromDialog()}>
              {submitting ? "Sending…" : "Send to kitchen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Sent Modal */}
      <AnimatePresence>
        {showConfirmSent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowConfirmSent(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl p-8 max-w-sm w-full text-center pos-shadow-md">
              <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <ChefHat className="h-8 w-8 text-success" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Order Sent to Kitchen!</h3>
              <p className="text-sm text-muted-foreground mb-4">The kitchen team has been notified. Payment can be collected later.</p>
              <button onClick={() => setShowConfirmSent(false)} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
                New Order
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPayment && !showSplit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowQrisModal(false);
              setShowPayment(false);
            }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl p-6 w-full max-w-md pos-shadow-md">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-foreground">Payment</h3>
                <button onClick={() => { setShowQrisModal(false); setShowPayment(false); }} className="p-1 rounded-lg hover:bg-muted"><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-3xl font-bold text-foreground mt-1">{formatRp(total)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {paymentMethods.map((pm) => (
                  <button key={pm.label} onClick={() => setSelectedPayment(pm.label)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${selectedPayment === pm.label ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/30 hover:bg-primary/5"}`}>
                    <pm.icon className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium text-foreground">{pm.label}</span>
                  </button>
                ))}
              </div>
              <button onClick={initSplitBill}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all mb-4">
                <SplitSquareHorizontal className="h-4 w-4" /> Split Bill
              </button>
              <button onClick={() => void completeDirectPayment()} disabled={!selectedPayment || submitting || paymentIsSubmitting}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity mb-3">
                <span className="flex items-center justify-center gap-2"><CheckCircle2 className="h-4 w-4" /> {submitting || paymentIsSubmitting ? "Processing…" : "Complete Payment"}</span>
              </button>
              {paymentTransaction && selectedPayment !== "Cash" && (
                <div className="mb-3 rounded-xl border border-border p-3 space-y-2 text-xs">
                  <p className="font-semibold text-foreground">Online Checkout</p>
                  <p className="text-muted-foreground">Status: <span className="font-medium text-foreground">{paymentTransaction.status}</span></p>
                  {paymentTransaction.status === "paid" && (
                    <p className="rounded-lg bg-success/10 px-2 py-1 text-success">Payment completed. Refreshing order payment...</p>
                  )}
                  {paymentTransaction.status === "expired" && (
                    <p className="rounded-lg bg-destructive/10 px-2 py-1 text-destructive">Payment expired. Retry to create a new checkout.</p>
                  )}
                  {paymentTransaction.status === "failed" && (
                    <p className="rounded-lg bg-destructive/10 px-2 py-1 text-destructive">Payment failed. Retry or choose another method.</p>
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
                    <p className="text-muted-foreground">VA: <span className="font-medium text-foreground">{paymentTransaction.vaNumber}</span></p>
                  )}
                  <p className="text-muted-foreground">Expires in: <span className="font-medium text-foreground">{paymentExpiryCountdown}s</span></p>
                  {paymentError && <p className="text-destructive">{paymentError}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => void paymentRetry(paymentTransaction.id)} disabled={paymentIsSubmitting} className="rounded-lg border border-border px-2 py-1">Retry</button>
                    <button onClick={() => void paymentReconcile(paymentTransaction.id)} disabled={paymentIsSubmitting} className="rounded-lg border border-border px-2 py-1">Reconcile</button>
                    <button onClick={() => void paymentExpire(paymentTransaction.id)} disabled={paymentIsSubmitting} className="rounded-lg border border-border px-2 py-1">Expire</button>
                    {allowSandboxSimulation && (
                      <button onClick={() => void paymentSimulateSandboxPaid(paymentTransaction.id)} disabled={paymentIsSubmitting} className="rounded-lg border border-amber-500/30 px-2 py-1 text-amber-700 dark:text-amber-300">
                        Simulate Sandbox Payment
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 text-success text-sm">
                <Printer className="h-4 w-4" /><span className="font-medium">Print: Ready</span>
                <span className="text-xs opacity-70 ml-auto">Cashier Printer</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <QrisPaymentModal
        open={showPayment && showQrisModal && !!paymentTransaction?.qrString}
        qrString={paymentTransaction?.qrString ?? ""}
        amount={paymentTransaction?.amount ?? total}
        expirySeconds={paymentExpiryCountdown}
        status={paymentTransaction?.status ?? "pending"}
        orderLabel={currentOpenOrder?.code ?? currentOrderId ?? undefined}
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
            toastApiError(error);
          } finally {
            setProviderSimulating(false);
          }
        })()}
      />

      {/* Split Bill Modal */}
      <AnimatePresence>
        {showSplit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSplit(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl p-6 w-full max-w-lg pos-shadow-md max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-foreground">Split Bill</h3>
                <button onClick={() => setShowSplit(false)} className="p-1 rounded-lg hover:bg-muted"><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>

              <div className="text-center mb-5">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-foreground">{formatRp(total)}</p>
              </div>

              {/* Split method toggle */}
              <div className="flex gap-2 mb-4">
                <button onClick={() => { setSplitMethod("equal"); buildEqualSplit(splitCount); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${splitMethod === "equal" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  Equal Split
                </button>
                <button onClick={() => { setSplitMethod("by-item"); buildItemSplit(splitCount); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${splitMethod === "by-item" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  Split by Item
                </button>
              </div>

              {/* Person count */}
              <div className="flex items-center justify-center gap-4 mb-5">
                <button onClick={() => {
                  const c = Math.max(2, splitCount - 1);
                  setSplitCount(c);
                  if (splitMethod === "equal") buildEqualSplit(c);
                  else buildItemSplit(c);
                }}
                  className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80">
                  <Minus className="h-4 w-4 text-muted-foreground" />
                </button>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{splitCount}</p>
                  <p className="text-xs text-muted-foreground">people</p>
                </div>
                <button onClick={() => {
                  const c = Math.min(10, splitCount + 1);
                  setSplitCount(c);
                  if (splitMethod === "equal") buildEqualSplit(c);
                  else buildItemSplit(c);
                }}
                  className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80">
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* By-item assignment */}
              {splitMethod === "by-item" && (
                <div className="mb-5 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Use − / + to give each person a quantity. Units cannot exceed the line qty in the cart.
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
                        {cart.map((item) => {
                          const itemId = item.id;
                          const mine = person.items.find((it) => it.itemId === itemId)?.qty ?? 0;
                          const maxMine = maxQtyForPersonOnLine(splitPersons, pIdx, itemId, item.qty);
                          return (
                            <div
                              key={itemId}
                              className="flex items-center justify-between gap-2 rounded-lg border border-border/40 px-2 py-1.5"
                            >
                              <span className="text-xs text-foreground min-w-0 flex-1 truncate" title={item.name}>
                                {item.emoji} {item.name}
                                <span className="text-muted-foreground"> ×{item.qty}</span>
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  disabled={mine <= 0 || submitting}
                                  onClick={() => adjustPersonLineQty(pIdx, itemId, -1)}
                                  className="h-7 w-7 rounded-lg border border-border text-sm font-medium hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  −
                                </button>
                                <span className="w-7 text-center text-xs font-semibold tabular-nums">{mine}</span>
                                <button
                                  type="button"
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

              {/* Split persons with payment — method picker renders under the selected row */}
              <div className="space-y-2 mb-5">
                {splitPersons.map((person, i) => {
                  const paid = person.payments.reduce((s, p) => s + p.amount, 0);
                  const isPaid = paid >= person.totalDue && person.totalDue > 0;
                  return (
                    <div key={i} className="space-y-2">
                      <div className={`flex items-center gap-3 rounded-xl p-3 border transition-all ${isPaid ? "bg-success/5 border-success/20" : "bg-background border-border/50"}`}>
                        <span className="text-sm font-medium text-foreground flex-1">{person.label}</span>
                        <span className="text-sm font-bold text-foreground">{formatRp(person.totalDue)}</span>
                        {isPaid ? (
                          <span className="px-3 py-1 rounded-lg text-xs font-medium bg-success/10 text-success">✓ Paid ({person.payments[0]?.method})</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setPayingPersonIdx(i);
                              setSplitPayMethod(null);
                            }}
                            className="px-3 py-1 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90"
                          >
                            Add Payment
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
                              <div className="grid grid-cols-4 gap-2 mb-3">
                                {paymentMethods.map((pm) => (
                                  <button
                                    key={pm.label}
                                    type="button"
                                    onClick={() => setSplitPayMethod(pm.label)}
                                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs transition-all ${splitPayMethod === pm.label ? "border-primary bg-primary/5" : "border-border"}`}
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
                onClick={() => void completeSplitOrder()}
                disabled={!allSplitPaid || !byItemAllocationComplete || splitPersons.length === 0 || submitting}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                {submitting
                  ? "Saving…"
                  : !byItemAllocationComplete && splitMethod === "by-item"
                    ? "Assign all item units"
                    : allSplitPaid
                      ? "Complete Split Order"
                      : `${splitPersons.filter((p) => p.payments.reduce((s, pm) => s + pm.amount, 0) >= p.totalDue && p.totalDue > 0).length}/${splitPersons.length} Paid`}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Member picker */}
      <AnimatePresence>
        {showMemberPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowMemberPicker(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
              className="bg-card rounded-2xl w-full max-w-md p-5 pos-shadow-md"
              onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold mb-3">Select member</h3>
              <input
                autoFocus value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm mb-3"
              />
              <div className="max-h-72 overflow-y-auto space-y-1">
                {membersLoading && (
                  <p className="text-xs text-muted-foreground px-1 py-1">Loading members...</p>
                )}
                {members
                  .filter((m) => m.status === "active" &&
                    (m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
                     m.phone.includes(memberSearch)))
                  .map((m) => (
                    <button key={m.id}
                      onClick={() => {
                        setSelectedMember(m);
                        setCustomerName(m.name);
                        setCustomerPhone(m.phone);
                        setShowMemberPicker(false);
                        setMemberSearch("");
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted text-left">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.phone}</p>
                      </div>
                      <span className="text-xs font-semibold text-primary">{m.points} pts</span>
                    </button>
                  ))}
              </div>
              <button onClick={() => { setShowMemberPicker(false); setMemberSearch(""); }}
                className="mt-3 w-full py-2 rounded-xl bg-muted text-sm font-medium hover:bg-accent">
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

function ShoppingCartEmpty() {
  return (
    <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
      <svg className="h-8 w-8 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
    </div>
  );
}
