import type { MutableRefObject } from "react";
import { useState } from "react";
import {
  Plus,
  Minus,
  Trash2,
  MessageSquare,
  ChefHat,
  User,
  Phone,
  CreditCard,
  CalendarDays,
  Ticket,
  Star,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { Order } from "@/stores/orderStore";
import type { Member } from "@/stores/memberStore";
import type { AppliedGiftCardCheckout } from "@/features/pos/giftCardCheckoutUtils";
import type { PosStockErrorPayload } from "@/features/pos/posStockError";
import { OrderPaymentHistoryPanel } from "@/components/pos/OrderPaymentHistoryPanel";
import { PosOrderRecoveryPanel } from "@/components/pos/PosOrderRecoveryPanel";
import { PosPaymentStockErrorAlert } from "@/components/pos/PosPaymentStockErrorAlert";
import { PosOpenBillRecoveryBanner } from "@/components/pos/PosOpenBillRecoveryBanner";
import { Switch } from "@/components/ui/switch";

export type PosCartItem = {
  id: string;
  name: string;
  price: number;
  emoji: string;
  qty: number;
  notes: string;
};

type PosFloorTable = {
  id: string | number;
  name: string;
  seats: number;
  status: string;
  signals?: { hasReservation?: boolean; openBillCount?: number };
};

export type PosCartPanelProps = {
  t: (key: string, options?: Record<string, unknown>) => string;
  formatRp: (n: number) => string;
  orderType: string;
  orderTypeLabel: (type: string) => string;
  orderTypes: string[];
  setOrderType: (type: string) => void;
  totalItems: number;
  currentOrderId: number | null;
  activeOutletId: number | null;
  currentOpenOrder: Order | null;
  operationalChannelFromOrder: (order: Order | null) => string;
  customerName: string;
  setCustomerName: (v: string) => void;
  customerPhone: string;
  setCustomerPhone: (v: string) => void;
  setShowReservationPicker: (v: boolean) => void;
  submitting: boolean;
  activeReservationId: number | null;
  activeReservationLabel: string | null;
  setActiveReservationId: (v: number | null) => void;
  setActiveReservationLabel: (v: string | null) => void;
  selectedMember: Member | null;
  setSelectedMember: (v: Member | null) => void;
  attachMemberToOpenOrder: (memberId: number | null) => Promise<void>;
  setShowMemberPicker: (v: boolean) => void;
  cart: PosCartItem[];
  setShowDiscountModal: (v: boolean) => void;
  promotionDiscount: number;
  voucherDiscount: number;
  appliedGiftCardState: AppliedGiftCardCheckout | null;
  availablePoints: number;
  redeemPointsInput: string;
  setRedeemPointsInput: (v: string) => void;
  applyPointsRedemption: () => void;
  appliedPoints: number;
  selectedTable: string;
  setSelectedTable: (v: string) => void;
  requestTables: () => void;
  tablesLoading: boolean;
  selectableTables: PosFloorTable[];
  updateQty: (id: string, delta: number) => void;
  notesItem: string | null;
  setNotesItem: (v: string | null) => void;
  updateNotes: (id: string, notes: string) => void;
  paymentStockError: PosStockErrorPayload | null;
  clearCheckoutRecoveryState: () => void;
  checkoutAttemptIdRef: MutableRefObject<string | null>;
  openBillRecoveryCode: string | null;
  fetchOrderRemote: (id: number) => Promise<void>;
  displaySubtotal: number;
  displayDiscount: number;
  appliedGiftCard: number;
  displayTax: number;
  taxLabel: string;
  hasOutletTaxRules: boolean;
  applyTax: boolean;
  setApplyTax: (v: boolean) => void;
  total: number;
  setShowConfirmOrderDialog: (v: boolean) => void;
  checkoutReady: boolean;
  menuLoading: boolean;
  menuError: boolean | string | null;
  handlePayNow: () => Promise<void>;
  paymentAckRequired: boolean;
  handlePrintCustomerBill: () => Promise<void>;
  printingBill: boolean;
  setShowKitchenReprint: (v: boolean) => void;
  /** False when bridge + Bluetooth/Sunmi are all unavailable — disables Print bill / Reprint. */
  canPrint?: boolean;
  /** `sheet` hides duplicate title (Sheet already has one) and collapses order details by default. */
  layout?: "sidebar" | "sheet";
};

function ShoppingCartEmpty() {
  return (
    <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
      <svg className="h-8 w-8 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
    </div>
  );
}

export function PosCartPanel(props: PosCartPanelProps) {
  const {
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
    menuLoading,
    menuError,
    handlePayNow,
    paymentAckRequired,
    handlePrintCustomerBill,
    printingBill,
    setShowKitchenReprint,
    canPrint = true,
    layout = "sidebar",
  } = props;

  const isSheet = layout === "sheet";
  const [detailsOpen, setDetailsOpen] = useState(!isSheet);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={`shrink-0 border-b ${isSheet ? "px-3 pb-2 pt-0" : "p-4"}`}>
        {!isSheet ? (
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-bold text-foreground">{t("pos.currentOrder")}</h2>
            <span className="rounded-lg bg-muted px-2 py-1 text-sm text-muted-foreground">
              {t("pos.orderMeta", { type: orderTypeLabel(orderType), n: totalItems })}
            </span>
          </div>
        ) : null}

        {currentOrderId && typeof activeOutletId === "number" && activeOutletId >= 1 ? (
          <div className={detailsOpen || !isSheet ? "mb-2" : "mb-0"}>
            <OrderPaymentHistoryPanel
              outletId={activeOutletId}
              orderId={currentOrderId}
              orderChannelLabel={operationalChannelFromOrder(currentOpenOrder)}
            />
            <PosOrderRecoveryPanel order={currentOpenOrder} />
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setDetailsOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2 text-left touch-manipulation"
          aria-expanded={detailsOpen}
          data-testid="pos-cart-details-toggle"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">{t("pos.orderDetails")}</p>
            {(customerName.trim() || selectedTable || selectedMember) ? (
              <p className="truncate text-[11px] text-muted-foreground">
                {[
                  customerName.trim() || null,
                  selectedMember?.name ?? null,
                  selectedTable ? t("pos.tableSelectedShort") : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">{t("pos.orderDetailsHint")}</p>
            )}
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${detailsOpen ? "rotate-180" : ""}`}
          />
        </button>

        {detailsOpen ? (
        <div
          className={`mt-2 space-y-2 ${isSheet ? "max-h-[32dvh] overflow-y-auto overscroll-contain pr-0.5" : ""}`}
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <User className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("pos.customerName")}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-lg border border-border/50 bg-background py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <div className="relative flex-1">
              <Phone className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("pos.phone")}
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full rounded-lg border border-border/50 bg-background py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </div>
          </div>
          {typeof activeOutletId === "number" && activeOutletId >= 1 ? (
            <button
              type="button"
              onClick={() => setShowReservationPicker(true)}
              disabled={submitting}
              className="min-h-10 w-full rounded-lg border border-dashed border-border bg-background px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="pos-select-reservation-btn"
            >
              {t("pos.selectReservation")}
            </button>
          ) : null}
          {activeReservationId && activeReservationLabel ? (
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary" />
              <p className="flex-1 truncate text-sm text-foreground">
                {t("pos.reservationActive")} · {activeReservationLabel}
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveReservationId(null);
                  setActiveReservationLabel(null);
                }}
                className="min-h-10 min-w-10 shrink-0 text-sm text-muted-foreground hover:text-destructive"
                aria-label={t("shared.cancel")}
              >
                ×
              </button>
            </div>
          ) : null}
          <div
            className="flex gap-1.5 rounded-xl border border-border bg-background p-1"
            role="group"
            aria-label={t("pos.orderType", { defaultValue: "Order type" })}
            data-testid="pos-order-type-toggle"
          >
            {orderTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setOrderType(type)}
                className={`min-h-10 flex-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                  orderType === type
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {orderTypeLabel(type)}
              </button>
            ))}
          </div>
          {selectedMember ? (
            <div className="flex items-center gap-2 rounded-lg border border-accent bg-accent/50 px-3 py-2">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{selectedMember.name}</p>
                <p className="text-xs text-muted-foreground">{selectedMember.memberNo ?? selectedMember.phone}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedMember(null);
                  void attachMemberToOpenOrder(null);
                }}
                className="min-h-10 min-w-10 text-sm text-muted-foreground hover:text-destructive"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowMemberPicker(true)}
              disabled={typeof activeOutletId !== "number" || activeOutletId < 1}
              className="min-h-10 w-full rounded-lg border border-dashed border-border bg-background px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("pos.selectMember")}
            </button>
          )}
          {selectedMember && (
            <div className="space-y-2 rounded-lg border border-border/60 bg-background p-2.5">
              <p className="text-sm text-muted-foreground">
                {t("pos.points")}: <span className="font-semibold text-foreground">{availablePoints}</span>
              </p>
              <div className="flex gap-2">
                <input
                  value={redeemPointsInput}
                  onChange={(e) => setRedeemPointsInput(e.target.value)}
                  placeholder={t("pos.redeemPoints")}
                  className="min-h-10 w-full rounded-lg border border-border/60 bg-muted/20 px-2 py-2 text-sm"
                />
                <button onClick={applyPointsRedemption} className="min-h-10 rounded-lg bg-muted px-3 py-2 text-sm font-medium">
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
              className="min-h-10 w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
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
        ) : null}
      </div>

      <div className={`min-h-0 flex-1 space-y-2 overflow-y-auto ${isSheet ? "px-3 py-2" : "p-3 sm:p-4"}`}>
        <AnimatePresence>
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
              <ShoppingCartEmpty />
              <p className="text-sm mt-3">{t("pos.noItemsYet")}</p>
              <p className="text-sm">{t("pos.tapToAdd")}</p>
            </div>
          ) : (
            cart.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-background rounded-xl p-3 border border-border/50"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{formatRp(item.price)}</p>
                    {item.notes ? <p className="text-sm text-info mt-1 italic">📝 {item.notes}</p> : null}
                  </div>
                  <p className="text-sm font-bold text-foreground">{formatRp(item.price * item.qty)}</p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="h-11 w-11 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                    >
                      {item.qty === 1 ? (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      ) : (
                        <Minus className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-foreground">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="h-11 w-11 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                    >
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  <button
                    onClick={() => setNotesItem(notesItem === item.id ? null : item.id)}
                    className="h-11 w-11 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                  >
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                {notesItem === item.id ? (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} className="mt-2 overflow-hidden">
                    <textarea
                      rows={1}
                      value={item.notes}
                      onChange={(e) => updateNotes(item.id, e.target.value)}
                      placeholder={t("pos.addNotes")}
                      className="w-full resize-y min-h-11 max-h-28 text-sm px-3 py-2 rounded-lg bg-muted border-0 focus:outline-none focus:ring-1 focus:ring-primary/20 leading-snug [field-sizing:content]"
                    />
                  </motion.div>
                ) : null}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <div className={`shrink-0 space-y-2 border-t ${isSheet ? "px-3 py-2" : "px-3 py-3 sm:px-4"}`}>
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
          className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
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
                className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-200"
              >
                {t("pos.discountModal.chipPromo", { amount: formatRp(promotionDiscount) })}
              </button>
            ) : null}
            {currentOpenOrder?.voucher ? (
              <button
                type="button"
                onClick={() => setShowDiscountModal(true)}
                className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                {t("pos.discountModal.chipVoucher", { amount: formatRp(voucherDiscount) })}
              </button>
            ) : null}
            {appliedGiftCardState ? (
              <button
                type="button"
                onClick={() => setShowDiscountModal(true)}
                className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
              >
                {t("pos.discountModal.chipGiftCard", { amount: formatRp(appliedGiftCardState.appliedAmount) })}
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className={`shrink-0 space-y-3 border-t ${isSheet ? "px-3 pb-3 pt-2" : "p-3 sm:p-4"}`}>
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
          <div className="flex justify-between text-muted-foreground">
            <span>{t("shared.subtotal")}</span>
            <span>{formatRp(displaySubtotal)}</span>
          </div>
          {currentOpenOrder?.voucher && displayDiscount > 0 ? (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>{t("pos.voucherDiscount")}</span>
              <span>-{formatRp(displayDiscount)}</span>
            </div>
          ) : null}
          {currentOpenOrder?.promotion && !currentOpenOrder?.voucher && displayDiscount > 0 ? (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>{t("pos.promotionDiscount")}</span>
              <span>-{formatRp(displayDiscount)}</span>
            </div>
          ) : null}
          {!currentOpenOrder?.voucher && !currentOpenOrder?.promotion && voucherDiscount > 0 ? (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>{t("pos.voucherDiscount")}</span>
              <span>-{formatRp(voucherDiscount)}</span>
            </div>
          ) : null}
          {!currentOpenOrder?.voucher && !currentOpenOrder?.promotion && promotionDiscount > 0 && voucherDiscount <= 0 ? (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>{t("pos.promotionDiscount")}</span>
              <span>-{formatRp(promotionDiscount)}</span>
            </div>
          ) : null}
          {appliedPoints > 0 ? (
            <div className="flex justify-between text-primary font-medium">
              <span>{t("pos.loyaltyRedemption")}</span>
              <span>-{formatRp(Math.round(appliedPoints / 10))}</span>
            </div>
          ) : null}
          {appliedGiftCard > 0 ? (
            <div className="flex justify-between text-primary font-medium">
              <span>
                {t("pos.giftCardCredit")}
                {appliedGiftCardState?.code ? ` (${appliedGiftCardState.code})` : ""}
              </span>
              <span>-{formatRp(appliedGiftCard)}</span>
            </div>
          ) : null}
          {hasOutletTaxRules ? (
            <div className="flex items-center justify-between gap-3 py-1">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{t("pos.applyTax")}</p>
                {taxLabel ? <p className="text-xs text-muted-foreground truncate">{taxLabel}</p> : null}
              </div>
              <Switch checked={applyTax} onCheckedChange={setApplyTax} aria-label={t("pos.applyTax")} />
            </div>
          ) : null}
          {displayTax > 0 ? (
            <div className="flex justify-between text-muted-foreground">
              <span>{taxLabel ? t("pos.taxLine", { label: taxLabel }) : t("pos.tax")}</span>
              <span>{formatRp(displayTax)}</span>
            </div>
          ) : null}
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
                className="flex-1 py-3 rounded-xl bg-accent text-accent-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2 min-h-11"
              >
                <ChefHat className="h-4 w-4" /> {t("pos.confirmOrder")}
              </button>
              <button
                onClick={() => void handlePayNow()}
                disabled={
                  (cart.length === 0 && !(currentOrderId && currentOpenOrder?.paymentStatus !== "paid"))
                  || submitting
                  || paymentAckRequired
                  || menuLoading
                  || !!menuError
                  || !checkoutReady
                }
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2 min-h-11"
              >
                <CreditCard className="h-4 w-4" /> {t("pos.payNow")}
              </button>
            </>
          ) : (
            <button
              onClick={() => void handlePayNow()}
              disabled={
                (cart.length === 0 && !(currentOrderId && currentOpenOrder?.paymentStatus !== "paid"))
                || submitting
                || paymentAckRequired
                || menuLoading
                || !!menuError
                || !checkoutReady
              }
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity min-h-11"
            >
              {t("pos.payAmount", { amount: formatRp(total) })}
            </button>
          )}
        </div>
        {(cart.length > 0 || currentOrderId) && (
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => void handlePrintCustomerBill()}
              disabled={!canPrint || printingBill || submitting}
              title={!canPrint ? t("pos.printerUnavailable", { defaultValue: "No printer configured" }) : undefined}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold disabled:opacity-40 hover:bg-muted min-h-11"
            >
              {printingBill ? "…" : t("pos.printBill")}
            </button>
            {currentOrderId ? (
              <button
                type="button"
                onClick={() => setShowKitchenReprint(true)}
                disabled={!canPrint}
                title={!canPrint ? t("pos.printerUnavailable", { defaultValue: "No printer configured" }) : undefined}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold disabled:opacity-40 hover:bg-muted min-h-11"
              >
                {t("pos.reprintKitchen")}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
