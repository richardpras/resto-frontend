import { useEffect, useState } from "react";
import { Gift, Tag, Ticket } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";
import { ApiHttpError } from "@/lib/api-integration/client";
import { checkGiftCard } from "@/lib/api-integration/giftCardEndpoints";
import {
  applyOrderPromotion,
  applyOrderPromotionByCode,
  removeOrderPromotion,
  type PromotionCandidate,
} from "@/lib/api-integration/promotionEndpoints";
import {
  applyOrderVoucherByCode,
  removeOrderVoucher,
} from "@/lib/api-integration/orderVoucherEndpoints";
import {
  giftCardCheckErrorMessage,
  mapGiftCardApiError,
  resolveGiftCardApplyAmount,
  type AppliedGiftCardCheckout,
} from "@/features/pos/giftCardCheckoutUtils";
import type { Order } from "@/stores/orderStore";

function formatRp(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export type PosDiscountModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outletId: number | null;
  cartLength: number;
  baseTotal: number;
  currentOrder: Order | null;
  promotionCandidates: PromotionCandidate[];
  appliedGiftCard: AppliedGiftCardCheckout | null;
  paymentLocked: boolean;
  onEnsureDraftOrder: () => Promise<string>;
  onOrderUpdated: (orderId: string) => Promise<void>;
  onGiftCardApplied: (state: AppliedGiftCardCheckout) => void;
  onGiftCardCleared: () => void;
};

export function PosDiscountModal({
  open,
  onOpenChange,
  outletId,
  cartLength,
  baseTotal,
  currentOrder,
  promotionCandidates,
  appliedGiftCard,
  paymentLocked,
  onEnsureDraftOrder,
  onOrderUpdated,
  onGiftCardApplied,
  onGiftCardCleared,
}: PosDiscountModalProps) {
  const { t } = useOpsTranslation();
  const [activeTab, setActiveTab] = useState("promo");
  const [promoCode, setPromoCode] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardAmount, setGiftCardAmount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setPromoCode("");
      setVoucherCode("");
      setGiftCardCode("");
      setGiftCardAmount("");
      setLoading(false);
    }
  }, [open]);

  const voucherDiscount =
    currentOrder?.voucherPreview?.discount ?? currentOrder?.voucherDiscount ?? 0;
  const promotionDiscount =
    currentOrder?.promotionPreview?.discount ?? currentOrder?.promotionDiscount ?? 0;

  async function withDraftOrder(action: (orderId: string) => Promise<void>) {
    if (cartLength <= 0) {
      toast.error(t("pos.discountModal.emptyCart"));
      return;
    }
    setLoading(true);
    try {
      const orderId = await onEnsureDraftOrder();
      await action(orderId);
      await onOrderUpdated(orderId);
    } catch (e) {
      if (e instanceof ApiHttpError) {
        toast.error(e.message);
      } else if (e instanceof Error) {
        toast.error(e.message);
      } else {
        toast.error(t("pos.discountModal.applyFailed"));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyPromoCode() {
    const code = promoCode.trim();
    if (!code) return;
    await withDraftOrder(async (orderId) => {
      await applyOrderPromotionByCode(orderId, code);
      toast.success(t("pos.promotionApplied"));
      onOpenChange(false);
    });
  }

  async function handleApplyPromotionCandidate(promotionId: number) {
    await withDraftOrder(async (orderId) => {
      await applyOrderPromotion(orderId, promotionId);
      toast.success(t("pos.promotionApplied"));
      onOpenChange(false);
    });
  }

  async function handleRemovePromotion() {
    if (!currentOrder?.id) return;
    setLoading(true);
    try {
      await removeOrderPromotion(currentOrder.id);
      await onOrderUpdated(currentOrder.id);
      toast.success(t("pos.promotionRemoved"));
    } catch (e) {
      toastApiError(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyVoucherCode() {
    const code = voucherCode.trim();
    if (!code) return;
    await withDraftOrder(async (orderId) => {
      await applyOrderVoucherByCode(orderId, code);
      toast.success(t("pos.voucherApplied"));
      onOpenChange(false);
    });
  }

  async function handleRemoveVoucher() {
    if (!currentOrder?.id) return;
    setLoading(true);
    try {
      await removeOrderVoucher(currentOrder.id);
      await onOrderUpdated(currentOrder.id);
      toast.success(t("pos.voucherRemoved"));
    } catch (e) {
      toastApiError(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyGiftCard() {
    if (typeof outletId !== "number") {
      toast.error(t("shared.selectOutletGiftCard"));
      return;
    }
    const code = giftCardCode.trim();
    if (!code) {
      toast.error(t("shared.enterGiftCardCode"));
      return;
    }
    setLoading(true);
    try {
      const issuance = await checkGiftCard(outletId, code);
      const validationError = giftCardCheckErrorMessage(issuance);
      if (validationError) {
        toast.error(validationError);
        return;
      }
      const availableBalance = Number(issuance.balanceAmount ?? issuance.remainingAmount ?? 0);
      const requestedAmount = giftCardAmount.trim() === "" ? 0 : Number(giftCardAmount);
      if (giftCardAmount.trim() !== "" && (!Number.isFinite(requestedAmount) || requestedAmount <= 0)) {
        toast.error(t("shared.invalidGiftCardAmount"));
        return;
      }
      const appliedAmount = resolveGiftCardApplyAmount(requestedAmount, availableBalance, baseTotal);
      if (appliedAmount <= 0) {
        toast.error(t("shared.insufficientGiftCard"));
        return;
      }
      onGiftCardApplied({
        code,
        availableBalance,
        appliedAmount,
        instrumentType: issuance.instrumentType,
        status: issuance.status,
        expiresAt: issuance.expiresAt ?? null,
      });
      toast.success(t("shared.giftCardApplied"));
      onOpenChange(false);
    } catch (e) {
      const message = e instanceof ApiHttpError
        ? mapGiftCardApiError(e.message)
        : mapGiftCardApiError(e instanceof Error ? e.message : "Gift card validation failed.");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  function toastApiError(e: unknown) {
    if (e instanceof ApiHttpError) {
      toast.error(e.message);
    } else if (e instanceof Error) {
      toast.error(e.message);
    }
  }

  const disabled = loading || paymentLocked;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto p-6" data-testid="pos-discount-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Ticket className="h-5 w-5 text-primary" />
            {t("pos.discountModal.title")}
          </DialogTitle>
          <DialogDescription>{t("pos.discountModal.description")}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-3 h-11">
            <TabsTrigger value="promo" className="text-sm">
              <Tag className="h-3.5 w-3.5 mr-1.5" />
              {t("pos.discountModal.tabPromo")}
            </TabsTrigger>
            <TabsTrigger value="voucher" className="text-sm">
              <Ticket className="h-3.5 w-3.5 mr-1.5" />
              {t("pos.discountModal.tabVoucher")}
            </TabsTrigger>
            <TabsTrigger value="giftcard" className="text-sm">
              <Gift className="h-3.5 w-3.5 mr-1.5" />
              {t("pos.discountModal.tabGiftCard")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="promo" className="space-y-4 mt-4">
            {currentOrder?.promotion ? (
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                <p className="font-semibold text-foreground">{currentOrder.promotion.promotionName}</p>
                <p className="text-sm text-muted-foreground">{currentOrder.promotion.promotionCode}</p>
                <p className="text-emerald-600 font-medium">-{formatRp(promotionDiscount)}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => void handleRemovePromotion()}
                >
                  {t("pos.removePromotion")}
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t("pos.discountModal.promoCodeLabel")}
                  </label>
                  <input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder={t("pos.discountModal.promoCodePlaceholder")}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={disabled || !!currentOrder?.voucher}
                    autoFocus={activeTab === "promo"}
                  />
                </div>
                <Button
                  type="button"
                  className="w-full h-11"
                  disabled={disabled || !promoCode.trim() || !!currentOrder?.voucher}
                  onClick={() => void handleApplyPromoCode()}
                >
                  {loading ? "..." : t("pos.discountModal.apply")}
                </Button>
                {currentOrder?.voucher ? (
                  <p className="text-xs text-muted-foreground">{t("pos.promotionVoucherConflict")}</p>
                ) : null}
                {promotionCandidates.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("pos.discountModal.autoPromosTitle")}
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {promotionCandidates.map((row) => (
                        <button
                          key={row.promotionId}
                          type="button"
                          disabled={disabled}
                          onClick={() => void handleApplyPromotionCandidate(row.promotionId)}
                          className="w-full flex items-center justify-between rounded-xl border border-border px-4 py-3 text-left hover:bg-muted/50 disabled:opacity-50"
                        >
                          <div>
                            <p className="text-sm font-medium">{row.promotionName}</p>
                            <p className="text-xs text-muted-foreground">{row.promotionCode}</p>
                          </div>
                          <span className="text-sm font-semibold text-emerald-600">
                            -{formatRp(row.discountAmount)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="voucher" className="space-y-4 mt-4">
            {currentOrder?.voucher ? (
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                <p className="font-semibold text-foreground">
                  {currentOrder.voucher.voucherName ?? currentOrder.voucher.voucherCode}
                </p>
                <p className="text-sm text-muted-foreground">{currentOrder.voucher.voucherCode}</p>
                <p className="text-emerald-600 font-medium">-{formatRp(voucherDiscount)}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => void handleRemoveVoucher()}
                >
                  {t("pos.removeVoucher")}
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{t("pos.discountModal.voucherHint")}</p>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t("pos.discountModal.voucherCodeLabel")}
                  </label>
                  <input
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    placeholder={t("pos.discountModal.voucherCodePlaceholder")}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={disabled || !!currentOrder?.promotion}
                    autoFocus={activeTab === "voucher"}
                  />
                </div>
                <Button
                  type="button"
                  className="w-full h-11"
                  disabled={disabled || !voucherCode.trim() || !!currentOrder?.promotion}
                  onClick={() => void handleApplyVoucherCode()}
                >
                  {loading ? "..." : t("pos.discountModal.apply")}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="giftcard" className="space-y-4 mt-4">
            {appliedGiftCard ? (
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 text-sm">
                <p>
                  {t("shared.giftCardCodeLabel")}{" "}
                  <span className="font-semibold">{appliedGiftCard.code}</span>
                </p>
                <p>
                  {t("shared.giftCardAppliedLabel")}{" "}
                  <span className="font-semibold text-primary">{formatRp(appliedGiftCard.appliedAmount)}</span>
                </p>
                <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onGiftCardCleared}>
                  {t("pos.removeGiftCard")}
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{t("pos.giftCardHint")}</p>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t("pos.discountModal.giftCardCodeLabel")}
                  </label>
                  <input
                    value={giftCardCode}
                    onChange={(e) => setGiftCardCode(e.target.value)}
                    placeholder={t("pos.giftCardCode")}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={disabled}
                    autoFocus={activeTab === "giftcard"}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t("pos.giftCardAmount")}
                  </label>
                  <input
                    value={giftCardAmount}
                    onChange={(e) => setGiftCardAmount(e.target.value)}
                    placeholder={t("pos.giftCardAmount")}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={disabled}
                  />
                </div>
                <Button
                  type="button"
                  className="w-full h-11"
                  disabled={disabled || !giftCardCode.trim()}
                  onClick={() => void handleApplyGiftCard()}
                >
                  {loading ? "..." : t("pos.discountModal.apply")}
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
