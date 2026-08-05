import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Plus, Minus, Trash2, X,
  SplitSquareHorizontal, Printer, MessageSquare, CheckCircle2, ChefHat, Users, User, Phone, CreditCard, Undo2, CalendarDays, Ticket, ShoppingCart,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppOverlay } from "@/components/ui/AppOverlay";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsShortViewport } from "@/hooks/useBreakpoint";
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
import { computeOrderTax, formatTaxRulesLabel } from "@/features/pos/computeOrderTax";
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
import { BluetoothPrinterSetup } from "@/mobile/print/BluetoothPrinterSetup";
import { useOfflinePos } from "@/hooks/useOfflinePos";
import { useNativePrint } from "@/hooks/useNativePrint";
import { OfflineShiftBlocker } from "@/mobile/OfflineShiftBlocker";
import { useOfflineSyncStore } from "@/stores/offlineSyncStore";
import { PosCartPanel, type PosCartPanelProps } from "@/components/pos/PosCartPanel";
import { PosErrorBoundary } from "@/components/pos/PosErrorBoundary";
import { DISMISS_OVERLAYS_EVENT } from "@/components/auth/LockScreen";
import { resolvePosMenuDisplayState } from "@/features/pos/resolvePosMenuDisplayState";
import { isLocalOrderId } from "@/mobile/offline/offlineIdMapping";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PosSessionPanel } from "@/components/pos/PosSessionPanel";
import { usePosSessionStore } from "@/stores/posSessionStore";
import { canReconcilePayments } from "@/domain/permissionGates";
import { PosMenuGridSkeleton } from "@/components/skeletons/card/PosMenuGridSkeleton";
import { SkeletonBusyRegion } from "@/components/skeletons/SkeletonBusyRegion";
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
import {
  buildSplitPaymentForPerson,
  syncSplitPersonsToServer,
} from "@/features/pos/syncSplitPersonsToServer";
import { postPrintCustomerBill } from "@/lib/api-integration/receiptDocumentEndpoints";
import { CashTenderFields } from "@/components/pos/CashTenderFields";
import {
  cashSettlementFromDraft,
  computeCashChange,
  isCashTenderSufficient,
  parseCashTenderedInput,
} from "@/features/pos/cashTender";
import { KitchenReprintModal } from "@/components/orders/KitchenReprintModal";
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
  applyTax = false,
): Pick<
  CreateOrderPayload,
  "items" | "subtotal" | "tax" | "total" | "customerName" | "customerPhone" | "tableId" | "discountAmount" | "memberId" | "applyTax"
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
    applyTax,
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
  const [cashTenderedInput, setCashTenderedInput] = useState("");
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [showStaticQrisModal, setShowStaticQrisModal] = useState(false);
  const [qrisModalSuppressedTxId, setQrisModalSuppressedTxId] = useState<string | null>(null);
  const [showSplit, setShowSplit] = useState(false);
  const [applyTax, setApplyTax] = useState(false);
  const [showConfirmSent, setShowConfirmSent] = useState(false);
  const [showConfirmOrderDialog, setShowConfirmOrderDialog] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
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
  const [showKitchenReprint, setShowKitchenReprint] = useState(false);
  const [printingBill, setPrintingBill] = useState(false);
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

  const { menuApiItems, outletTaxRules, menuLoading, menuError, refetchMenu } = usePosBootstrap({
    tenantId: POS_TENANT_ID,
    outletId: activeOutletId,
  });

  const offlinePos = useOfflinePos({
    outletId: activeOutletId,
    tenantId: POS_TENANT_ID,
    createOrderRemote,
    addOrderPaymentsRemote,
    fetchOrderRemote,
  });

  const { printCustomerReceipt, printKitchenChit, isNativePrint } = useNativePrint(
    offlinePos.bootstrap,
    activeOutletId,
  );

  const isOnline = useOfflineSyncStore((s) => s.isOnline);

  useEffect(() => {
    if (!offlinePos.isNativeShell || !isOnline || !activeOutletId) return;
    if (!offlinePos.bootstrapReady && !offlinePos.bootstrapLoading) {
      void offlinePos.performBootstrap();
    }
  }, [
    activeOutletId,
    isOnline,
    offlinePos.bootstrapLoading,
    offlinePos.bootstrapReady,
    offlinePos.isNativeShell,
    offlinePos.performBootstrap,
  ]);

  const { data: onlineCheckoutMethods = FALLBACK_CHECKOUT_METHODS } = useOutletCheckoutMethods(activeOutletId, {
    enabled: (showPayment || showSplit) && !offlinePos.isOfflineMode,
  });
  const checkoutMethods = offlinePos.isOfflineMode
    ? (offlinePos.offlineCheckoutMethods as typeof onlineCheckoutMethods)
    : onlineCheckoutMethods;
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
    isOfflineMode: offlinePos.isOfflineMode,
  });

  const { requestTables, tablesLoading } = usePosLazyFloorTables({
    activeOutletId,
    orders,
    replaceFloorTables,
    orderType,
    isOfflineMode: offlinePos.isOfflineMode,
    offlineTables: offlinePos.offlineTables,
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

  useEffect(() => {
    if (currentOpenOrder) {
      setApplyTax(currentOpenOrder.applyTax ?? false);
      return;
    }
    setApplyTax(false);
  }, [currentOpenOrder?.id, currentOpenOrder?.applyTax]);

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

  // Keep the mobile cart sheet open under member/promo/reservation pickers.
  // Only dismiss it for full-screen checkout flows.
  useEffect(() => {
    if (showPayment || showSplit || showConfirmSent) {
      setMobileCartOpen(false);
    }
  }, [showPayment, showSplit, showConfirmSent]);

  useEffect(() => {
    const onDismissOverlays = () => {
      setMobileCartOpen(false);
      setShowPayment(false);
      setShowSplit(false);
      setShowQrisModal(false);
      setShowStaticQrisModal(false);
      setShowConfirmOrderDialog(false);
      setShowConfirmSent(false);
      setShowDiscountModal(false);
      setShowMemberPicker(false);
      setShowReservationPicker(false);
      setShowKitchenReprint(false);
      setCashTenderedInput("");
    };
    window.addEventListener(DISMISS_OVERLAYS_EVENT, onDismissOverlays);
    return () => window.removeEventListener(DISMISS_OVERLAYS_EVENT, onDismissOverlays);
  }, []);

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

  const offlineMenuRows = offlinePos.bootstrap?.menuItems?.data;
  const effectiveMenuApiItems =
    offlinePos.isOfflineMode && Array.isArray(offlineMenuRows)
      ? (offlineMenuRows as typeof menuApiItems)
      : menuApiItems;

  const effectiveOutletTaxRules =
    offlinePos.isOfflineMode && offlinePos.bootstrap
      ? ((offlinePos.bootstrap.outletTaxRules ?? []) as typeof outletTaxRules)
      : outletTaxRules;

  const { showMenuLoading, showMenuError } = resolvePosMenuDisplayState({
    isOfflineMode: offlinePos.isOfflineMode,
    offlineMenuCount: Array.isArray(offlineMenuRows) ? offlineMenuRows.length : 0,
    menuLoading,
    menuError,
  });

  const menuItems: MenuItem[] = useMemo(() => {
    return effectiveMenuApiItems
      .filter((m): m is NonNullable<typeof m> => !!m && typeof m === "object")
      .filter((m) => m.available !== false)
      .map((m) => ({
        id: String(m.id),
        name: String(m.name ?? ""),
        price: Number(m.price) || 0,
        category: m.menuCategory?.displayName?.trim()
          ? m.menuCategory.displayName
          : (m.menuCategory?.name?.trim() ? m.menuCategory.name : (m.category?.trim() ? m.category : "Uncategorized")),
        emoji: m.emoji ?? "🍽️",
        menuCategorySortOrder: m.menuCategory?.sortOrder ?? 100,
        imageUrl: m.imageUrl ?? null,
        imageVersion: m.imageVersion,
      }));
  }, [effectiveMenuApiItems]);

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
  const hasOutletTaxRules = effectiveOutletTaxRules.length > 0;
  const serviceModeForTax = orderType === "Takeaway" || orderType === "Online" ? "takeaway" : "dine_in";
  const clientTaxResult = useMemo(
    () => computeOrderTax({
      rules: effectiveOutletTaxRules,
      orderType,
      serviceMode: serviceModeForTax,
      subtotal,
      discount: checkoutDiscount,
      applyTax: hasOutletTaxRules && applyTax,
    }),
    [effectiveOutletTaxRules, orderType, serviceModeForTax, subtotal, checkoutDiscount, hasOutletTaxRules, applyTax],
  );
  const tax = clientTaxResult.tax;
  const clientBaseTotal = clientTaxResult.total;
  const taxLabel = formatTaxRulesLabel(effectiveOutletTaxRules);

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
  const cashSettlementAmount = enableMultiPayment
    ? cashSettlementFromDraft(paymentDraft.lines)
    : selectedCheckoutMethod && isCashCheckoutMethod(selectedCheckoutMethod)
      ? (pendingGatewayPayments.length > 0
          ? pendingGatewayCheckoutTotal(pendingGatewayPayments)
          : posPaymentBalanceDue)
      : 0;
  const showCashTenderFields = cashSettlementAmount > 0;

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
    (!showMenuLoading || cart.length > 0 || currentOrderId != null);

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
    buildCartPayload(cart, subtotal, tax, total, 0, customerName, customerPhone, selectedTable, memberIdForPayload, hasOutletTaxRules && applyTax);

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
    // Offline local orders: keep member on the draft UI only — no network attach.
    if (offlinePos.isOfflineMode && isLocalOrderId(currentOrderId)) {
      if (member) {
        setCustomerName(member.name);
        setCustomerPhone(member.phone);
        setSelectedMember(member);
      } else {
        setSelectedMember(null);
      }
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
    ...buildCartPayload(cart, subtotal, tax, total, 0, customerName, customerPhone, selectedTable, memberIdForPayload, hasOutletTaxRules && applyTax),
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
        ...buildCartPayload(cart, subtotal, tax, total, 0, customerName, customerPhone, selectedTable, memberIdForPayload, hasOutletTaxRules && applyTax),
      };
      const { order: storedOrder } = await offlinePos.createOrderWithOffline(payload);
      setCurrentOrderId(storedOrder.id);
      resetCart();
      clearQrOrderContext();
      setShowConfirmSent(true);
      if (isNativePrint) {
        void printKitchenChit(storedOrder);
      }
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
      setMobileCartOpen(false);
      setShowPayment(true);
      return;
    }
    beginCheckoutAttempt("pay-now");
    setMobileCartOpen(false);
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

    const cashSettled = cashSettlementFromDraft(draftLines);
    if (cashSettled > 0) {
      const tendered = parseCashTenderedInput(cashTenderedInput);
      if (!isCashTenderSufficient(tendered, cashSettled)) {
        toast.error(t("shared.cashTenderRequired"));
        return;
      }
      const change = computeCashChange(tendered, cashSettled);
      let attached = false;
      draftLines = draftLines.map((line) => {
        if (attached || String(line.method).toLowerCase() !== "cash") return line;
        attached = true;
        return { ...line, tenderedAmount: tendered, changeAmount: change };
      });
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
          if (isLocalOrderId(recoveryOrderId)) {
            const local = orders.find((o) => o.id === recoveryOrderId);
            if (!local) {
              throw new Error("Local offline order not found in session.");
            }
            storedOrder = local;
          } else if (shouldSyncCartToOpenBill(recoveryOrderId, currentOpenOrder, cart.length)) {
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
          ...buildCartPayload(cart, subtotal, tax, total, 0, customerName, customerPhone, selectedTable, memberIdForPayload, hasOutletTaxRules && applyTax),
        };
        const createResult = await offlinePos.createOrderWithOffline(payload);
        storedOrder = createResult.order;
        setCurrentOrderId(storedOrder.id);
        if (createResult.resumed && qrOrderContext) {
          setQrOrderContext((prev) => (prev ? { ...prev, linkedOrderId: storedOrder.id } : prev));
        }
      }

      // Local offline orders live only in the device store — never re-fetch from API.
      if (!isLocalOrderId(String(storedOrder.id))) {
        storedOrder = await fetchOrderRemote(String(storedOrder.id));
      } else {
        storedOrder =
          useOrderStore.getState().orders.find((o) => o.id === storedOrder.id) ?? storedOrder;
      }

      const orderBalanceDue = Math.max(
        0,
        storedOrder.total - storedOrder.payments.reduce((sum, payment) => sum + payment.amount, 0),
      );
      const paymentIdempotencyKey = beginOrderPaymentAttempt(String(storedOrder.id));
      const giftCardSettlementIds = isLocalOrderId(String(storedOrder.id))
        ? []
        : await redeemGiftCardForOrder(storedOrder.id);

      const result = await commitMultiPayment({
        orderId: storedOrder.id,
        outletId: activeOutletId!,
        balanceDue: orderBalanceDue,
        draftLines,
        checkoutMethods,
        addOrderPaymentsRemote: (orderId, payments, options) =>
          offlinePos.addPaymentsWithOffline(orderId, payments, {
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
        setCashTenderedInput("");
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
        if (currentOrderId && !isLocalOrderId(currentOrderId)) {
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

      const giftCardSettlementIds = isLocalOrderId(currentOrderId)
        ? []
        : await redeemGiftCardForOrder(currentOrderId);
      const paymentIdempotencyKey = beginOrderPaymentAttempt(currentOrderId);
      await offlinePos.addPaymentsWithOffline(currentOrderId, manualBatch, {
        idempotencyKey: paymentIdempotencyKey,
        ...paymentExtras,
      });
      setPendingManualQrisPayments([]);
      setShowStaticQrisModal(false);

      if (pendingGatewayLinesAfterManual.length > 0 && typeof activeOutletId === "number") {
        const fresh = isLocalOrderId(currentOrderId)
          ? (useOrderStore.getState().orders.find((o) => o.id === currentOrderId) ?? null)
          : await fetchOrderRemote(currentOrderId);
        if (!fresh) {
          toast.error(t("shared.somethingWrong", { defaultValue: "Something went wrong." }));
          return;
        }
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
            offlinePos.addPaymentsWithOffline(orderId, payments, {
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
        if (currentOrderId && !isLocalOrderId(currentOrderId)) {
          try {
            await fetchOrderRemote(currentOrderId);
            useOrderPaymentHistoryStore.getState().refreshOrderAfterPaymentMutation(activeOutletId, currentOrderId);
          } catch {
            // Best-effort sync after failed static QRIS commit.
          }
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
    if (isLocalOrderId(orderId)) {
      throw new Error(
        t("mobile.giftCardRequiresOnline", {
          defaultValue: "Gift card redemption requires an internet connection.",
        }),
      );
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
    setMobileCartOpen(false);
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
    return paid >= p.totalDue - 0.02 && p.totalDue > 0;
  });

  const byItemAllocationComplete = useMemo(() => {
    if (splitMethod !== "by-item") return true;
    return byItemFullyAllocated(splitPersons, cart.map((l) => ({ id: l.id, qty: l.qty })));
  }, [splitMethod, splitPersons, cart]);

  const ensureSplitOrderOnServer = async (): Promise<{ orderId: string; order: import("@/stores/orderStore").Order }> => {
    if (currentOrderId) {
      if (isLocalOrderId(currentOrderId)) {
        const local =
          useOrderStore.getState().orders.find((o) => o.id === currentOrderId)
          ?? orders.find((o) => o.id === currentOrderId);
        if (!local) {
          throw new Error("Local offline order not found in session.");
        }
        return { orderId: currentOrderId, order: local };
      }
      const fresh = await fetchOrderRemote(currentOrderId);
      return { orderId: currentOrderId, order: fresh };
    }
    const code = POS_AUTO_ORDER_CODE;
    const { order: created } = await offlinePos.createOrderWithOffline({
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
      ...buildCartPayload(cart, subtotal, tax, total, 0, customerName, customerPhone, selectedTable, memberIdForPayload, hasOutletTaxRules && applyTax),
    });
    setCurrentOrderId(created.id);
    if (qrOrderContext) {
      setQrOrderContext((prev) => (prev ? { ...prev, linkedOrderId: created.id } : prev));
    }
    if (isLocalOrderId(created.id)) {
      return { orderId: created.id, order: created };
    }
    const fresh = await fetchOrderRemote(created.id);
    return { orderId: created.id, order: fresh };
  };

  const finishPosSplitIfComplete = async (persons: SplitPerson[]) => {
    const done = persons.every((p) => {
      const paid = p.payments.reduce((s, pm) => s + pm.amount, 0);
      return paid >= p.totalDue - 0.02 && p.totalDue > 0;
    });
    if (!done) return;
    resetCart();
    setShowSplit(false);
    clearQrOrderContext();
    setCurrentOrderId(null);
    toast.success(t("shared.splitOrderSaved"), { icon: "💰" });
  };

  const handleSplitPersonPay = async () => {
    if (payingPersonIdx === null || !splitPayMethod) return;
    if (submitting) return;
    if (!requireOutletOrderContext()) return;
    const idx = payingPersonIdx;
    const method = splitPayMethod;
    const person = splitPersons[idx];
    if (!person) return;
    const alreadyPaid = person.payments.reduce((s, p) => s + p.amount, 0);
    const remaining = person.totalDue - alreadyPaid;
    if (remaining <= 0) return;

    setSubmitting(true);
    try {
      const { orderId, order: serverOrder } = await ensureSplitOrderOnServer();
      let persons = splitPersons;
      if (!persons.every((p) => p.serverSplitId != null && p.serverSplitId > 0)) {
        persons = await offlinePos.syncSplitsWithOffline(orderId, serverOrder, persons, splitMethod);
        setSplitPersons(persons);
      }
      const syncedPerson = persons[idx];
      if (!syncedPerson?.serverSplitId) {
        toast.error(t("pos.toasts.splitSyncFailed"));
        return;
      }
      const fresh = isLocalOrderId(orderId)
        ? (useOrderStore.getState().orders.find((o) => o.id === orderId) ?? serverOrder)
        : await fetchOrderRemote(orderId);
      const paidAt = new Date().toISOString();
      const payment = buildSplitPaymentForPerson(syncedPerson, method, remaining, fresh, splitMethod, paidAt);

      if (offlinePos.isGatewayBlockedOffline(payment.method, checkoutMethods)) {
        toast.error(t("mobile.gatewayBlockedOffline", { defaultValue: "This payment method requires an internet connection." }));
        return;
      }

      if (isGatewayPaymentMethod(payment.method, checkoutMethods)) {
        if (isLocalOrderId(orderId)) {
          toast.error(t("mobile.gatewayBlockedOffline", { defaultValue: "This payment method requires an internet connection." }));
          return;
        }
        const giftCardSettlementIds = await redeemGiftCardForOrder(orderId);
        const tx = await paymentCreateTransaction({
          orderId,
          outletId: activeOutletId ?? undefined,
          method: payment.method,
          amount: remaining,
          splitPayments: [payment],
          giftCardSettlementIds: giftCardSettlementIds.length > 0 ? giftCardSettlementIds : undefined,
        });
        setCurrentOrderId(orderId);
        setPendingGatewayPayments([payment]);
        paymentPollTransactionStatus(tx.id);
        setPayingPersonIdx(null);
        setSplitPayMethod(null);
        setShowSplit(false);
        setShowPayment(true);
        toast.success(t("shared.splitSavedGateway"), { icon: "💰" });
        return;
      }

      const giftCardSettlementIds = await redeemGiftCardForOrder(orderId);
      await offlinePos.addPaymentsWithOffline(orderId, [payment], paymentExtras);
      await settleGiftCardAfterDirectPayment(orderId, giftCardSettlementIds);

      const nextPersons = persons.map((p, i) =>
        i === idx
          ? { ...p, payments: [...p.payments, { method, amount: remaining, paidAt: new Date() }] }
          : p,
      );
      setSplitPersons(nextPersons);
      setPayingPersonIdx(null);
      setSplitPayMethod(null);
      toast.success(t("shared.paidVia", { label: syncedPerson.label, amount: formatRp(remaining), method }));
      await finishPosSplitIfComplete(nextPersons);
    } catch (e) {
      toastApiError(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintCustomerBill = async () => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1) return;
    setPrintingBill(true);
    try {
      let orderId = currentOrderId;
      let orderFromEnsure: Order | null = null;
      if (!orderId && cart.length > 0) {
        const created = await ensureSplitOrderOnServer();
        orderId = created.orderId;
        orderFromEnsure = created.order;
      }
      if (!orderId) return;
      const order =
        orderFromEnsure
        ?? orders.find((o) => o.id === orderId)
        ?? useOrderStore.getState().orders.find((o) => o.id === orderId)
        ?? (isLocalOrderId(orderId) ? null : await fetchOrderRemote(orderId));
      if (!order) {
        throw new Error(t("pos.toasts.orderNotFound", { defaultValue: "Order not found for printing." }));
      }
      if (isNativePrint) {
        const result = await printCustomerReceipt(order);
        if (!result.ok) throw new Error(result.error);
      } else if (isLocalOrderId(orderId)) {
        throw new Error(
          t("mobile.offlinePrintRequiresNative", {
            defaultValue: "Offline bill print requires the native POS app.",
          }),
        );
      } else {
        await postPrintCustomerBill(Number(orderId), activeOutletId);
      }
      toast.success(t("pos.toasts.billPrinted"));
    } catch (e) {
      toastApiError(e);
    } finally {
      setPrintingBill(false);
    }
  };

  useEffect(() => {
    if (!showPayment || !paymentTransaction || paymentTransaction.status !== "paid") return;
    if (!currentOrderId || pendingGatewayPayments.length === 0) return;
    void (async () => {
      const paymentsToCommit = pendingGatewayPayments;
      setPendingGatewayPayments([]);
      try {
        await offlinePos.addPaymentsWithOffline(currentOrderId, paymentsToCommit, {
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
          if (currentOrderId && !isLocalOrderId(currentOrderId)) {
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
      : !selectedCheckoutCode)
    || (showCashTenderFields
      && !isCashTenderSufficient(parseCashTenderedInput(cashTenderedInput), cashSettlementAmount));

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

  const cartPanelProps: PosCartPanelProps = {
    t,
    formatRp,
    orderType,
    orderTypeLabel,
    orderTypes,
    setOrderType,
    totalItems,
    currentOrderId,
    activeOutletId,
    currentOpenOrder,
    operationalChannelFromOrder,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    setShowReservationPicker,
    submitting,
    activeReservationId,
    activeReservationLabel,
    setActiveReservationId,
    setActiveReservationLabel,
    selectedMember,
    setSelectedMember,
    attachMemberToOpenOrder,
    setShowMemberPicker,
    cart,
    setShowDiscountModal,
    promotionDiscount,
    voucherDiscount,
    appliedGiftCardState,
    availablePoints,
    redeemPointsInput,
    setRedeemPointsInput,
    applyPointsRedemption,
    appliedPoints,
    selectedTable,
    setSelectedTable,
    requestTables,
    tablesLoading,
    selectableTables,
    updateQty,
    notesItem,
    setNotesItem,
    updateNotes,
    paymentStockError,
    clearCheckoutRecoveryState,
    checkoutAttemptIdRef,
    openBillRecoveryCode,
    fetchOrderRemote,
    displaySubtotal,
    displayDiscount,
    appliedGiftCard,
    displayTax,
    taxLabel,
    hasOutletTaxRules,
    applyTax,
    setApplyTax,
    total,
    setShowConfirmOrderDialog,
    checkoutReady,
    menuLoading: showMenuLoading,
    menuError: showMenuError,
    handlePayNow,
    paymentAckRequired,
    handlePrintCustomerBill,
    printingBill,
    setShowKitchenReprint,
  };

  const nestedCartPickerOpen =
    showMemberPicker || showDiscountModal || showReservationPicker;
  // Keep sheet mounted while nested pickers are open (same behavior as reservation).
  const cartSheetOpen = mobileCartOpen || nestedCartPickerOpen;

  const showMobileCartBar =
    (totalItems > 0 || !!currentOrderId)
    && !showPayment
    && !showSplit
    && !cartSheetOpen;
  const isPhoneViewport = useIsMobile();
  const isShortViewport = useIsShortViewport();

  return (
    <PosErrorBoundary>
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className={
          isShortViewport
            ? "flex items-center gap-2 border-b border-border/60 bg-muted/30 min-w-0 shrink-0"
            : "contents"
        }
      >
        <div className={isShortViewport ? "min-w-0 flex-1 overflow-hidden" : undefined}>
          <ConnectivitySyncRibbon
            outletId={activeOutletId}
            terminalRegistrationReady={!showMenuLoading}
            onManualSync={offlinePos.isNativeShell ? () => void offlinePos.manualSync() : undefined}
            showNativeControls={offlinePos.isNativeShell}
          />
        </div>
        {isShortViewport ? (
          <div className="pr-2 shrink-0">
            <BluetoothPrinterSetup outletId={activeOutletId} compact />
          </div>
        ) : (
          <BluetoothPrinterSetup outletId={activeOutletId} />
        )}
      </div>
      {offlinePos.showOfflineBlocker ? (
        <OfflineShiftBlocker onBootstrap={() => void offlinePos.performBootstrap()} loading={offlinePos.bootstrapLoading} />
      ) : (
      <>
      <div
        className={
          isShortViewport
            ? "px-3 py-0.5 border-b border-border/40 bg-card/30 flex items-center gap-2 min-h-0 shrink-0"
            : "px-4 py-1 border-b border-border/40 bg-card/30 shrink-0"
        }
      >
        <div className="min-w-0 flex-1">
          <PosSessionPanel outletId={activeOutletId} />
        </div>
      </div>
      {!isShortViewport && qrOrderContext ? (
        <div
          className="px-4 py-2 border-b border-primary/20 bg-primary/5 text-xs font-semibold tracking-wide text-primary flex items-center justify-between gap-2 shrink-0"
          data-testid="pos-qr-order-badge"
        >
          <span>
            {t("pos.qrOrder", { code: qrOrderContext.requestCode })}{qrOrderContext.tableName ? t("pos.qrOrderTable", { name: qrOrderContext.tableName }) : ""}
          </span>
          <span className="text-xs font-medium uppercase text-primary/80 sm:text-sm" data-testid="pos-stock-mode-badge">
            {t("pos.stockMode", { mode: stockEnforcementMode ?? "deferred" })}
          </span>
        </div>
      ) : null}
      <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Compact fixed filters; only the item grid scrolls */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-2 pt-2 sm:px-3 sm:pt-3 md:px-5 md:pt-4">
        <div className="mb-2 shrink-0 space-y-1.5 border-b border-border/40 bg-background pb-1.5">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("pos.searchMenu")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-card py-1.5 pl-8 pr-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="scrollbar-hide flex gap-1.5 overflow-x-auto pb-0.5">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setActiveCat(c)}
                className={`touch-manipulation whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  activeCat === c
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {categoryLabel(c)}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`h-0 min-h-0 flex-1 overflow-y-auto overscroll-y-auto touch-pan-y ${
            showMobileCartBar
              ? "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
              : "pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
          }`}
          data-testid="pos-menu-scroll"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {(!activeOutletId || activeOutletId < 1) && (
            <div className="mb-4 rounded-xl border border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
              {t("pos.loadMenuOutlet")}
            </div>
          )}
          <SkeletonBusyRegion busy={!!showMenuLoading} className="min-h-[12rem]" label={t("pos.loadingMenu")}>
            {showMenuLoading && <PosMenuGridSkeleton items={8} />}
            {showMenuError && !showMenuLoading && (
              <div className="flex h-48 flex-col items-center justify-center gap-2 px-4 text-center">
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
            {!showMenuLoading && !showMenuError && menuItems.length === 0 && activeOutletId && activeOutletId >= 1 && (
              <div className="flex h-48 flex-col items-center justify-center px-4 text-center text-sm text-muted-foreground">
                {t("pos.noMenuItems")}
              </div>
            )}
            {!showMenuLoading && !showMenuError && menuItems.length > 0 && (
              <div
                className={`grid gap-3 ${
                  isShortViewport
                    ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5"
                    : "grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
                }`}
              >
                {filtered.map((item) => {
                  const inCart = cart.find((c) => c.id === item.id);
                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => addToCart(item)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          addToCart(item);
                        }
                      }}
                      className={`relative cursor-pointer select-none rounded-2xl border bg-card text-left transition-transform touch-pan-y hover:pos-shadow-md active:scale-[0.98] ${
                        isShortViewport ? "p-2.5" : "p-4"
                      } ${inCart ? "border-primary/30 ring-1 ring-primary/10" : "border-border/50"}`}
                    >
                      <MenuItemImage
                        imageUrl={item.imageUrl}
                        imageVersion={item.imageVersion}
                        emoji={item.emoji}
                        name={item.name}
                        size="grid"
                      />
                      <p
                        className={`font-medium leading-tight text-foreground ${
                          isShortViewport ? "text-xs" : "text-sm"
                        }`}
                      >
                        {item.name}
                      </p>
                      <p
                        className={`mt-1 font-bold text-primary ${isShortViewport ? "text-xs" : "text-sm"}`}
                      >
                        {formatRp(item.price)}
                      </p>
                      {inCart && (
                        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {inCart.qty}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SkeletonBusyRegion>
        </div>
      </div>

      {/* Cart Panel — desktop */}
      <div className="hidden h-full min-h-0 w-[340px] shrink-0 flex-col border-l bg-card lg:flex lg:w-[380px]">
        <PosCartPanel {...cartPanelProps} />
      </div>

      {/* Mobile cart bottom bar */}
      {showMobileCartBar ? (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-chrome bg-card border-t border-border p-4 safe-area-pb">
          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-3 min-h-11"
            aria-label={t("pos.openCartAria")}
            data-testid="pos-mobile-cart-bar"
          >
            <ShoppingCart className="h-5 w-5" />
            {t("pos.viewCart", { n: totalItems, total: formatRp(total) })}
          </button>
        </div>
      ) : null}

      <Sheet
        open={cartSheetOpen}
        onOpenChange={(open) => {
          // Nested pickers stack on the cart — never dismiss the sheet under them.
          if (!open && nestedCartPickerOpen) return;
          setMobileCartOpen(open);
        }}
      >
        <SheetContent
          side="bottom"
          className="lg:hidden flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden rounded-none border-0 p-0 pt-[env(safe-area-inset-top)]"
          data-testid="pos-mobile-cart-sheet"
          onInteractOutside={(event) => {
            if (nestedCartPickerOpen) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (nestedCartPickerOpen) event.preventDefault();
          }}
          onFocusOutside={(event) => {
            if (nestedCartPickerOpen) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (nestedCartPickerOpen) event.preventDefault();
          }}
        >
          <SheetHeader className="shrink-0 space-y-0 border-b px-3 py-2 text-left">
            <div className="flex items-baseline justify-between gap-2 pr-8">
              <SheetTitle className="text-base leading-none">{t("pos.currentOrder")}</SheetTitle>
              <span className="shrink-0 text-xs text-muted-foreground">
                {t("pos.orderMeta", { type: orderTypeLabel(orderType), n: totalItems })}
              </span>
            </div>
            <SheetDescription className="sr-only">
              {t("pos.orderMeta", { type: orderTypeLabel(orderType), n: totalItems })}
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <PosCartPanel {...cartPanelProps} layout="sheet" />
          </div>
        </SheetContent>
      </Sheet>
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
      <AppOverlay
        open={showConfirmSent}
        onClose={() => startNewPosOrder()}
        layer="modal"
        panelClassName="p-8 max-w-sm text-center"
      >
        <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
          <ChefHat className="h-8 w-8 text-success" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1">{t("pos.orderSentTitle")}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t("pos.orderSentSubtitle")}</p>
        <button onClick={() => startNewPosOrder()} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
          {t("pos.newOrder")}
        </button>
      </AppOverlay>

      {/* Payment Modal — centered compact sheet, actions pinned */}
      <AppOverlay
        open={showPayment && !showSplit}
        layer="modal"
        align="center"
        dismissible={!submitting && !paymentIsSubmitting && !paymentAckRequired}
        data-testid="pos-payment-overlay"
        onClose={() => {
          if (submitting || paymentIsSubmitting || paymentAckRequired) return;
          setShowQrisModal(false);
          setShowPayment(false);
          setCashTenderedInput("");
        }}
        panelClassName="!max-h-[min(92dvh,36rem)] !overflow-hidden flex w-[min(100%,24rem)] flex-col p-3 sm:p-4"
      >
              <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
                <h3 className="text-base font-bold text-foreground">{t("shared.payment")}</h3>
                <button
                  onClick={() => {
                    if (submitting || paymentIsSubmitting) return;
                    setShowQrisModal(false);
                    setShowPayment(false);
                    setCashTenderedInput("");
                  }}
                  disabled={submitting || paymentIsSubmitting}
                  className="rounded-lg p-1 hover:bg-muted disabled:opacity-40"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              <div className="mb-2 shrink-0 text-center">
                <p className="text-[11px] text-muted-foreground">{t("shared.balanceDue")}</p>
                <p className="text-2xl font-bold tabular-nums text-foreground leading-tight">
                  {formatRp(paymentCheckoutAmount)}
                </p>
                {splitCheckoutActive ? (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{t("shared.splitGatewayPortion")}</p>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain">
              {paymentStockError ? (
                <PosPaymentStockErrorAlert
                  error={paymentStockError}
                  onDismiss={() => {
                    clearCheckoutRecoveryState();
                    checkoutAttemptIdRef.current = null;
                    setShowPayment(false);
                    setCashTenderedInput("");
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
                className="mb-1"
                tiles={checkoutTiles}
                selectedCode={selectedCheckoutCode}
                onSelect={(code) => {
                  handleSelectPaymentMethod(code);
                  setCashTenderedInput("");
                }}
                disabled={submitting || paymentIsSubmitting || paymentAckRequired}
              />
              ) : null}
              {showCashTenderFields ? (
                <CashTenderFields
                  settledAmount={cashSettlementAmount}
                  tenderedInput={cashTenderedInput}
                  onTenderedInputChange={setCashTenderedInput}
                  disabled={submitting || paymentIsSubmitting || paymentAckRequired}
                />
              ) : null}
              {currentOrderId ? (
                <p className="text-center text-[11px] text-muted-foreground">
                  {t("shared.checkoutOrder", { code: currentOpenOrder?.code ?? currentOrderId ?? "" })}{gatewayCheckoutPending ? t("shared.qrPaymentPending") : ""}
                </p>
              ) : null}
              {paymentTransaction &&
                (enableMultiPayment ||
                  (selectedCheckoutMethod && !isCashCheckoutMethod(selectedCheckoutMethod))) && (
                <div className="space-y-2 rounded-xl border border-border p-2.5 text-xs">
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
                  <div className="flex flex-wrap gap-2">
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
              </div>

              <div className="mt-2 flex shrink-0 gap-2 border-t border-border/50 pt-2">
                <button
                  type="button"
                  onClick={initSplitBill}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-2 py-2.5 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:text-foreground"
                >
                  <SplitSquareHorizontal className="h-3.5 w-3.5" /> {t("shared.splitBill")}
                </button>
                <button
                  type="button"
                  onClick={() => void completeDirectPayment()}
                  disabled={paymentSubmitDisabled}
                  className="inline-flex flex-[1.4] items-center justify-center gap-1.5 rounded-xl bg-primary px-2 py-2.5 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> {primaryPaymentActionLabel}
                </button>
              </div>
      </AppOverlay>
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
      <AppOverlay
        open={showSplit}
        onClose={() => setShowSplit(false)}
        layer="modal"
        align={isPhoneViewport ? "bottom" : "center"}
        panelClassName="p-6 max-w-lg"
        data-testid="pos-split-overlay"
      >
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
                                  onClick={() => void handleSplitPersonPay()}
                                  disabled={!splitPayMethod || submitting}
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

              <p className="text-center text-xs text-muted-foreground py-2">
                {submitting
                  ? t("shared.saving")
                  : !byItemAllocationComplete && splitMethod === "by-item"
                    ? t("shared.assignAllItemUnits")
                    : allSplitPaid
                      ? t("shared.splitOrderSaved")
                      : t("shared.paidProgressTitle", {
                          paid: splitPersons.filter(
                            (p) => p.payments.reduce((s, pm) => s + pm.amount, 0) >= p.totalDue - 0.02 && p.totalDue > 0,
                          ).length,
                          total: splitPersons.length,
                        })}
              </p>
      </AppOverlay>

      {/* Member picker */}
      <AppOverlay
        open={showMemberPicker}
        onClose={() => setShowMemberPicker(false)}
        layer="modal"
        panelClassName="p-5"
      >
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
                        <span className="text-xs font-medium text-muted-foreground">{m.memberNo}</span>
                      ) : null}
                    </button>
                  ))}
              </div>
              <button onClick={() => { setShowMemberPicker(false); setMemberSearch(""); }}
                className="mt-3 w-full py-2 rounded-xl bg-muted text-sm font-medium hover:bg-accent">
                {t("shared.cancel")}
              </button>
      </AppOverlay>

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

      {currentOrderId ? (
        <KitchenReprintModal
          open={showKitchenReprint}
          orderId={Number(currentOrderId)}
          items={(currentOpenOrder?.items ?? []).map((it) => ({
            orderItemId: Number(it.orderItemId ?? it.id),
            name: it.name,
            qty: it.qty,
          }))}
          onClose={() => setShowKitchenReprint(false)}
        />
      ) : null}
      </>
      )}
    </div>
    </PosErrorBoundary>
  );
}
