import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Plus, Minus, Trash2, X,
  SplitSquareHorizontal, Printer, MessageSquare, CheckCircle2, ChefHat, Users, User, Phone, CreditCard, Undo2, CalendarDays, Ticket,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MenuItemImage } from "@/components/menu/MenuItemImage";
import { useOrderStore, type Order, type SplitPerson } from "@/stores/orderStore";
import { setOrderMember } from "@/lib/api-integration/membersEndpoints";
import { type VoucherPreview } from "@/lib/api-integration/orderVoucherEndpoints";
import {
  evaluatePromotions,
  type PromotionEvaluateResult,
  type PromotionPreview,
} from "@/lib/api-integration/promotionEndpoints";
import { useMemberStore, type Member } from "@/stores/memberStore";
import { useLoyaltyStore } from "@/stores/loyaltyStore";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { ApiHttpError, getApiAccessToken } from "@/lib/api-integration/client";
import {
  type CreateOrderPayload,
  type OrderPaymentPayload,
} from "@/lib/api-integration/endpoints";
import { useReservationTableProjectionSync } from "@/hooks/useReservationTableProjectionSync";
import { usePosBootstrap } from "@/hooks/pos/usePosBootstrap";
import { usePosLazyFloorTables } from "@/hooks/pos/usePosLazyFloorTables";
import { usePosLazyMembers } from "@/hooks/pos/usePosLazyMembers";
import { useConsumePosBridge } from "@/hooks/pos/useConsumePosBridge";
import { consumeOutletCartResetSuppression } from "@/hooks/pos/consumePosBridge";
import { useOutletStore } from "@/stores/outletStore";
import { type ApplyReservationPosPayloadDeps } from "@/components/reservations/applyReservationPosPayload";
import { PosReservationPickerDialog } from "@/components/pos/PosReservationPickerDialog";
import { PosDiscountModal } from "@/components/pos/PosDiscountModal";
import { ensurePosDraftOrder } from "@/features/pos/ensurePosDraftOrder";
import { usePaymentStore } from "@/stores/paymentStore";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { showInventoryPolicySuccessToast } from "@/features/pos/posInventoryPolicyToast";
import { POS_AUTO_ORDER_CODE } from "@/features/pos/posOrderCode";
import { useOrderPaymentHistoryStore } from "@/stores/orderPaymentHistoryStore";
import { getUserCapabilities } from "@/domain/accessControl";
import { ConnectivitySyncRibbon } from "@/components/ConnectivitySyncRibbon";
import { PosSessionPanel } from "@/components/pos/PosSessionPanel";
import { usePosSessionStore } from "@/stores/posSessionStore";
import { canReconcilePayments } from "@/domain/permissionGates";
import { PosMenuGridSkeleton } from "@/components/skeletons/card/PosMenuGridSkeleton";
import { SkeletonBusyRegion } from "@/components/skeletons/SkeletonBusyRegion";
import { OrderPaymentHistoryPanel } from "@/components/pos/OrderPaymentHistoryPanel";
import { PosOrderRecoveryPanel } from "@/components/pos/PosOrderRecoveryPanel";
import { QrisPaymentModal } from "@/components/payments/QrisPaymentModal";
import { StaticQrisPaymentModal } from "@/components/payments/StaticQrisPaymentModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { PosPrintStatusBar } from "@/components/pos/PosPrintStatusBar";
import { resolvePrintStatusOutletId } from "@/domain/printStatusUtils";
import { byItemFullyAllocated, maxQtyForPersonOnLine } from "@/features/pos/splitBillAssignmentUtils";
import { applyByItemTotalDuesWithTaxScale } from "@/features/pos/splitBillProportionalDues";
import {
  appliedGiftCardAmount,
  buildGiftCardDirectSettleIdempotencyKey,
  buildGiftCardRedeemIdempotencyKey,
  type AppliedGiftCardCheckout,
} from "@/features/pos/giftCardCheckoutUtils";
import {
  redeemGiftCard,
  settleGiftCardRedemptions,
} from "@/lib/api-integration/giftCardEndpoints";
import { createOrderPaymentIdempotencyKey, resolveCheckoutIdempotencyKey } from "@/features/pos/posCheckoutIdempotency";
import {
  parsePosPaymentFailure,
  paymentFailureRecoveryMessage,
} from "@/features/pos/posPaymentFailure";
import {
  isUnpaidOpenBill,
  openBillCheckoutIdempotencyKey,
  shouldResumeOpenBillCheckout,
} from "@/features/pos/posOpenBillCheckout";
import { resolvePosCheckoutTotals } from "@/features/pos/resolvePosCheckoutTotals";
import {
  hydrateCartFromOrder,
  shouldSyncCartToOpenBill,
  shouldUpdateOpenBill,
  syncCartToOpenBill,
} from "@/features/pos/posOpenBillSync";
import {
  formatPosStockErrorMessage,
  parsePosStockError,
  type PosStockErrorPayload,
} from "@/features/pos/posStockError";
import { PosPaymentStockErrorAlert } from "@/components/pos/PosPaymentStockErrorAlert";
import { PosOpenBillRecoveryBanner } from "@/components/pos/PosOpenBillRecoveryBanner";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";
import { commitMultiPayment } from "@/features/pos/multiPayment/commitMultiPayment";
import {
  buildLegacyDraftLine,
  isMultiPaymentDraftReady,
  OrderMultiPaymentPanel,
} from "@/features/pos/multiPayment/OrderMultiPaymentPanel";
import { useMultiPaymentDraft } from "@/features/pos/multiPayment/useMultiPaymentDraft";
import type { PaymentDraftLine } from "@/features/pos/multiPayment/multiPaymentTypes";

type MenuItem = {
  id: string; name: string; price: number; category: string; emoji: string;
  menuCategorySortOrder?: number;
  imageUrl?: string | null;
  imageVersion?: number;
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
  memberId?: number | null,
): Pick<
  CreateOrderPayload,
  "items" | "subtotal" | "tax" | "total" | "customerName" | "customerPhone" | "tableId" | "discountAmount" | "memberId"
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
    ...(memberId ? { memberId } : {}),
  };
}

const orderTypes = ["Dine-in", "Takeaway", "Online"];

function formatRp(n: number) { return "Rp " + n.toLocaleString("id-ID"); }

function operationalChannelFromOrder(order: Order | null): string {
  if (!order) return "POS";
  if (order.source === "qr" || order.orderChannel === "qr") return "QR";
  if (order.orderChannel === "dine_in") return "POS · Dine-in";
  if (order.orderChannel === "takeaway") return "POS · Takeaway";
  return "POS";
}

export default function POS() {
  const { t } = useOpsTranslation();
  const authUser = useAuthStore((s) => s.user);
  const showReconcile = canReconcilePayments(authUser);
  const capabilities = useMemo(() => getUserCapabilities(authUser), [authUser]);
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const stockEnforcementMode = useSettingsStore((s) => s.system.stockEnforcementMode);
  const enableMultiPayment = useSettingsStore((s) => s.system.enableMultiPayment);
  useReservationTableProjectionSync();
  const { tables, orders, replaceFloorTables } = useOrderStore();
  const createOrderRemote = useOrderStore((s) => s.createOrderRemote);
  const fetchOrderRemote = useOrderStore((s) => s.fetchOrder);
  const addOrderPaymentsRemote = useOrderStore((s) => s.addOrderPaymentsRemote);
  const [activeCat, setActiveCat] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState("Dine-in");
  const [notesItem, setNotesItem] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const { searchResults, fetchMembers, quickCreateMember } = useMemberStore();
  const membersLoading = useMemberStore((s) => s.searchLoading);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [redeemPointsInput, setRedeemPointsInput] = useState("");
  const [appliedGiftCardState, setAppliedGiftCardState] = useState<AppliedGiftCardCheckout | null>(null);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [appliedPoints, setAppliedPoints] = useState(0);
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [showReservationPicker, setShowReservationPicker] = useState(false);
  const [activeReservationId, setActiveReservationId] = useState<number | null>(null);
  const [activeReservationLabel, setActiveReservationLabel] = useState<string | null>(null);
  const [quickMemberName, setQuickMemberName] = useState("");
  const [quickMemberPhone, setQuickMemberPhone] = useState("");
  const [quickMemberSaving, setQuickMemberSaving] = useState(false);
  const updateOrderRemote = useOrderStore((s) => s.updateOrderRemote);

  // Modal states
  const [showPayment, setShowPayment] = useState(false);
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [showStaticQrisModal, setShowStaticQrisModal] = useState(false);
  const [qrisModalSuppressedTxId, setQrisModalSuppressedTxId] = useState<string | null>(null);
  const [showSplit, setShowSplit] = useState(false);
  const [showConfirmSent, setShowConfirmSent] = useState(false);
  const [showConfirmOrderDialog, setShowConfirmOrderDialog] = useState(false);
  const [selectedCheckoutCode, setSelectedCheckoutCode] = useState<string | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [pendingGatewayPayments, setPendingGatewayPayments] = useState<OrderPaymentPayload[]>([]);
  const [pendingManualQrisPayments, setPendingManualQrisPayments] = useState<OrderPaymentPayload[]>([]);
  const [pendingGatewayLinesAfterManual, setPendingGatewayLinesAfterManual] = useState<PaymentDraftLine[]>([]);
  const [voucherPreview, setVoucherPreview] = useState<VoucherPreview | null>(null);
  const [promotionEvaluateResult, setPromotionEvaluateResult] = useState<PromotionEvaluateResult | null>(null);
  const [promotionPreview, setPromotionPreview] = useState<PromotionPreview | null>(null);

  const currentOpenOrder = useMemo(
    () => (currentOrderId ? orders.find((o) => o.id === currentOrderId) ?? null : null),
    [orders, currentOrderId],
  );
  const printStatusOutletId = useMemo(
    () => resolvePrintStatusOutletId(activeOutletId, currentOpenOrder?.outletId),
    [activeOutletId, currentOpenOrder?.outletId],
  );

  // Split bill state
  const [splitPersons, setSplitPersons] = useState<SplitPerson[]>([]);
  const [splitMethod, setSplitMethod] = useState<"equal" | "by-item">("equal");
  const [splitCount, setSplitCount] = useState(2);
  const [payingPersonIdx, setPayingPersonIdx] = useState<number | null>(null);
  const [splitPayMethod, setSplitPayMethod] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentStockError, setPaymentStockError] = useState<PosStockErrorPayload | null>(null);
  const [paymentAckRequired, setPaymentAckRequired] = useState(false);
  const [openBillRecoveryCode, setOpenBillRecoveryCode] = useState<string | null>(null);
  const checkoutAttemptIdRef = useRef<string | null>(null);
  const cartLengthRef = useRef(0);
  cartLengthRef.current = cart.length;
  const [qrOrderContext, setQrOrderContext] = useState<{
    requestId: string;
    requestCode: string;
    tableName?: string | null;
    linkedOrderId?: string | null;
  } | null>(null);
  const { data: checkoutMethods = FALLBACK_CHECKOUT_METHODS } = useOutletCheckoutMethods(activeOutletId, {
    enabled: showPayment || showSplit,
  });
  const checkoutTiles = useMemo(
    () => checkoutMethods.map((method) => ({ method, icon: iconForCheckoutMethod(method) })),
    [checkoutMethods],
  );
  const selectedCheckoutMethod = findCheckoutMethod(checkoutMethods, selectedCheckoutCode);
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
  const loyaltyBalances = useLoyaltyStore((s) => s.pointsBalanceByCustomer);
  const enqueueRedemption = useLoyaltyStore((s) => s.enqueueRedemption);
  usePosLazyMembers({
    activeOutletId,
    showMemberPicker,
    memberSearch,
    crmEnabled: capabilities.crm,
  });

  const { requestTables, tablesLoading } = usePosLazyFloorTables({
    activeOutletId,
    orders,
    replaceFloorTables,
    orderType,
  });

  useEffect(() => {
    if (!currentOpenOrder) {
      setVoucherPreview(null);
      setPromotionPreview(null);
      return;
    }
    setVoucherPreview(currentOpenOrder.voucherPreview ?? null);
    setPromotionPreview(currentOpenOrder.promotionPreview ?? null);
  }, [currentOpenOrder]);

  useEffect(() => {
    if (!currentOpenOrder) return;
    if (currentOpenOrder.customerName) setCustomerName(currentOpenOrder.customerName);
    if (currentOpenOrder.customerPhone) setCustomerPhone(currentOpenOrder.customerPhone);
    const orderMemberId = currentOpenOrder.memberId;
    if (orderMemberId && typeof activeOutletId === "number") {
      if (selectedMember?.id !== String(orderMemberId)) {
        void fetchMembers({ outletId: activeOutletId, force: true }).then(() => {
          const matched = useMemberStore.getState().members.find((m) => m.id === String(orderMemberId));
          if (matched) setSelectedMember(matched);
        }).catch(() => undefined);
      }
    }
  }, [currentOpenOrder?.id, currentOpenOrder?.memberId, currentOpenOrder?.customerName, currentOpenOrder?.customerPhone, activeOutletId, fetchMembers, selectedMember?.id]);

  useConsumePosBridge({
    activeOutletId,
    setQrOrderContext,
    setCurrentOrderId,
    setCart,
    setCustomerName,
    setCustomerPhone,
    setSelectedTable,
    setOrderType,
    setSelectedMember,
    setActiveReservationId,
    setActiveReservationLabel,
    getCartLength: () => cartLengthRef.current,
    fetchMembers,
    fetchOrderRemote,
    onTablesPrefetch: requestTables,
  });

  useEffect(() => {
    if (showPayment) return;
    paymentResetAsync();
  }, [showPayment, paymentResetAsync]);

  useEffect(() => {
    if (!showPayment || !paymentTransaction) return;
    if (paymentTransaction.status !== "pending") return;
    if (qrisModalSuppressedTxId === paymentTransaction.id) return;
    const gatewayQris =
      Boolean(selectedCheckoutMethod && isGatewayCheckoutMethod(selectedCheckoutMethod)) ||
      paymentTransaction.method === "qris";
    if (gatewayQris && paymentTransaction.qrString) {
      setShowQrisModal(true);
    }
  }, [showPayment, paymentTransaction, selectedCheckoutMethod, qrisModalSuppressedTxId]);

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

    if (didOutletSwitch && !consumeOutletCartResetSuppression()) {
      resetCart();
      setShowPayment(false);
      setShowSplit(false);
      setShowConfirmSent(false);
      setSelectedCheckoutCode(null);
      setShowStaticQrisModal(false);
      setCurrentOrderId(null);
      setPendingGatewayPayments([]);
      setPayingPersonIdx(null);
      setSplitPayMethod(null);
      setVoucherPreview(null);
      paymentResetAsync();
    }
    previousOutletIdRef.current = nextOutletId;
  }, [activeOutletId, paymentResetAsync]);

  useEffect(() => {
    return () => {
      paymentResetAsync();
    };
  }, [paymentResetAsync]);

  const { menuApiItems, menuLoading, menuError, refetchMenu } = usePosBootstrap({
    tenantId: POS_TENANT_ID,
    outletId: activeOutletId,
  });

  const menuItems: MenuItem[] = useMemo(() => {
    return menuApiItems
      .filter((m) => m.available !== false)
      .map((m) => ({
        id: String(m.id),
        name: m.name,
        price: m.price,
        category: m.menuCategory?.displayName?.trim()
          ? m.menuCategory.displayName
          : (m.menuCategory?.name?.trim() ? m.menuCategory.name : (m.category?.trim() ? m.category : "Uncategorized")),
        emoji: m.emoji ?? "🍽️",
        menuCategorySortOrder: m.menuCategory?.sortOrder ?? 100,
        imageUrl: m.imageUrl ?? null,
        imageVersion: m.imageVersion,
      }));
  }, [menuApiItems]);

  const categories = useMemo(() => {
    const unique = new Map<string, number>();
    for (const item of menuItems) {
      if (!unique.has(item.category)) {
        unique.set(item.category, item.menuCategorySortOrder ?? 100);
      }
    }
    const sorted = Array.from(unique.entries())
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name);
    return ["All", ...sorted];
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
  const voucherDiscount = voucherPreview?.discount ?? currentOpenOrder?.voucherPreview?.discount ?? 0;
  const evaluatedPromotionDiscount = promotionEvaluateResult?.best?.discountAmount ?? 0;
  const appliedPromotionDiscount = promotionPreview?.discount ?? currentOpenOrder?.promotionPreview?.discount ?? 0;
  const promotionDiscount = currentOpenOrder?.promotion
    ? appliedPromotionDiscount
    : (currentOrderId ? appliedPromotionDiscount : evaluatedPromotionDiscount);
  const checkoutDiscount = voucherDiscount > 0 ? voucherDiscount : promotionDiscount;
  const taxableBase = Math.max(0, subtotal - checkoutDiscount);

  useEffect(() => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1 || cart.length === 0) {
      setPromotionEvaluateResult(null);
      return;
    }
    if (currentOpenOrder?.voucher) {
      setPromotionEvaluateResult(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void evaluatePromotions({
        outletId: activeOutletId,
        subtotal,
        items: cart.map((c) => ({
          id: c.id,
          name: c.name,
          price: c.price,
          qty: c.qty,
          category: c.category,
        })),
      })
        .then((result) => setPromotionEvaluateResult(result))
        .catch(() => setPromotionEvaluateResult(null));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [
    activeOutletId,
    cart,
    subtotal,
    currentOpenOrder?.voucher,
  ]);

  const tax = Math.round(taxableBase * 0.1);
  const clientBaseTotal = taxableBase + tax;
  const appliedGiftCard = appliedGiftCardAmount(appliedGiftCardState);
  const appliedPointsValue = Math.round(appliedPoints / 10);

  const checkoutTotals = useMemo(
    () =>
      resolvePosCheckoutTotals({
        cartSubtotal: subtotal,
        clientTax: tax,
        clientBaseTotal,
        clientDiscount: checkoutDiscount,
        appliedGiftCard,
        appliedPointsValue,
        order: currentOpenOrder,
      }),
    [
      subtotal,
      tax,
      clientBaseTotal,
      checkoutDiscount,
      appliedGiftCard,
      appliedPointsValue,
      currentOpenOrder,
    ],
  );

  const displaySubtotal = checkoutTotals.subtotal;
  const displayTax = checkoutTotals.tax;
  const displayDiscount = checkoutTotals.discount;
  const baseTotal = checkoutTotals.baseTotal;
  const total = checkoutTotals.total;
  const posPaymentBalanceDue = checkoutTotals.balanceDue;
  const paymentDraft = useMultiPaymentDraft(posPaymentBalanceDue);
  const posPaymentAlreadyPaid = currentOpenOrder
    ? currentOpenOrder.payments.reduce((sum, payment) => sum + payment.amount, 0)
    : 0;
  const posPaymentOrderTotal = checkoutTotals.source === "server"
    ? checkoutTotals.baseTotal
    : (currentOpenOrder?.total ?? total);
  const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);
  const loyaltyAccountId = selectedMember?.loyaltyAccountId ?? null;
  const availablePoints = selectedMember
    ? (selectedMember.points
      ?? selectedMember.crmPointsBalance
      ?? (loyaltyAccountId ? loyaltyBalances[loyaltyAccountId] : undefined)
      ?? 0)
    : 0;

  const selectableTables = tables.filter(
    (t) => t.status === "available" || t.status === "occupied" || t.status === "reserved",
  );
  const selectedTableLabel =
    selectedTable && tables.length > 0
      ? tables.find((t) => String(t.id) === String(selectedTable))?.name ?? t("pos.tableNumber", { id: selectedTable })
      : null;

  const outletOrderFields = useMemo((): Pick<CreateOrderPayload, "outletId"> => {
    if (typeof activeOutletId === "number" && activeOutletId >= 1) return { outletId: activeOutletId };
    return {};
  }, [activeOutletId]);

  const currentPosSessionId = usePosSessionStore(
    (s) => (s.currentSession?.status === "open" ? s.currentSession.id : undefined),
  );
  const posSessionOrderFields = useMemo((): Pick<CreateOrderPayload, "posSessionId"> => {
    if (typeof currentPosSessionId === "number" && currentPosSessionId > 0) {
      return { posSessionId: currentPosSessionId };
    }
    return {};
  }, [currentPosSessionId]);

  const reservationApplyDeps = useMemo(
    (): ApplyReservationPosPayloadDeps => ({
      setCurrentOrderId,
      setCustomerName,
      setCustomerPhone,
      setSelectedTable,
      setOrderType,
      setSelectedMember,
      setActiveReservationId,
      setCart,
      getCartLength: () => cartLengthRef.current,
      fetchMembers,
      fetchOrderRemote,
      activeOutletId,
    }),
    [activeOutletId, fetchMembers, fetchOrderRemote],
  );

  const orderContextReady = typeof activeOutletId === "number" && activeOutletId >= 1;
  const checkoutReady =
    orderContextReady &&
    (!menuLoading || cart.length > 0 || currentOrderId != null);

  const orderTypeLabel = (type: string) => {
    if (type === "Dine-in") return t("pos.orderTypes.dine_in");
    if (type === "Takeaway") return t("pos.orderTypes.takeaway");
    if (type === "Online") return t("pos.orderTypes.online");
    return type;
  };

  const categoryLabel = (category: string) => {
    if (category === "All") return t("shared.all");
    if (category === "Uncategorized") return t("pos.uncategorized");
    return category;
  };

  function requireOutletOrderContext(): boolean {
    if (typeof activeOutletId !== "number" || activeOutletId < 1) {
      toast.error(t("shared.selectOutlet"));
      return false;
    }
    return true;
  }

  function toastApiError(e: unknown): void {
    if (e instanceof ApiHttpError) {
      toast.error(e.message);
      return;
    }
    toast.error(t("shared.somethingWrong"));
  }

  function beginCheckoutAttempt(scope: string): string {
    const attemptId = resolveCheckoutIdempotencyKey({
      qrOrderRequestId: qrOrderContext?.requestId,
      scope,
    });
    checkoutAttemptIdRef.current = attemptId;
    return attemptId;
  }

  function beginOrderPaymentAttempt(orderId: string): string {
    const prefix = `pos-checkout-pay-order-${orderId}-`;
    const existing = checkoutAttemptIdRef.current;
    if (existing?.startsWith(prefix)) {
      return existing;
    }
    const attemptId = createOrderPaymentIdempotencyKey(orderId);
    checkoutAttemptIdRef.current = attemptId;
    return attemptId;
  }

  function clearCheckoutRecoveryState(): void {
    setPaymentStockError(null);
    setPaymentAckRequired(false);
    setOpenBillRecoveryCode(null);
  }

  async function handleCheckoutStockFailure(e: unknown): Promise<boolean> {
    const stockError = parsePosStockError(e);
    if (!stockError) {
      return false;
    }
    setPaymentStockError(stockError);
    setPaymentAckRequired(true);
    if (stockError.orderCode) {
      setOpenBillRecoveryCode(stockError.orderCode);
    }
    if (stockError.orderId) {
      const orderId = String(stockError.orderId);
      setCurrentOrderId(orderId);
      checkoutAttemptIdRef.current = openBillCheckoutIdempotencyKey(orderId);
      if (qrOrderContext) {
        setQrOrderContext((prev) => (prev ? { ...prev, linkedOrderId: orderId } : prev));
      }
      try {
        await fetchOrderRemote(orderId);
        useOrderPaymentHistoryStore.getState().refreshOrderAfterPaymentMutation(activeOutletId, orderId);
      } catch {
        // Best-effort sync so cashier sees the unpaid open bill after stock failure.
      }
    }
    setShowPayment(false);
    setShowStaticQrisModal(false);
    setShowQrisModal(false);
    setSelectedCheckoutCode(null);
    void paymentResetAsync();
    toast.error(formatPosStockErrorMessage(stockError, stockEnforcementMode));
    return true;
  }

  async function handleCheckoutPaymentFailure(e: unknown): Promise<boolean> {
    if (await handleCheckoutStockFailure(e)) {
      return true;
    }

    const failure = parsePosPaymentFailure(e);
    if (failure?.orderId) {
      const orderId = String(failure.orderId);
      setCurrentOrderId(orderId);
      checkoutAttemptIdRef.current = openBillCheckoutIdempotencyKey(orderId);
      if (qrOrderContext) {
        setQrOrderContext((prev) => (prev ? { ...prev, linkedOrderId: orderId } : prev));
      }
      if (failure.orderCode) {
        setOpenBillRecoveryCode(failure.orderCode);
      }
      try {
        await fetchOrderRemote(orderId);
        useOrderPaymentHistoryStore.getState().refreshOrderAfterPaymentMutation(activeOutletId, orderId);
      } catch {
        // Best-effort sync after payment failure.
      }
    }

    setShowPayment(false);
    setShowStaticQrisModal(false);
    setShowQrisModal(false);
    setSelectedCheckoutCode(null);
    void paymentResetAsync();

    if (failure?.orderCode) {
      toast.error(paymentFailureRecoveryMessage(failure.orderCode));
      return true;
    }
    if (failure) {
      toast.error(failure.message);
      return true;
    }

    return false;
  }

  const cartFingerprint = useMemo(
    () => cart.map((item) => `${item.id}:${item.qty}`).join("|"),
    [cart],
  );
  const previousCartFingerprintRef = useRef(cartFingerprint);

  useEffect(() => {
    if (
      paymentStockError
      && previousCartFingerprintRef.current !== cartFingerprint
    ) {
      clearCheckoutRecoveryState();
      checkoutAttemptIdRef.current = null;
    }
    previousCartFingerprintRef.current = cartFingerprint;
  }, [cartFingerprint, paymentStockError]);

  const memberIdForPayload = selectedMember ? Number(selectedMember.id) : undefined;

  const buildOpenBillCartUpdate = () =>
    buildCartPayload(cart, subtotal, tax, total, 0, customerName, customerPhone, selectedTable, memberIdForPayload);

  const qrOrderPayloadFields = useMemo((): Pick<CreateOrderPayload, "qrOrderRequestId" | "orderChannel" | "serviceMode"> => {
    if (!qrOrderContext) return {};
    return {
      qrOrderRequestId: Number(qrOrderContext.requestId),
      orderChannel: "qr",
      serviceMode: "dine_in",
    };
  }, [qrOrderContext]);

  const clearQrOrderContext = () => setQrOrderContext(null);

  const paymentExtras = useMemo(
    () => ({
      qrOrderRequestId: qrOrderContext?.requestId ? Number(qrOrderContext.requestId) : undefined,
    }),
    [qrOrderContext?.requestId],
  );

  function startNewPosOrder(): void {
    clearCheckoutRecoveryState();
    checkoutAttemptIdRef.current = null;
    setCurrentOrderId(null);
    resetCart();
    clearQrOrderContext();
    setSelectedMember(null);
    setActiveReservationId(null);
    setActiveReservationLabel(null);
    setShowPayment(false);
    setShowSplit(false);
    setShowConfirmSent(false);
    setSelectedCheckoutCode(null);
    setShowStaticQrisModal(false);
    setShowQrisModal(false);
    setPendingGatewayPayments([]);
    void paymentResetAsync();
  }

  async function refreshSelectedMemberPoints() {
    if (!selectedMember || typeof activeOutletId !== "number") return;
    try {
      await fetchMembers({ outletId: activeOutletId, force: true });
      const state = useMemberStore.getState();
      const updated =
        state.members.find((m) => m.id === selectedMember.id)
        ?? state.searchResults.find((m) => m.id === selectedMember.id);
      if (updated) setSelectedMember(updated);
    } catch {
      // Non-blocking refresh after payment.
    }
  }

  async function attachMemberToOpenOrder(member: Member | null) {
    if (!currentOrderId) return;
    if (currentOpenOrder?.paymentStatus === "paid") {
      toast.error(t("pos.memberLocked"));
      return;
    }
    try {
      await setOrderMember(currentOrderId, member ? Number(member.id) : null);
      if (member) {
        setCustomerName(member.name);
        setCustomerPhone(member.phone);
      }
      await fetchOrderRemote(currentOrderId);
    } catch (e) {
      toastApiError(e);
    }
  }

  const buildDiscountDraftCreatePayload = (): CreateOrderPayload => ({
    tenantId: POS_TENANT_ID,
    ...outletOrderFields,
    ...posSessionOrderFields,
    code: POS_AUTO_ORDER_CODE,
    source: "pos",
    orderType,
    status: "confirmed",
    paymentStatus: "unpaid",
    payments: [],
    confirmedAt: new Date().toISOString(),
    ...qrOrderPayloadFields,
    idempotencyKey: `pos-discount-draft-${Date.now()}`,
    ...buildCartPayload(cart, subtotal, tax, total, 0, customerName, customerPhone, selectedTable, memberIdForPayload),
  });

  async function ensureDraftOrderForDiscount(): Promise<string> {
    const orderId = await ensurePosDraftOrder({
      cartLength: cart.length,
      currentOrderId,
      currentOpenOrder,
      createOrderRemote,
      updateOrderRemote,
      buildCartUpdate: buildOpenBillCartUpdate,
      buildCreatePayload: buildDiscountDraftCreatePayload,
    });
    if (orderId !== currentOrderId) {
      setCurrentOrderId(orderId);
    }
    return orderId;
  }

  async function handleDiscountOrderUpdated(orderId: string) {
    const order = await fetchOrderRemote(orderId);
    setVoucherPreview(order.voucherPreview ?? null);
    setPromotionPreview(order.promotionPreview ?? null);
    if (order.memberId) {
      const memberId = String(order.memberId);
      const state = useMemberStore.getState();
      const matched =
        state.members.find((m) => m.id === memberId)
        ?? state.searchResults.find((m) => m.id === memberId);
      if (matched) {
        setSelectedMember(matched);
        setCustomerName(matched.name);
        setCustomerPhone(matched.phone);
      }
    }
  }

  const clearAppliedGiftCard = () => {
    setAppliedGiftCardState(null);
  };

  async function selectMember(member: Member) {
    setSelectedMember(member);
    setCustomerName(member.name);
    setCustomerPhone(member.phone);
    setShowMemberPicker(false);
    setMemberSearch("");
    setVoucherPreview(null);
    setPromotionPreview(null);
    await attachMemberToOpenOrder(member);
  }

  // FLOW 1: Confirm Order → Send to Kitchen (single POST: confirmed + unpaid → kitchen ticket)
  const handleConfirmOrder = async () => {
    if (cart.length === 0 || submitting) return;
    if (!requireOutletOrderContext()) return;
    setSubmitting(true);
    try {
      if (shouldUpdateOpenBill(currentOrderId, currentOpenOrder)) {
        const storedOrder = await syncCartToOpenBill(
          currentOrderId!,
          updateOrderRemote,
          buildOpenBillCartUpdate(),
        );
        setCurrentOrderId(storedOrder.id);
        resetCart();
        clearQrOrderContext();
        setShowConfirmSent(true);
        toast.success(t("pos.orderSentKitchen", { code: storedOrder.code }), { icon: "🍳" });
        return;
      }
      const code = POS_AUTO_ORDER_CODE;
      const payload: CreateOrderPayload = {
        tenantId: POS_TENANT_ID,
        ...outletOrderFields,
        ...posSessionOrderFields,
        code,
        source: "pos",
        orderType,
        status: "confirmed",
        paymentStatus: "unpaid",
        payments: [],
        confirmedAt: new Date().toISOString(),
        ...qrOrderPayloadFields,
        ...buildCartPayload(cart, subtotal, tax, total, 0, customerName, customerPhone, selectedTable, memberIdForPayload),
      };
      const { order: storedOrder } = await createOrderRemote(payload);
      setCurrentOrderId(storedOrder.id);
      resetCart();
      clearQrOrderContext();
      setShowConfirmSent(true);
      toast.success(t("pos.orderSentKitchen", { code: storedOrder.code }), { icon: "🍳" });
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
  const handlePayNow = async () => {
    if (cart.length === 0) return;
    if (paymentAckRequired) {
      toast.error(t("pos.fixStock"));
      return;
    }
    if (shouldSyncCartToOpenBill(currentOrderId, currentOpenOrder, cart.length)) {
      setSubmitting(true);
      try {
        await syncCartToOpenBill(currentOrderId!, updateOrderRemote, buildOpenBillCartUpdate());
        await fetchOrderRemote(currentOrderId!);
      } catch (e) {
        toastApiError(e);
        return;
      } finally {
        setSubmitting(false);
      }
    }
    if (currentOrderId && isUnpaidOpenBill(currentOpenOrder)) {
      beginOrderPaymentAttempt(currentOrderId);
      setShowPayment(true);
      return;
    }
    beginCheckoutAttempt("pay-now");
    setShowPayment(true);
  };

  const completeDirectPayment = async () => {
    if (submitting || paymentAckRequired) return;
    if (!requireOutletOrderContext()) return;
    const idempotencyKey = checkoutAttemptIdRef.current ?? beginCheckoutAttempt("pay-now");

    const amountDue = posPaymentBalanceDue;
    if (amountDue <= 0) {
      toast.error(t("shared.nothingToPay"));
      return;
    }

    if (selectedMember && currentOrderId) {
      const attachedMemberId = currentOpenOrder?.memberId ?? null;
      if (attachedMemberId !== Number(selectedMember.id)) {
        await attachMemberToOpenOrder(selectedMember);
      }
    } else if (!selectedMember && !memberIdForPayload) {
      toast.message("No member attached — loyalty points will not be earned.", {
        description: "Select a member before checkout to earn program points.",
      });
    }

    let draftLines: PaymentDraftLine[];
    if (enableMultiPayment) {
      if (!isMultiPaymentDraftReady(enableMultiPayment, paymentDraft.lines, amountDue)) {
        toast.error(t("shared.draftMustMatchBalance"));
        return;
      }
      draftLines = paymentDraft.lines;
    } else {
      if (!selectedCheckoutMethod) return;
      draftLines = [
        buildLegacyDraftLine(
          apiMethodFromCheckoutMethod(selectedCheckoutMethod),
          selectedCheckoutMethod.label,
          pendingGatewayPayments.length > 0
            ? pendingGatewayCheckoutTotal(pendingGatewayPayments)
            : amountDue,
        ),
      ];
    }

    const primaryGatewayLine = draftLines.find((line) =>
      isGatewayPaymentMethod(line.method, checkoutMethods),
    );
    const legacyGatewayMethod =
      selectedCheckoutMethod && isGatewayCheckoutMethod(selectedCheckoutMethod)
        ? selectedCheckoutMethod
        : null;

    if (paymentTransaction?.status === "pending") {
      const nextMethod = primaryGatewayLine?.method ?? (legacyGatewayMethod
        ? apiMethodFromCheckoutMethod(legacyGatewayMethod)
        : null);
      if (nextMethod && shouldBlockDuplicateGatewayAttempt(paymentTransaction.method, nextMethod)) {
        toast.error(t("pos.qrPending"));
        return;
      }
      try {
        await paymentExpire(paymentTransaction.id);
        setShowQrisModal(false);
        setQrisModalSuppressedTxId(paymentTransaction.id);
        setPendingGatewayPayments([]);
        if (currentOrderId) {
          useOrderPaymentHistoryStore.getState().refreshOrderAfterPaymentMutation(activeOutletId, currentOrderId);
        }
      } catch (e) {
        toastApiError(e);
        return;
      }
    }

    if (
      paymentTransaction &&
      isTerminalGatewayStatus(paymentTransaction.status) &&
      currentOrderId &&
      (pendingGatewayPayments.length > 0 || legacyGatewayMethod)
    ) {
      setSubmitting(true);
      try {
        const giftCardSettlementIds = await redeemGiftCardForOrder(currentOrderId);
        const tx = await paymentRetry(paymentTransaction.id, {
          giftCardSettlementIds,
          splitPayments:
            pendingGatewayPayments.length > 0
              ? splitPaymentsForGatewayCreate(pendingGatewayPayments)
              : undefined,
        });
        useOrderPaymentHistoryStore.getState().refreshOrderAfterPaymentMutation(activeOutletId, currentOrderId);
        const retryMethod = primaryGatewayLine?.method ?? apiMethodFromCheckoutMethod(legacyGatewayMethod!);
        if (retryMethod === "qris" && tx.qrString) {
          setShowQrisModal(true);
          toast.success(t("pos.qrisReady"));
        } else {
          toast.success(t("pos.checkoutCreated"));
        }
      } catch (e) {
        toastApiError(e);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      let storedOrder: Order;
      const recoveryOrderId =
        currentOrderId
        ?? (qrOrderContext?.linkedOrderId ? String(qrOrderContext.linkedOrderId) : null)
        ?? (paymentStockError?.orderId ? String(paymentStockError.orderId) : null);

      if (recoveryOrderId) {
        try {
          if (shouldSyncCartToOpenBill(recoveryOrderId, currentOpenOrder, cart.length)) {
            storedOrder = await syncCartToOpenBill(
              recoveryOrderId,
              updateOrderRemote,
              buildOpenBillCartUpdate(),
            );
          } else {
            storedOrder = await fetchOrderRemote(recoveryOrderId);
          }
        } catch {
          toast.error(
            openBillRecoveryCode
              ? `Could not load open bill ${openBillRecoveryCode}. Resume it from Open Bills.`
              : "Could not load the existing open bill. Resume from Open Bills.",
          );
          return;
        }
        if (!shouldResumeOpenBillCheckout(recoveryOrderId, storedOrder)) {
          toast.error(t("pos.billPaid"));
          return;
        }
        setCurrentOrderId(storedOrder.id);
      } else {
        const code = POS_AUTO_ORDER_CODE;
        const payload: CreateOrderPayload = {
          tenantId: POS_TENANT_ID,
          ...outletOrderFields,
        ...posSessionOrderFields,
          code,
          source: "pos",
          orderType,
          status: "confirmed",
          paymentStatus: "unpaid",
          payments: [],
          confirmedAt: new Date().toISOString(),
          ...qrOrderPayloadFields,
          idempotencyKey: recoveryOrderId
            ? openBillCheckoutIdempotencyKey(recoveryOrderId)
            : idempotencyKey,
          ...buildCartPayload(cart, subtotal, tax, total, 0, customerName, customerPhone, selectedTable, memberIdForPayload),
        };
        const createResult = await createOrderRemote(payload);
        storedOrder = createResult.order;
        setCurrentOrderId(storedOrder.id);
        if (createResult.resumed && qrOrderContext) {
          setQrOrderContext((prev) => (prev ? { ...prev, linkedOrderId: storedOrder.id } : prev));
        }
      }

      storedOrder = await fetchOrderRemote(String(storedOrder.id));

      const orderBalanceDue = Math.max(
        0,
        storedOrder.total - storedOrder.payments.reduce((sum, payment) => sum + payment.amount, 0),
      );
      const paymentIdempotencyKey = beginOrderPaymentAttempt(String(storedOrder.id));
      const giftCardSettlementIds = await redeemGiftCardForOrder(storedOrder.id);

      const result = await commitMultiPayment({
        orderId: storedOrder.id,
        outletId: activeOutletId!,
        balanceDue: orderBalanceDue,
        draftLines,
        checkoutMethods,
        addOrderPaymentsRemote: (orderId, payments, options) =>
          addOrderPaymentsRemote(orderId, payments, {
            ...options,
            idempotencyKey: options?.idempotencyKey ?? paymentIdempotencyKey,
            ...paymentExtras,
          }),
        paymentCreateTransaction: (payload) =>
          paymentCreateTransaction({
            ...payload,
            outletId: activeOutletId ?? undefined,
            giftCardSettlementIds:
              giftCardSettlementIds.length > 0 ? giftCardSettlementIds : payload.giftCardSettlementIds,
          }),
        idempotencyKey: paymentIdempotencyKey,
        giftCardSettlementIds,
      });

      if (result.outcome === "completed") {
        await settleGiftCardAfterDirectPayment(storedOrder.id, giftCardSettlementIds);
        if (loyaltyAccountId && appliedPoints > 0) {
          await enqueueRedemption({
            customerId: loyaltyAccountId,
            pointsUsed: appliedPoints,
            amountValue: Math.round(appliedPoints / 10),
            replayFingerprint: `pos-${storedOrder.id}-${loyaltyAccountId}-${appliedPoints}`,
          });
        }
        await refreshSelectedMemberPoints();
        paymentDraft.clearDraft();
        clearCheckoutRecoveryState();
        checkoutAttemptIdRef.current = null;
        setCurrentOrderId(null);
        resetCart();
        clearQrOrderContext();
        setShowPayment(false);
        setSelectedCheckoutCode(null);
        setPendingGatewayPayments([]);
        toast.success(t("pos.orderPaidKitchen", { code: storedOrder.code }), { icon: "✅" });
        showInventoryPolicySuccessToast(stockEnforcementMode);
        return;
      }

      if (result.outcome === "manual_qris_pending") {
        setPendingManualQrisPayments(result.manualQrisPayments);
        setPendingGatewayLinesAfterManual(result.pendingGatewayLines ?? []);
        setShowStaticQrisModal(true);
        toast.message(t("pos.showQris"), {
          description: t("pos.verifyTransfer"),
        });
        return;
      }

      setPendingGatewayPayments(result.gatewayPayments);
      useOrderPaymentHistoryStore.getState().refreshOrderAfterPaymentMutation(activeOutletId, storedOrder.id);
      paymentPollTransactionStatus(result.transaction.id);
      if (result.transaction.method === "qris" && result.transaction.qrString) {
        setQrisModalSuppressedTxId(null);
        setShowQrisModal(true);
        toast.success(t("pos.qrisReady"));
      } else {
        toast.success(t("pos.checkoutCreated"));
      }
    } catch (e) {
      if (!(await handleCheckoutPaymentFailure(e))) {
        if (currentOrderId) {
          try {
            await fetchOrderRemote(currentOrderId);
            useOrderPaymentHistoryStore.getState().refreshOrderAfterPaymentMutation(activeOutletId, currentOrderId);
          } catch {
            // Best-effort sync so cashier sees real payment status after a partial failure.
          }
        }
        toastApiError(e);
        setShowPayment(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const confirmStaticQrisPayment = async () => {
    if (!currentOrderId || submitting || paymentAckRequired) return;
    const idempotencyKey = checkoutAttemptIdRef.current ?? beginCheckoutAttempt("static-qris");
    setSubmitting(true);
    try {
      if (paymentTransaction?.status === "pending") {
        await paymentExpire(paymentTransaction.id);
        setQrisModalSuppressedTxId(paymentTransaction.id);
      }

      const manualBatch =
        pendingManualQrisPayments.length > 0
          ? pendingManualQrisPayments
          : selectedCheckoutMethod
            ? [
                {
                  method: apiMethodFromCheckoutMethod(selectedCheckoutMethod),
                  amount: currentOpenOrder
                    ? Math.max(
                        0,
                        currentOpenOrder.total
                          - currentOpenOrder.payments.reduce((sum, payment) => sum + payment.amount, 0),
                      )
                    : total,
                  paidAt: new Date().toISOString(),
                },
              ]
            : [];

      if (manualBatch.length === 0) {
        toast.error(t("shared.nothingToPay"));
        return;
      }

      const giftCardSettlementIds = await redeemGiftCardForOrder(currentOrderId);
      const paymentIdempotencyKey = beginOrderPaymentAttempt(currentOrderId);
      await addOrderPaymentsRemote(currentOrderId, manualBatch, {
        idempotencyKey: paymentIdempotencyKey,
        ...paymentExtras,
      });
      setPendingManualQrisPayments([]);
      setShowStaticQrisModal(false);

      if (pendingGatewayLinesAfterManual.length > 0 && typeof activeOutletId === "number") {
        const fresh = await fetchOrderRemote(currentOrderId);
        const freshBalance = Math.max(
          0,
          fresh.total - fresh.payments.reduce((sum, payment) => sum + payment.amount, 0),
        );
        const gatewayLines = pendingGatewayLinesAfterManual;
        setPendingGatewayLinesAfterManual([]);
        const gatewayResult = await commitMultiPayment({
          orderId: currentOrderId,
          outletId: activeOutletId,
          balanceDue: freshBalance,
          draftLines: gatewayLines,
          checkoutMethods,
          addOrderPaymentsRemote: (orderId, payments, options) =>
            addOrderPaymentsRemote(orderId, payments, {
              ...options,
              idempotencyKey: options?.idempotencyKey ?? paymentIdempotencyKey,
              ...paymentExtras,
            }),
          paymentCreateTransaction: (payload) =>
            paymentCreateTransaction({
              ...payload,
              outletId: activeOutletId ?? undefined,
              giftCardSettlementIds:
                giftCardSettlementIds.length > 0 ? giftCardSettlementIds : payload.giftCardSettlementIds,
            }),
          idempotencyKey: paymentIdempotencyKey,
          giftCardSettlementIds,
        });
        if (gatewayResult.outcome === "gateway_pending") {
          setPendingGatewayPayments(gatewayResult.gatewayPayments);
          paymentPollTransactionStatus(gatewayResult.transaction.id);
          if (gatewayResult.transaction.method === "qris" && gatewayResult.transaction.qrString) {
            setQrisModalSuppressedTxId(null);
            setShowQrisModal(true);
            toast.success(t("pos.qrisReady"));
          } else {
            toast.success(t("pos.checkoutCreated"));
          }
          return;
        }
      }

      await settleGiftCardAfterDirectPayment(currentOrderId, giftCardSettlementIds);
      if (loyaltyAccountId && appliedPoints > 0) {
        await enqueueRedemption({
          customerId: loyaltyAccountId,
          pointsUsed: appliedPoints,
          amountValue: Math.round(appliedPoints / 10),
          replayFingerprint: `pos-${currentOrderId}-${loyaltyAccountId}-${appliedPoints}`,
        });
      }
      useOrderPaymentHistoryStore.getState().refreshOrderAfterPaymentMutation(activeOutletId, currentOrderId);
      paymentDraft.clearDraft();
      clearCheckoutRecoveryState();
      checkoutAttemptIdRef.current = null;
      setCurrentOrderId(null);
      resetCart();
      clearQrOrderContext();
      setShowPayment(false);
      setSelectedCheckoutCode(null);
      toast.success(t("pos.staticQrisRecorded"));
      showInventoryPolicySuccessToast(stockEnforcementMode);
    } catch (e) {
      if (!(await handleCheckoutPaymentFailure(e))) {
        try {
          await fetchOrderRemote(currentOrderId);
          useOrderPaymentHistoryStore.getState().refreshOrderAfterPaymentMutation(activeOutletId, currentOrderId);
        } catch {
          // Best-effort sync after failed static QRIS commit.
        }
        toastApiError(e);
        setShowPayment(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetCart = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setSelectedTable("");
    setAppliedPoints(0);
    setAppliedGiftCardState(null);
    setRedeemPointsInput("");
    setShowDiscountModal(false);
  };

  const redeemGiftCardForOrder = async (orderId: string): Promise<number[]> => {
    if (!appliedGiftCardState || appliedGiftCardState.appliedAmount <= 0) {
      return [];
    }
    if (typeof activeOutletId !== "number" || activeOutletId < 1) {
      throw new Error("Select an outlet before redeeming a gift card.");
    }
    const result = await redeemGiftCard({
      outletId: activeOutletId,
      code: appliedGiftCardState.code,
      amount: appliedGiftCardState.appliedAmount,
      idempotencyKey: buildGiftCardRedeemIdempotencyKey(orderId, appliedGiftCardState.code),
      referenceType: "order",
      referenceId: String(orderId),
      meta: { source: "pos" },
    });
    const settlementId = Number(result.settlement.id);
    if (!Number.isFinite(settlementId) || settlementId <= 0) {
      throw new Error("Gift card redemption did not return a settlement id.");
    }
    return [settlementId];
  };

  const settleGiftCardAfterDirectPayment = async (orderId: string, settlementIds: number[]) => {
    if (settlementIds.length === 0 || typeof activeOutletId !== "number" || activeOutletId < 1) {
      return;
    }
    await settleGiftCardRedemptions({
      outletId: activeOutletId,
      idempotencyKey: buildGiftCardDirectSettleIdempotencyKey(orderId),
      settlementReference: `pos-order#${orderId}`,
      settlementStatus: "settled",
      redeemSettlementIds: settlementIds,
      meta: { trigger: "pos_direct_payment" },
    });
  };

  const applyPointsRedemption = () => {
    if (!loyaltyAccountId) {
      toast.error(t("shared.selectMemberCrm"));
      return;
    }
    const requested = Math.max(0, Number(redeemPointsInput || 0));
    const capped = Math.min(requested, availablePoints);
    setAppliedPoints(capped);
  };

  // Split bill helpers
  const initSplitBill = () => {
    if (shouldUpdateOpenBill(currentOrderId, currentOpenOrder)) {
      toast.error(t("pos.splitBlockedOpenBill"));
      return;
    }
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
        label: t("shared.person", { n: i + 1 }),
        items: [],
        payments: [],
        totalDue: i === count - 1 ? total - perPerson * (count - 1) : perPerson,
      }))
    );
  };

  const buildItemSplit = (count: number) => {
    setSplitPersons(
      Array.from({ length: count }, (_, i) => ({
        label: t("shared.person", { n: i + 1 }),
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

      const lines = cart.map((l) => ({ id: l.id, price: l.price, qty: l.qty }));
      const next = applyByItemTotalDuesWithTaxScale(updatedPeople, lines, total);
      return next.map((p) => ({ ...p, payments: [] }));
    });
    if (hadDraftPayments) {
      toast.message("Split payment drafts cleared — item assignment changed.");
    }
  };

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
      toast.error(t("shared.assignAllUnitsToast"));
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
      const code = POS_AUTO_ORDER_CODE;
      const { order: created } = await createOrderRemote({
        tenantId: POS_TENANT_ID,
        ...outletOrderFields,
        ...posSessionOrderFields,
        code,
        source: "pos",
        orderType,
        status: "confirmed",
        paymentStatus: "unpaid",
        payments: [],
        confirmedAt: new Date().toISOString(),
        idempotencyKey: checkoutAttemptIdRef.current ?? beginCheckoutAttempt("split-bill"),
        splitBill: { method: splitMethod === "equal" ? "equal" : "by-item", persons: splitPersons },
        ...qrOrderPayloadFields,
        ...buildCartPayload(cart, subtotal, tax, total, 0, customerName, customerPhone, selectedTable, memberIdForPayload),
      });
      setCurrentOrderId(created.id);
      if (qrOrderContext) {
        setQrOrderContext((prev) => (prev ? { ...prev, linkedOrderId: created.id } : prev));
      }
      const fresh = await fetchOrderRemote(created.id);
      const batch = buildSplitPaymentsPayload(fresh, splitPersons, splitMethod, cart);
      const immediatePayments = batch.filter((payment) => !isGatewayPaymentMethod(payment.method, checkoutMethods));
      const gatewayPayments = batch.filter((payment) => isGatewayPaymentMethod(payment.method, checkoutMethods));
      const giftCardSettlementIds = await redeemGiftCardForOrder(created.id);
      const paidOrder = immediatePayments.length > 0
        ? await addOrderPaymentsRemote(created.id, immediatePayments, paymentExtras)
        : fresh;
      if (immediatePayments.length > 0) {
        await settleGiftCardAfterDirectPayment(created.id, giftCardSettlementIds);
      }
      const totalPaid = paidOrder.payments.reduce((s, p) => s + p.amount, 0);
      if (gatewayPayments.length > 0) {
        const gatewayTotal = gatewayPayments.reduce((sum, payment) => sum + payment.amount, 0);
        const tx = await paymentCreateTransaction({
          orderId: created.id,
          outletId: activeOutletId ?? undefined,
          method: gatewayPayments.length === 1 ? gatewayPayments[0].method : "mixed",
          amount: gatewayTotal,
          splitPayments: gatewayPayments,
          giftCardSettlementIds: giftCardSettlementIds.length > 0 ? giftCardSettlementIds : undefined,
        });
        setCurrentOrderId(created.id);
        setPendingGatewayPayments(gatewayPayments);
        paymentPollTransactionStatus(tx.id);
        setShowSplit(false);
        setShowPayment(true);
        toast.success(t("shared.splitSavedGateway"), { icon: "💰" });
        return;
      }
      resetCart();
      setShowSplit(false);
      toast.success(t("shared.splitOrderSaved"), { icon: "💰" });
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
      toast.success(t("shared.paidVia", { label: recorded.label, amount: formatRp(recorded.amount), method }));
    }
  };

  useEffect(() => {
    if (!showPayment || !paymentTransaction || paymentTransaction.status !== "paid") return;
    if (!currentOrderId || pendingGatewayPayments.length === 0) return;
    void (async () => {
      const paymentsToCommit = pendingGatewayPayments;
      setPendingGatewayPayments([]);
      try {
        await addOrderPaymentsRemote(currentOrderId, paymentsToCommit, {
          idempotencyKey: beginOrderPaymentAttempt(currentOrderId),
          ...paymentExtras,
        });
        if (loyaltyAccountId && appliedPoints > 0) {
          await enqueueRedemption({
            customerId: loyaltyAccountId,
            pointsUsed: appliedPoints,
            amountValue: Math.round(appliedPoints / 10),
            replayFingerprint: `pos-${currentOrderId}-${loyaltyAccountId}-${appliedPoints}`,
          });
        }
        clearCheckoutRecoveryState();
        checkoutAttemptIdRef.current = null;
        setCurrentOrderId(null);
        resetCart();
        clearQrOrderContext();
        setShowPayment(false);
        setShowSplit(false);
        setSelectedCheckoutCode(null);
        setShowQrisModal(false);
        void paymentResetAsync();
        toast.success(t("shared.paymentCompleted"));
        showInventoryPolicySuccessToast(stockEnforcementMode);
      } catch (error) {
        setPendingGatewayPayments(paymentsToCommit);
        if (!(await handleCheckoutPaymentFailure(error))) {
          if (currentOrderId) {
            try {
              await fetchOrderRemote(currentOrderId);
              useOrderPaymentHistoryStore.getState().refreshOrderAfterPaymentMutation(activeOutletId, currentOrderId);
            } catch {
              // Best-effort sync after gateway payment commit failure.
            }
          }
          setShowQrisModal(false);
          setShowPayment(false);
          setSelectedCheckoutCode(null);
          void paymentResetAsync();
          toastApiError(error);
        }
      }
    })();
  }, [showPayment, paymentTransaction, currentOrderId, pendingGatewayPayments, addOrderPaymentsRemote, loyaltyAccountId, appliedPoints, enqueueRedemption, fetchOrderRemote, activeOutletId, paymentResetAsync]);

  const selectedApiMethod = selectedCheckoutMethod
    ? apiMethodFromCheckoutMethod(selectedCheckoutMethod)
    : null;
  const gatewayCheckoutActive =
    Boolean(selectedApiMethod && isGatewayPaymentMethod(selectedApiMethod) && paymentTransaction);
  const canRetryGatewayCheckout =
    gatewayCheckoutActive &&
    paymentTransaction &&
    isTerminalGatewayStatus(paymentTransaction.status);
  const gatewayCheckoutPending =
    gatewayCheckoutActive &&
    paymentTransaction?.status === "pending" &&
    selectedApiMethod !== null &&
    shouldBlockDuplicateGatewayAttempt(paymentTransaction.method, selectedApiMethod);

  const abandonPendingGatewayCheckout = async () => {
    if (!paymentTransaction || paymentTransaction.status !== "pending") {
      setShowQrisModal(false);
      return;
    }
    await paymentExpire(paymentTransaction.id);
    setShowQrisModal(false);
    setQrisModalSuppressedTxId(paymentTransaction.id);
    if (currentOrderId) {
      useOrderPaymentHistoryStore.getState().refreshOrderAfterPaymentMutation(activeOutletId, currentOrderId);
    }
  };

  const handleSelectPaymentMethod = (code: string) => {
    const nextMethod = findCheckoutMethod(checkoutMethods, code);
    const nextApiMethod = nextMethod ? apiMethodFromCheckoutMethod(nextMethod) : toApiPaymentMethod(code);
    const pending = paymentTransaction?.status === "pending" ? paymentTransaction : null;
    if (pending && !shouldBlockDuplicateGatewayAttempt(pending.method, nextApiMethod)) {
      void (async () => {
        try {
          await abandonPendingGatewayCheckout();
          setSelectedCheckoutCode(code);
          setShowStaticQrisModal(false);
          toast.success(t("shared.previousCheckoutCancelled"));
        } catch (error) {
          toastApiError(error);
        }
      })();
      return;
    }
    setSelectedCheckoutCode(code);
    setShowStaticQrisModal(false);
  };

  const handleChangePaymentMethodFromQris = () => {
    void (async () => {
      try {
        await abandonPendingGatewayCheckout();
        setSelectedCheckoutCode(null);
        setShowStaticQrisModal(false);
        toast.success(t("shared.chooseCashMethod"));
      } catch (error) {
        toastApiError(error);
      }
    })();
  };
  const paymentSubmitDisabled =
    submitting
    || paymentIsSubmitting
    || gatewayCheckoutPending
    || paymentAckRequired
    || (enableMultiPayment
      ? !isMultiPaymentDraftReady(enableMultiPayment, paymentDraft.lines, posPaymentBalanceDue)
      : !selectedCheckoutCode);

  const primaryPaymentActionLabel =
    canRetryGatewayCheckout && selectedApiMethod
      ? gatewayRetryLabel(selectedApiMethod)
      : submitting || paymentIsSubmitting
        ? t("shared.processingPayment")
        : paymentAckRequired
          ? t("pos.reviewCart")
          : t("shared.completePayment");

  const paymentCheckoutAmount =
    pendingGatewayPayments.length > 0
      ? pendingGatewayCheckoutTotal(pendingGatewayPayments)
      : paymentTransaction?.amount ?? posPaymentBalanceDue;
  const splitCheckoutActive = pendingGatewayPayments.length > 0;

  const handleGatewayRetry = async (transactionId: string) => {
    const tx = await paymentRetry(transactionId, {
      splitPayments:
        pendingGatewayPayments.length > 0
          ? splitPaymentsForGatewayCreate(pendingGatewayPayments)
          : undefined,
    });
    if (currentOrderId) {
      useOrderPaymentHistoryStore.getState().refreshOrderAfterPaymentMutation(activeOutletId, currentOrderId);
    }
    if (tx.method === "qris" && tx.qrString) {
      setQrisModalSuppressedTxId(null);
      setShowQrisModal(true);
    }
    return tx;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <ConnectivitySyncRibbon outletId={activeOutletId} terminalRegistrationReady={!menuLoading} />
      <div className="px-4 py-1 border-b border-border/40 bg-card/30">
        <PosSessionPanel outletId={activeOutletId} />
      </div>
      {qrOrderContext ? (
        <div
          className="px-4 py-2 border-b border-primary/20 bg-primary/5 text-xs font-semibold tracking-wide text-primary flex items-center justify-between gap-2"
          data-testid="pos-qr-order-badge"
        >
          <span>
            {t("pos.qrOrder", { code: qrOrderContext.requestCode })}{qrOrderContext.tableName ? t("pos.qrOrderTable", { name: qrOrderContext.tableName }) : ""}
          </span>
          <span className="text-[10px] font-medium uppercase text-primary/80" data-testid="pos-stock-mode-badge">
            {t("pos.stockMode", { mode: stockEnforcementMode ?? "deferred" })}
          </span>
        </div>
      ) : (
        <div
          className="px-4 py-2 border-b border-border/40 bg-muted/20 text-xs font-semibold tracking-wide text-muted-foreground flex items-center justify-between gap-2"
          data-testid="pos-direct-source-badge"
        >
          <span>{t("pos.directPos")}</span>
          <span className="text-[10px] font-medium uppercase" data-testid="pos-stock-mode-badge">
            {t("pos.stockMode", { mode: stockEnforcementMode ?? "deferred" })}
          </span>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
      {/* Menu Panel */}
      <div className="flex-1 flex flex-col min-w-0 p-4 md:p-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text" placeholder={t("pos.searchMenu")} value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex gap-1.5 bg-card rounded-xl p-1 border border-border">
            {orderTypes.map((type) => (
              <button key={type} onClick={() => setOrderType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${orderType === type ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >{orderTypeLabel(type)}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((c) => (
            <button key={c} onClick={() => setActiveCat(c)}
              className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${activeCat === c ? "bg-primary text-primary-foreground shadow-sm" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}
            >{categoryLabel(c)}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {(!activeOutletId || activeOutletId < 1) && (
            <div className="mb-4 p-4 rounded-xl border border-border bg-muted/20 text-sm text-muted-foreground text-center">
              {t("pos.loadMenuOutlet")}
            </div>
          )}
          <SkeletonBusyRegion busy={!!menuLoading} className="min-h-[12rem]" label={t("pos.loadingMenu")}>
            {menuLoading && <PosMenuGridSkeleton items={8} />}
            {menuError && !menuLoading && (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-center px-4">
              <p className="text-sm text-destructive">{t("pos.couldNotLoadMenu")}</p>
              <button
                type="button"
                onClick={() => void refetchMenu()}
                className="text-sm font-medium text-primary underline"
              >
                {t("shared.retry")}
              </button>
            </div>
          )}
            {!menuLoading && !menuError && menuItems.length === 0 && activeOutletId && activeOutletId >= 1 && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm text-center px-4">
              {t("pos.noMenuItems")}
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
                  <MenuItemImage
                    imageUrl={item.imageUrl}
                    imageVersion={item.imageVersion}
                    emoji={item.emoji}
                    name={item.name}
                    size="grid"
                  />
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
            <h2 className="font-bold text-foreground">{t("pos.currentOrder")}</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg">{t("pos.orderMeta", { type: orderTypeLabel(orderType), n: totalItems })}</span>
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
                <input type="text" placeholder={t("pos.customerName")} value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-background border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20" />
              </div>
              <div className="relative flex-1">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input type="text" placeholder={t("pos.phone")} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-background border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20" />
              </div>
            </div>
            {typeof activeOutletId === "number" && activeOutletId >= 1 ? (
              <button
                type="button"
                onClick={() => setShowReservationPicker(true)}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-lg bg-background border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="pos-select-reservation-btn"
              >
                {t("pos.selectReservation")}
              </button>
            ) : null}
            {activeReservationId && activeReservationLabel ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/60">
                <CalendarDays className="h-3.5 w-3.5 text-primary shrink-0" />
                <p className="text-xs text-foreground truncate flex-1">
                  {t("pos.reservationActive")} · {activeReservationLabel}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveReservationId(null);
                    setActiveReservationLabel(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive shrink-0"
                  aria-label={t("shared.cancel")}
                >
                  ×
                </button>
              </div>
            ) : null}
            {/* Member selector */}
            {selectedMember ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/50 border border-accent">
                <Star className="h-3.5 w-3.5 text-primary fill-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{selectedMember.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {selectedMember.memberNo ?? selectedMember.phone}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedMember(null);
                    void attachMemberToOpenOrder(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowMemberPicker(true)}
                disabled={typeof activeOutletId !== "number" || activeOutletId < 1}
                className="w-full px-3 py-2 rounded-lg bg-background border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("pos.selectMember")}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (cart.length === 0) {
                  toast.error(t("pos.discountModal.emptyCart"));
                  return;
                }
                setShowDiscountModal(true);
              }}
              disabled={cart.length === 0 || currentOpenOrder?.paymentStatus === "paid"}
              className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-primary/10 border border-primary/30 text-sm font-semibold text-primary hover:bg-primary/15 transition-colors disabled:opacity-50"
              data-testid="pos-discount-modal-open"
            >
              <Ticket className="h-4 w-4" />
              {t("pos.discountModal.openButton")}
            </button>
            {(currentOpenOrder?.promotion || currentOpenOrder?.voucher || appliedGiftCardState) && (
              <div className="flex flex-wrap gap-1.5">
                {currentOpenOrder?.promotion ? (
                  <button
                    type="button"
                    onClick={() => setShowDiscountModal(true)}
                    className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-[10px] font-medium text-amber-800 dark:text-amber-200"
                  >
                    {t("pos.discountModal.chipPromo", { amount: formatRp(promotionDiscount) })}
                  </button>
                ) : null}
                {currentOpenOrder?.voucher ? (
                  <button
                    type="button"
                    onClick={() => setShowDiscountModal(true)}
                    className="rounded-full bg-primary/10 border border-primary/30 px-2.5 py-1 text-[10px] font-medium text-primary"
                  >
                    {t("pos.discountModal.chipVoucher", { amount: formatRp(voucherDiscount) })}
                  </button>
                ) : null}
                {appliedGiftCardState ? (
                  <button
                    type="button"
                    onClick={() => setShowDiscountModal(true)}
                    className="rounded-full bg-muted border border-border px-2.5 py-1 text-[10px] font-medium text-foreground"
                  >
                    {t("pos.discountModal.chipGiftCard", { amount: formatRp(appliedGiftCardState.appliedAmount) })}
                  </button>
                ) : null}
              </div>
            )}
            {selectedMember && (
              <div className="space-y-2 rounded-lg border border-border/60 bg-background p-2.5">
                <p className="text-[11px] text-muted-foreground">
                  {t("pos.points")}: <span className="font-semibold text-foreground">{availablePoints}</span>
                </p>
                <div className="flex gap-2">
                  <input
                    value={redeemPointsInput}
                    onChange={(e) => setRedeemPointsInput(e.target.value)}
                    placeholder={t("pos.redeemPoints")}
                    className="w-full rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5 text-xs"
                  />
                  <button onClick={applyPointsRedemption} className="rounded-lg bg-muted px-2 py-1.5 text-xs font-medium">
                    {t("pos.apply")}
                  </button>
                </div>
              </div>
            )}
            {orderType === "Dine-in" && (
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                onFocus={requestTables}
                onMouseDown={requestTables}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground"
              >
                <option value="">{tablesLoading ? t("pos.loadingMenu") : t("pos.selectTable")}</option>
                {selectableTables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name} {t("pos.seats", { n: table.seats })}
                    {table.status === "reserved" ? t("pos.tableReserved") : ""}
                    {table.signals?.hasReservation && table.status !== "reserved" ? t("pos.tableReservation") : ""}
                    {((table.signals?.openBillCount ?? 0) > 0 || table.status === "occupied") ? t("pos.tableOpenBill") : ""}
                  </option>
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
                <p className="text-sm mt-3">{t("pos.noItemsYet")}</p>
                <p className="text-xs">{t("pos.tapToAdd")}</p>
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
                        placeholder={t("pos.addNotes")}
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
          {paymentStockError ? (
            <PosPaymentStockErrorAlert
              error={paymentStockError}
              onDismiss={() => {
                clearCheckoutRecoveryState();
                checkoutAttemptIdRef.current = null;
              }}
            />
          ) : null}
          {openBillRecoveryCode ? (
            <PosOpenBillRecoveryBanner
              orderCode={openBillRecoveryCode}
              onOpenBill={() => {
                if (currentOrderId) {
                  void fetchOrderRemote(currentOrderId);
                }
                clearCheckoutRecoveryState();
              }}
            />
          ) : null}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>{t("shared.subtotal")}</span><span>{formatRp(displaySubtotal)}</span></div>
            {currentOpenOrder?.voucher && displayDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>{t("pos.voucherDiscount")}</span>
                <span>-{formatRp(displayDiscount)}</span>
              </div>
            )}
            {currentOpenOrder?.promotion && !currentOpenOrder?.voucher && displayDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>{t("pos.promotionDiscount")}</span>
                <span>-{formatRp(displayDiscount)}</span>
              </div>
            )}
            {!currentOpenOrder?.voucher && !currentOpenOrder?.promotion && voucherDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>{t("pos.voucherDiscount")}</span>
                <span>-{formatRp(voucherDiscount)}</span>
              </div>
            )}
            {!currentOpenOrder?.voucher && !currentOpenOrder?.promotion && promotionDiscount > 0 && voucherDiscount <= 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>{t("pos.promotionDiscount")}</span>
                <span>-{formatRp(promotionDiscount)}</span>
              </div>
            )}
            {appliedPoints > 0 && (
              <div className="flex justify-between text-primary font-medium"><span>{t("pos.loyaltyRedemption")}</span><span>-{formatRp(Math.round(appliedPoints / 10))}</span></div>
            )}
            {appliedGiftCard > 0 && (
              <div className="flex justify-between text-primary font-medium">
                <span>{t("pos.giftCardCredit")}{appliedGiftCardState?.code ? ` (${appliedGiftCardState.code})` : ""}</span>
                <span>-{formatRp(appliedGiftCard)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground"><span>{t("pos.taxPercent")}</span><span>{formatRp(displayTax)}</span></div>
            <div className="flex justify-between font-bold text-foreground text-base pt-1 border-t border-border/50">
              <span>{t("pos.estimatedTotal")}</span>
              <span>{formatRp(total)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {orderType === "Dine-in" ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowConfirmOrderDialog(true)}
                  disabled={cart.length === 0 || submitting || menuLoading || !!menuError || !checkoutReady}
                  className="flex-1 py-3 rounded-xl bg-accent text-accent-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <ChefHat className="h-4 w-4" /> {t("pos.confirmOrder")}
                </button>
                <button onClick={() => void handlePayNow()} disabled={cart.length === 0 || submitting || paymentAckRequired || menuLoading || !!menuError || !checkoutReady}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  <CreditCard className="h-4 w-4" /> {t("pos.payNow")}
                </button>
              </>
            ) : (
              <button onClick={() => void handlePayNow()} disabled={cart.length === 0 || submitting || paymentAckRequired || menuLoading || !!menuError || !checkoutReady}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
                {t("pos.payAmount", { amount: formatRp(total) })}
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
              {t("pos.sendKitchenTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("pos.sendKitchenDesc")}
            </DialogDescription>
            <div className="grid gap-1.5 text-sm pt-2">
              <div>
                <span className="text-muted-foreground">{t("pos.itemsLabel")}:</span>{" "}
                <span className="font-medium text-foreground">{totalItems}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("shared.total")}:</span>{" "}
                <span className="font-semibold text-foreground">{formatRp(total)}</span>
              </div>
              {orderType === "Dine-in" && selectedTableLabel ? (
                <div>
                  <span className="text-muted-foreground">{t("pos.tableLabel")}:</span>{" "}
                  <span className="font-medium text-foreground">{selectedTableLabel}</span>
                </div>
              ) : null}
            </div>
          </DialogHeader>
          {printStatusOutletId ? (
            <PosPrintStatusBar outletId={printStatusOutletId} />
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={submitting} onClick={() => setShowConfirmOrderDialog(false)}>
              {t("shared.cancel")}
            </Button>
            <Button type="button" disabled={submitting} onClick={() => void confirmSendToKitchenFromDialog()}>
              {submitting ? t("pos.sending") : t("pos.sendToKitchen")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Sent Modal */}
      <AnimatePresence>
        {showConfirmSent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => startNewPosOrder()}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl p-8 max-w-sm w-full text-center pos-shadow-md">
              <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <ChefHat className="h-8 w-8 text-success" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">{t("pos.orderSentTitle")}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t("pos.orderSentSubtitle")}</p>
              <button onClick={() => startNewPosOrder()} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
                {t("pos.newOrder")}
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
              if (submitting || paymentIsSubmitting || paymentAckRequired) return;
              setShowQrisModal(false);
              setShowPayment(false);
            }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl p-4 sm:p-6 w-full max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto pos-shadow-md">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-foreground">{t("shared.payment")}</h3>
                <button
                  onClick={() => {
                    if (submitting || paymentIsSubmitting) return;
                    setShowQrisModal(false);
                    setShowPayment(false);
                  }}
                  disabled={submitting || paymentIsSubmitting}
                  className="p-1 rounded-lg hover:bg-muted disabled:opacity-40"
                >
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
              {paymentStockError ? (
                <PosPaymentStockErrorAlert
                  error={paymentStockError}
                  onDismiss={() => {
                    clearCheckoutRecoveryState();
                    checkoutAttemptIdRef.current = null;
                    setShowPayment(false);
                  }}
                />
              ) : null}
              {openBillRecoveryCode ? (
                <PosOpenBillRecoveryBanner orderCode={openBillRecoveryCode} />
              ) : null}
              <OrderMultiPaymentPanel
                balanceDue={posPaymentBalanceDue}
                alreadyPaid={posPaymentAlreadyPaid}
                orderTotal={posPaymentOrderTotal}
                draftLines={paymentDraft.lines}
                checkoutTiles={checkoutTiles}
                enableMultiPayment={enableMultiPayment}
                disabled={submitting || paymentIsSubmitting || paymentAckRequired}
                onAddLine={paymentDraft.addLine}
                onRemoveLine={paymentDraft.removeLine}
                onClearDraft={paymentDraft.clearDraft}
              />
              {!enableMultiPayment ? (
              <PaymentMethodTileGrid
                className="mb-6"
                tiles={checkoutTiles}
                selectedCode={selectedCheckoutCode}
                onSelect={handleSelectPaymentMethod}
                disabled={submitting || paymentIsSubmitting || paymentAckRequired}
              />
              ) : null}
              <button onClick={initSplitBill}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all mb-4">
                <SplitSquareHorizontal className="h-4 w-4" /> {t("shared.splitBill")}
              </button>
              <button
                onClick={() => void completeDirectPayment()}
                disabled={paymentSubmitDisabled}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity mb-3"
              >
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> {primaryPaymentActionLabel}
                </span>
              </button>
              {currentOrderId ? (
                <p className="mb-3 text-[11px] text-muted-foreground text-center">
                  {t("shared.checkoutOrder", { code: currentOpenOrder?.code ?? currentOrderId ?? "" })}{gatewayCheckoutPending ? t("shared.qrPaymentPending") : ""}
                </p>
              ) : null}
              {paymentTransaction &&
                (enableMultiPayment ||
                  (selectedCheckoutMethod && !isCashCheckoutMethod(selectedCheckoutMethod))) && (
                <div className="mb-3 rounded-xl border border-border p-3 space-y-2 text-xs">
                  <p className="font-semibold text-foreground">{t("shared.onlineCheckout")}</p>
                  <p className="text-muted-foreground">{t("shared.statusColon")} <span className="font-medium text-foreground">{paymentTransaction.status}</span></p>
                  {paymentTransaction.status === "paid" && (
                    <p className="rounded-lg bg-success/10 px-2 py-1 text-success">{t("shared.paymentRefreshing")}</p>
                  )}
                  {paymentTransaction.status === "expired" && (
                    <p className="rounded-lg bg-destructive/10 px-2 py-1 text-destructive">{t("shared.qrExpired")}</p>
                  )}
                  {paymentTransaction.status === "failed" && (
                    <p className="rounded-lg bg-destructive/10 px-2 py-1 text-destructive">{t("shared.qrFailed")}</p>
                  )}
                  {paymentTransaction.status === "cancelled" && (
                    <p className="rounded-lg bg-muted px-2 py-1 text-muted-foreground">{t("shared.qrCancelled")}</p>
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
                    <p className="text-muted-foreground">{t("shared.va")} <span className="font-medium text-foreground">{paymentTransaction.vaNumber}</span></p>
                  )}
                  <p className="text-muted-foreground">{t("shared.expiresInColon")} <span className="font-medium text-foreground">{paymentExpiryCountdown}s</span></p>
                  {paymentError && <p className="text-destructive">{paymentError}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => void handleGatewayRetry(paymentTransaction.id)} disabled={paymentIsSubmitting} className="rounded-lg border border-border px-2 py-1">{gatewayRetryLabel(paymentTransaction.method)}</button>
                    {showReconcile ? (
                      <button onClick={() => void paymentReconcile(paymentTransaction.id)} disabled={paymentIsSubmitting} className="rounded-lg border border-border px-2 py-1">{t("shared.reconcile")}</button>
                    ) : null}
                    <button onClick={() => void paymentExpire(paymentTransaction.id)} disabled={paymentIsSubmitting} className="rounded-lg border border-border px-2 py-1">{t("shared.expire")}</button>
                    {allowSandboxSimulation && (
                      <button onClick={() => void paymentSimulateSandboxPaid(paymentTransaction.id)} disabled={paymentIsSubmitting} className="rounded-lg border border-amber-500/30 px-2 py-1 text-amber-700 dark:text-amber-300">
                        {t("shared.simulateSandbox")}
                      </button>
                    )}
                  </div>
                </div>
              )}
              <PosPrintStatusBar outletId={printStatusOutletId} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <QrisPaymentModal
        open={showPayment && showQrisModal && !!paymentTransaction?.qrString}
        qrString={paymentTransaction?.qrString ?? ""}
        amount={paymentTransaction?.amount ?? paymentCheckoutAmount}
        expirySeconds={paymentExpiryCountdown}
        status={paymentTransaction?.status ?? "pending"}
        orderLabel={currentOpenOrder?.code ?? currentOrderId ?? undefined}
        outletLabel={typeof activeOutletId === "number" ? t("shared.outlet", { id: activeOutletId }) : undefined}
        isSubmitting={paymentIsSubmitting}
        error={paymentError}
        onRequestClose={() => {
          setShowQrisModal(false);
          if (paymentTransaction?.status === "pending") {
            setQrisModalSuppressedTxId(paymentTransaction.id);
          }
        }}
        checkoutHint={
          splitCheckoutActive
            ? t("shared.qrisSplitCheckoutHint")
            : t("shared.qrisCheckoutHint")
        }
        onChangePaymentMethod={handleChangePaymentMethodFromQris}
        onRetry={() => void (paymentTransaction ? handleGatewayRetry(paymentTransaction.id) : Promise.resolve())}
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
            toastApiError(error);
          } finally {
            setProviderSimulating(false);
          }
        })()}
      />
      <StaticQrisPaymentModal
        open={showPayment && showStaticQrisModal}
        imageUrl={String(selectedCheckoutMethod?.settings?.qr_image_url ?? "")}
        instructions={String(selectedCheckoutMethod?.settings?.instructions ?? "")}
        amount={
          pendingGatewayPayments.length > 0
            ? pendingGatewayCheckoutTotal(pendingGatewayPayments)
            : (currentOpenOrder?.total ?? total)
        }
        orderLabel={currentOpenOrder?.code ?? currentOrderId ?? undefined}
        isSubmitting={submitting}
        onRequestClose={() => setShowStaticQrisModal(false)}
        onChangePaymentMethod={() => {
          setShowStaticQrisModal(false);
          setSelectedCheckoutCode(null);
        }}
        onConfirmPaid={() => void confirmStaticQrisPayment()}
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
                <h3 className="text-lg font-bold text-foreground">{t("shared.splitBill")}</h3>
                <button onClick={() => setShowSplit(false)} className="p-1 rounded-lg hover:bg-muted"><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>

              <div className="text-center mb-5">
                <p className="text-sm text-muted-foreground">{t("shared.total")}</p>
                <p className="text-2xl font-bold text-foreground">{formatRp(total)}</p>
              </div>

              {/* Split method toggle */}
              <div className="flex gap-2 mb-4">
                <button onClick={() => { setSplitMethod("equal"); buildEqualSplit(splitCount); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${splitMethod === "equal" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {t("shared.equalSplit")}
                </button>
                <button onClick={() => { setSplitMethod("by-item"); buildItemSplit(splitCount); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${splitMethod === "by-item" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {t("shared.splitByItem")}
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
                  <p className="text-xs text-muted-foreground">{t("shared.people")}</p>
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
                  const hasDraftPayment = person.payments.length > 0;
                  const methodSummary = person.payments.map((p) => p.method).join(" + ");
                  return (
                    <div key={i} className="space-y-2">
                      <div className={`flex flex-wrap items-center gap-2 sm:gap-3 rounded-xl p-3 border transition-all ${isPaid ? "bg-success/5 border-success/20" : "bg-background border-border/50"}`}>
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
                onClick={() => void completeSplitOrder()}
                disabled={!allSplitPaid || !byItemAllocationComplete || splitPersons.length === 0 || submitting}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                {submitting
                  ? t("shared.saving")
                  : !byItemAllocationComplete && splitMethod === "by-item"
                    ? t("shared.assignAllItemUnits")
                    : allSplitPaid
                      ? t("shared.completeSplitOrder")
                      : t("shared.paidProgressTitle", { paid: splitPersons.filter((p) => p.payments.reduce((s, pm) => s + pm.amount, 0) >= p.totalDue && p.totalDue > 0).length, total: splitPersons.length })}
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
              <h3 className="font-semibold mb-3">{t("pos.selectMemberTitle")}</h3>
              <input
                autoFocus value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                placeholder={t("pos.memberSearchPlaceholder")}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm mb-3"
              />
              <div className="mb-3 rounded-xl border border-border/60 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t("pos.quickCreateMember")}</p>
                <input
                  value={quickMemberName}
                  onChange={(e) => setQuickMemberName(e.target.value)}
                  placeholder={t("pos.fullName")}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
                />
                <input
                  value={quickMemberPhone}
                  onChange={(e) => setQuickMemberPhone(e.target.value)}
                  placeholder={t("pos.phone")}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
                />
                <button
                  type="button"
                  disabled={quickMemberSaving || typeof activeOutletId !== "number"}
                  onClick={() => {
                    if (!quickMemberName.trim() || !quickMemberPhone.trim() || typeof activeOutletId !== "number") {
                      toast.error(t("pos.namePhoneRequired"));
                      return;
                    }
                    setQuickMemberSaving(true);
                    void quickCreateMember({
                      outletId: activeOutletId,
                      fullName: quickMemberName.trim(),
                      phone: quickMemberPhone.trim(),
                    })
                      .then((member) => selectMember(member))
                      .catch(toastApiError)
                      .finally(() => {
                        setQuickMemberSaving(false);
                        setQuickMemberName("");
                        setQuickMemberPhone("");
                      });
                  }}
                  className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                >
                  {quickMemberSaving ? t("shared.saving") : t("pos.createAndAttach")}
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto space-y-1">
                {membersLoading && (
                  <p className="text-xs text-muted-foreground px-1 py-1">{t("pos.searchingMembers")}</p>
                )}
                {searchResults.map((m) => (
                    <button key={m.id}
                      onClick={() => void selectMember(m)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted text-left">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.phone}</p>
                      </div>
                      {m.memberNo ? (
                        <span className="text-[10px] font-medium text-muted-foreground">{m.memberNo}</span>
                      ) : null}
                    </button>
                  ))}
              </div>
              <button onClick={() => { setShowMemberPicker(false); setMemberSearch(""); }}
                className="mt-3 w-full py-2 rounded-xl bg-muted text-sm font-medium hover:bg-accent">
                {t("shared.cancel")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {typeof activeOutletId === "number" && activeOutletId >= 1 ? (
        <>
          <PosDiscountModal
            open={showDiscountModal}
            onOpenChange={setShowDiscountModal}
            outletId={activeOutletId}
            cartLength={cart.length}
            baseTotal={baseTotal}
            currentOrder={currentOpenOrder}
            promotionCandidates={promotionEvaluateResult?.candidates ?? []}
            appliedGiftCard={appliedGiftCardState}
            paymentLocked={currentOpenOrder?.paymentStatus === "paid"}
            onEnsureDraftOrder={ensureDraftOrderForDiscount}
            onOrderUpdated={handleDiscountOrderUpdated}
            onGiftCardApplied={setAppliedGiftCardState}
            onGiftCardCleared={clearAppliedGiftCard}
          />
          <PosReservationPickerDialog
          open={showReservationPicker}
          outletId={activeOutletId}
          currentOrderId={currentOrderId}
          disabled={submitting}
          applyDeps={reservationApplyDeps}
          onClose={() => setShowReservationPicker(false)}
          onLoaded={(row) => setActiveReservationLabel(row.customerName)}
        />
        </>
      ) : null}
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
