import { AnimatePresence, motion } from "framer-motion";
import { X, FileText, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { OrderPaymentHistoryPanel } from "@/components/pos/OrderPaymentHistoryPanel";
import { ManagerRecoveryWizard } from "@/components/orders/recovery/ManagerRecoveryWizard";
import {
  formatRp,
  formatWhen,
  recoveryEventSummary,
  recoveryStatusChipClass,
} from "@/components/orders/recovery/recoveryShared";
import { Button } from "@/components/ui/button";
import { useReceiptDocumentStore } from "@/stores/receiptDocumentStore";
import { postPrintCustomerBill, postReceiptReprint } from "@/lib/api-integration/receiptDocumentEndpoints";
import { KitchenReprintModal } from "@/components/orders/KitchenReprintModal";
import { toast } from "sonner";
import { ApiHttpError } from "@/lib/api-integration/client";
import { useAuthStore } from "@/stores/authStore";
import { getOrdersExplorerUiCaps } from "@/stores/ordersExplorerCapabilities";
import { explorerDetailKey, useOrdersExplorerStore } from "@/stores/ordersExplorerStore";
import { useOutletStore } from "@/stores/outletStore";
import type { OrderApi } from "@/lib/api-integration/endpoints";
import { formatOrderSourceLabel } from "@/features/orders/orderSource";

function orderChannelLabel(order: OrderApi): string {
  const source = formatOrderSourceLabel(order.orderSource ?? null);
  const ch = order.orderChannel ? String(order.orderChannel).replace(/_/g, " ") : "";
  const sm = order.serviceMode ? String(order.serviceMode).replace(/_/g, " ") : "";
  return [source, ch, sm].filter((s) => s.length > 0).join(" · ");
}

export function OrderExplorerDetailModal() {
  const { t } = useTranslation("ops");
  const user = useAuthStore((s) => s.user);
  const caps = useMemo(() => getOrdersExplorerUiCaps(user), [user]);
  const outletId = useOutletStore((s) => s.activeOutletId);
  const selectedOrderId = useOrdersExplorerStore((s) => s.selectedOrderId);
  const closeOrderDetail = useOrdersExplorerStore((s) => s.closeOrderDetail);
  const ensureDetailLoaded = useOrdersExplorerStore((s) => s.ensureDetailLoaded);
  const detailKey = selectedOrderId ? explorerDetailKey(outletId, selectedOrderId) : "";
  const bucket = useOrdersExplorerStore((s) => (detailKey ? s.detailByKey[detailKey] : undefined));
  const pendingRecoveryLines = useMemo(() => {
    const items = bucket?.order?.items;
    if (!items?.length) return [];
    return items.filter((it) => (it.recoveryStatus ?? "").toLowerCase() === "recovery_pending");
  }, [bucket?.order?.items]);
  const openPreview = useReceiptDocumentStore((s) => s.openPreview);
  const [showKitchenReprint, setShowKitchenReprint] = useState(false);
  const [printingBill, setPrintingBill] = useState(false);
  const [reprintingId, setReprintingId] = useState<number | null>(null);

  const receiptKindLabel = (kind: string, splitId: number | null) => {
    if (kind === "customer_bill") return "Bill (proforma)";
    if (kind === "customer_receipt" && splitId != null) return `Receipt · split #${splitId}`;
    return kind.replace(/_/g, " ");
  };

  const handlePrintBill = async () => {
    if (!order || typeof outletId !== "number" || outletId < 1) return;
    if ((order.paymentStatus ?? "") === "paid") return;
    setPrintingBill(true);
    try {
      await postPrintCustomerBill(Number(order.id), outletId);
      toast.success("Bill dicetak — bukan struk final");
      void ensureDetailLoaded(selectedOrderId!, { force: true });
    } catch (error) {
      toast.error(error instanceof ApiHttpError ? error.message : "Gagal cetak bill.");
    } finally {
      setPrintingBill(false);
    }
  };

  const handleDirectReprint = async (historyId: number) => {
    setReprintingId(historyId);
    try {
      await postReceiptReprint(historyId);
      toast.success("Reprint queued");
    } catch (error) {
      toast.error(error instanceof ApiHttpError ? error.message : "Reprint failed.");
    } finally {
      setReprintingId(null);
    }
  };

  if (!selectedOrderId) return null;

  const order = bucket?.order;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => closeOrderDetail()}
        data-testid="order-explorer-detail-backdrop"
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-lg"
        >
          <div className="sticky top-0 z-10 flex items-start justify-between gap-2 border-b border-border/60 bg-card/95 backdrop-blur px-4 py-3">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-foreground truncate">{order?.code ?? "Order"}</h3>
              <p className="text-[11px] text-muted-foreground truncate">
                {order ? orderChannelLabel(order) : "Loading…"}
                {order?.outletId != null ? ` · Outlet #${order.outletId}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                aria-label="Refresh order detail"
                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground"
                onClick={() => void ensureDetailLoaded(selectedOrderId, { force: true })}
              >
                <RefreshCw className={`h-4 w-4 ${bucket?.loading ? "animate-spin" : ""}`} />
              </button>
              <button type="button" aria-label="Close" className="p-1.5 rounded-xl hover:bg-muted" onClick={() => closeOrderDetail()}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {bucket?.error ? <p className="text-sm text-destructive">{bucket.error}</p> : null}

            {caps.showOperationalCorrectionHint ? (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-950 dark:text-amber-100">
                {caps.canApproveItemRecovery ? (
                  <p>{t("managerRecovery.hint.manager", "Use the recovery wizard below to review escalations, record settlement audit, and execute cash refunds.")}</p>
                ) : (
                  <p>{t("managerRecovery.hint.readonly", "This screen is read-only for investigation.")}</p>
                )}
              </div>
            ) : null}

            {bucket?.loading && !order ? (
              <p className="text-xs text-muted-foreground" data-testid="order-explorer-detail-loading">
                Loading order…
              </p>
            ) : null}

            {order ? (
              <>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5">
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-semibold text-foreground">{order.status}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5">
                    <p className="text-muted-foreground">Payment</p>
                    <p className="font-semibold text-foreground">{order.paymentStatus}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5">
                    <p className="text-muted-foreground">Kitchen</p>
                    <p className="font-semibold text-foreground">{order.kitchenStatus ?? "—"}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5">
                    <p className="text-muted-foreground">Posted</p>
                    <p className="font-semibold text-foreground">{order.isPosted ? "Yes" : "No"}</p>
                  </div>
                </div>

                {order.memberId != null || order.memberName || order.memberNo ? (
                  <div className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2 text-[11px]">
                    <p className="text-muted-foreground">Member</p>
                    <p className="font-semibold text-foreground">
                      {order.memberName ?? "—"}
                      {order.memberNo ? ` · ${order.memberNo}` : ""}
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-wrap justify-between gap-2 text-sm border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold text-foreground">{formatRp(order.total)}</span>
                </div>

                {caps.canApproveItemRecovery && pendingRecoveryLines.length > 0 ? (
                  <ManagerRecoveryWizard
                    orderId={selectedOrderId}
                    order={order}
                    pendingLines={pendingRecoveryLines}
                    recoveryEvents={bucket?.recoveryEvents ?? []}
                    caps={caps}
                    onRefresh={() => void ensureDetailLoaded(selectedOrderId, { force: true })}
                    managerName={user?.name}
                  />
                ) : null}

                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Items</p>
                  <ul className="space-y-2">
                    {order.items.map((it) => (
                      <li key={String(it.orderItemId ?? it.id)} className="rounded-lg border border-border/60 bg-muted/15 px-2.5 py-2 text-[11px]">
                        <div className="flex justify-between gap-2 items-start">
                          <span className="font-medium text-foreground truncate">{it.name}</span>
                          <span className="text-muted-foreground shrink-0">×{it.qty}</span>
                        </div>
                        {caps.canViewRecoveryTimeline && it.recoveryStatus ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            <span
                              className={`inline-flex rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${recoveryStatusChipClass(it.recoveryStatus)}`}
                              data-testid="order-explorer-item-recovery-badge"
                            >
                              {String(it.recoveryStatus).replace(/_/g, " ")}
                            </span>
                            {it.recoveryReason ? (
                              <span className="text-[9px] text-muted-foreground leading-tight">{it.recoveryReason}</span>
                            ) : null}
                            {it.recoveryApprovedAt ? (
                              <span className="text-[9px] text-muted-foreground">Approved {formatWhen(it.recoveryApprovedAt)}</span>
                            ) : null}
                          </div>
                        ) : null}
                        {it.notes ? <p className="text-[10px] text-primary/80 italic mt-0.5">Note: {it.notes}</p> : null}
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatRp(it.price)} each</p>
                      </li>
                    ))}
                  </ul>
                </div>

                {order.splits && order.splits.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">Splits</p>
                    <ul className="space-y-1.5">
                      {order.splits.map((sp) => (
                        <li key={sp.id} className="rounded-lg border border-border/60 px-2 py-1.5 text-[11px] flex justify-between gap-2">
                          <span className="font-medium">{sp.label}</span>
                          <span className="text-muted-foreground">{sp.status}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <OrderPaymentHistoryPanel
                  outletId={outletId}
                  orderId={selectedOrderId}
                  orderChannelLabel={orderChannelLabel(order)}
                />

                {caps.canViewRecoveryTimeline ? (
                  <div data-testid="order-explorer-recovery-section">
                    <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                      Item recovery
                      {bucket?.recoveryRefreshing ? (
                        <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground shrink-0" aria-label="Refreshing recovery events" />
                      ) : null}
                    </p>
                    {!((bucket?.recoveryEvents ?? []).length) ? (
                      <p className="text-[11px] text-muted-foreground">No recovery events recorded for this order.</p>
                    ) : (
                      <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {(bucket?.recoveryEvents ?? []).map((ev) => (
                          <li key={ev.id} className="rounded-lg border border-border/50 bg-muted/10 px-2 py-1.5 text-[10px] leading-snug">
                            <div className="flex justify-between gap-2">
                              <span className="font-semibold text-foreground">{ev.eventCode.replace(/_/g, " ")}</span>
                              <span className="text-muted-foreground shrink-0">{formatWhen(ev.createdAt)}</span>
                            </div>
                            <p className="text-muted-foreground">{recoveryEventSummary(ev)}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs font-semibold text-foreground">Receipt / print history</p>
                    {caps.canUseReceiptActions && order && order.paymentStatus !== "paid" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px]"
                        disabled={printingBill}
                        onClick={() => void handlePrintBill()}
                      >
                        {printingBill ? "…" : "Cetak bill"}
                      </Button>
                    ) : null}
                    {caps.canUseReceiptActions && order ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px]"
                        onClick={() => setShowKitchenReprint(true)}
                      >
                        Reprint dapur
                      </Button>
                    ) : null}
                  </div>
                  {!caps.canUseReceiptActions ? (
                    <p className="text-[11px] text-muted-foreground">Receipt actions require POS access.</p>
                  ) : (bucket?.receipts?.length ?? 0) === 0 ? (
                    <p className="text-[11px] text-muted-foreground">No receipt renders stored for this order.</p>
                  ) : (
                    <ul className="space-y-1.5" data-testid="order-explorer-receipt-rows">
                      {(bucket?.receipts ?? []).map((r) => (
                        <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-2 py-1.5 text-[11px]">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {receiptKindLabel(r.kind, r.orderSplitId)}
                            </p>
                            <p className="text-muted-foreground">{formatWhen(r.createdAt)}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px]"
                              disabled={!caps.canUseReceiptActions || reprintingId === r.id}
                              onClick={() => void handleDirectReprint(r.id)}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" /> Reprint
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px]"
                              disabled={!caps.canUseReceiptActions}
                              onClick={() => void openPreview(r.id)}
                            >
                              <FileText className="h-3 w-3 mr-1" /> View
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {caps.canViewAuditTimeline ? (
                  <div data-testid="order-explorer-audit-section">
                    <p className="text-xs font-semibold text-foreground mb-2">Audit timeline</p>
                    {!bucket?.events.length ? (
                      <p className="text-[11px] text-muted-foreground">No POS events recorded for this order.</p>
                    ) : (
                      <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {bucket.events.map((ev) => (
                          <li key={ev.id} className="rounded-lg border border-border/50 bg-muted/10 px-2 py-1.5 text-[10px] leading-snug">
                            <div className="flex justify-between gap-2">
                              <span className="font-semibold text-foreground">{ev.eventType}</span>
                              <span className="text-muted-foreground shrink-0">{formatWhen(ev.occurredAt)}</span>
                            </div>
                            <p className="text-muted-foreground">
                              {ev.entityType} #{ev.entityId}
                              {ev.actorUserId != null ? ` · actor ${ev.actorUserId}` : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}

                <p className="text-[10px] text-muted-foreground border-t border-border/40 pt-2">
                  Created {formatWhen(order.createdAt)} {order.confirmedAt ? `· Confirmed ${formatWhen(order.confirmedAt)}` : ""}
                </p>
              </>
            ) : null}
          </div>
        </motion.div>
      </motion.div>

      {order ? (
        <KitchenReprintModal
          open={showKitchenReprint}
          orderId={Number(order.id)}
          items={order.items.map((it) => ({
            orderItemId: Number(it.orderItemId ?? it.id),
            name: it.name,
            qty: it.qty,
          }))}
          onClose={() => setShowKitchenReprint(false)}
        />
      ) : null}
    </AnimatePresence>
  );
}
