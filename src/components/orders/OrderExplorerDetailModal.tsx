import { AnimatePresence, motion } from "framer-motion";
import { X, FileText, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { OrderPaymentHistoryPanel } from "@/components/pos/OrderPaymentHistoryPanel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useReceiptDocumentStore } from "@/stores/receiptDocumentStore";
import { useAuthStore } from "@/stores/authStore";
import { getOrdersExplorerUiCaps } from "@/stores/ordersExplorerCapabilities";
import { explorerDetailKey, useOrdersExplorerStore } from "@/stores/ordersExplorerStore";
import { useOutletStore } from "@/stores/outletStore";
import type { OrderApi, OrderItemRecoveryEventApi } from "@/lib/api-integration/endpoints";

function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

function orderChannelLabel(order: OrderApi): string {
  const src = order.source === "qr" ? "QR" : "POS";
  const ch = order.orderChannel ? String(order.orderChannel).replace(/_/g, " ") : "";
  const sm = order.serviceMode ? String(order.serviceMode).replace(/_/g, " ") : "";
  return [src, ch, sm].filter((s) => s.length > 0).join(" · ");
}

function formatWhen(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });
}

function recoveryStatusChipClass(status: string | null | undefined): string {
  const s = (status ?? "").toLowerCase();
  if (!s) return "bg-muted/40 text-muted-foreground border-border/60";
  if (s === "refunded" || s === "rejected") return "bg-destructive/10 text-destructive border-destructive/25";
  if (s === "recovery_pending" || s === "unavailable") return "bg-amber-500/15 text-amber-950 dark:text-amber-100 border-amber-500/30";
  if (s === "replaced" || s === "recovery_approved") return "bg-primary/10 text-primary border-primary/25";
  return "bg-muted/30 text-foreground border-border/60";
}

function recoveryEventSummary(ev: OrderItemRecoveryEventApi): string {
  if (ev.eventCode === "recovery_settlement_recorded") {
    const p = ev.payload as Record<string, unknown> | null | undefined;
    const refund = typeof p?.partialRefundCapped === "number" ? p.partialRefundCapped : Number(p?.partialRefundCapped ?? 0);
    const credit = typeof p?.storeCreditAmount === "number" ? p.storeCreditAmount : Number(p?.storeCreditAmount ?? 0);
    const gift = typeof p?.giftCardAmount === "number" ? p.giftCardAmount : Number(p?.giftCardAmount ?? 0);
    const delta = typeof p?.replacementDelta === "number" ? p.replacementDelta : Number(p?.replacementDelta ?? 0);
    const lr = typeof p?.loyaltyRollbackPoints === "number" ? p.loyaltyRollbackPoints : Number(p?.loyaltyRollbackPoints ?? 0);
    const parts = [`Item #${ev.orderItemId}`, "settlement audit"];
    parts.push(`refund cap ${formatRp(refund)}`);
    if (credit > 0) parts.push(`store credit ${formatRp(credit)}`);
    if (gift > 0) parts.push(`gift card ${formatRp(gift)}`);
    if (delta !== 0) parts.push(`replacement Δ ${formatRp(delta)}`);
    if (lr > 0) parts.push(`loyalty rollback ${lr} pts`);
    return parts.join(" · ");
  }
  const parts: string[] = [];
  parts.push(`Item #${ev.orderItemId}`);
  if (ev.recoveryStatus) parts.push(String(ev.recoveryStatus).replace(/_/g, " "));
  if (ev.reason) parts.push(ev.reason);
  const p = ev.payload;
  if (p && typeof p === "object" && "previous" in p && p.previous != null) {
    parts.push(`was: ${String(p.previous)}`);
  }
  if (p && typeof p === "object" && "replacedByOrderItemId" in p && p.replacedByOrderItemId != null) {
    parts.push(`→ item #${String(p.replacedByOrderItemId)}`);
  }
  return parts.join(" · ");
}

const RECOVERY_RESOLUTION_OPTIONS: { value: string; label: string }[] = [
  { value: "recovery_approved", label: "Approve (recovery OK)" },
  { value: "refunded", label: "Mark refunded" },
  { value: "replaced", label: "Mark replaced" },
  { value: "clear", label: "Clear / dismiss flag" },
];

function RecoverySettlementBlock({
  orderId,
  orderItemId,
  paymentStatus,
}: {
  orderId: string;
  orderItemId: string | number;
  paymentStatus: string;
}) {
  const previewRecoverySettlement = useOrdersExplorerStore((s) => s.previewRecoverySettlement);
  const recordRecoverySettlement = useOrdersExplorerStore((s) => s.recordRecoverySettlement);
  const recoverySettlementSubmitting = useOrdersExplorerStore((s) => s.recoverySettlementSubmitting);
  const [partial, setPartial] = useState("");
  const [credit, setCredit] = useState("");
  const [gift, setGift] = useState("");
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const idem = useMemo(
    () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `idem-${orderId}-${orderItemId}-${Date.now()}`),
    [orderId, orderItemId],
  );

  if (paymentStatus !== "paid" && paymentStatus !== "partial") {
    return (
      <p className="text-[10px] text-muted-foreground border-t border-border/30 pt-2 mt-2">
        Settlement preview is most relevant once the order is paid or partially paid.
      </p>
    );
  }

  const runPreview = async () => {
    try {
      const data = await previewRecoverySettlement(orderId, orderItemId, {
        settlementKind: "composite",
        partialRefundAmount: Number(partial) || 0,
        storeCreditAmount: Number(credit) || 0,
        giftCardAmount: Number(gift) || 0,
      });
      setPreview(data as Record<string, unknown>);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
    }
  };

  const runRecord = async () => {
    try {
      await recordRecoverySettlement(orderId, orderItemId, {
        settlementKind: "composite",
        partialRefundAmount: Number(partial) || 0,
        storeCreditAmount: Number(credit) || 0,
        giftCardAmount: Number(gift) || 0,
        idempotencyKey: idem,
        notes: "Recorded from Orders Explorer",
      });
      toast.success("Settlement audit recorded (no payment executed)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Record failed");
    }
  };

  const refundCapped =
    preview && typeof preview.refund === "object" && preview.refund !== null
      ? Number((preview.refund as { capped?: unknown }).capped ?? 0)
      : null;

  return (
    <div className="border-t border-border/30 pt-2 mt-2 space-y-2" data-testid="order-explorer-recovery-settlement">
      <p className="text-[10px] font-semibold text-foreground">Financial settlement (preview)</p>
      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
        <label className="text-muted-foreground col-span-1">
          Refund
          <input
            className="mt-0.5 w-full rounded border border-border/60 bg-background px-1 py-1 text-[10px]"
            inputMode="decimal"
            value={partial}
            onChange={(e) => setPartial(e.target.value)}
            placeholder="0"
          />
        </label>
        <label className="text-muted-foreground col-span-1">
          Store credit
          <input
            className="mt-0.5 w-full rounded border border-border/60 bg-background px-1 py-1 text-[10px]"
            inputMode="decimal"
            value={credit}
            onChange={(e) => setCredit(e.target.value)}
            placeholder="0"
          />
        </label>
        <label className="text-muted-foreground col-span-1">
          Gift card
          <input
            className="mt-0.5 w-full rounded border border-border/60 bg-background px-1 py-1 text-[10px]"
            inputMode="decimal"
            value={gift}
            onChange={(e) => setGift(e.target.value)}
            placeholder="0"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" disabled={recoverySettlementSubmitting} onClick={() => void runPreview()}>
          Preview impact
        </Button>
        <Button type="button" size="sm" className="h-7 text-[10px]" disabled={recoverySettlementSubmitting} onClick={() => void runRecord()}>
          Record audit
        </Button>
      </div>
      {refundCapped != null && !Number.isNaN(refundCapped) ? (
        <p className="text-[10px] text-muted-foreground">
          Refund cap (safe): <span className="font-semibold text-foreground">{formatRp(refundCapped)}</span>
        </p>
      ) : null}
      <p className="text-[9px] text-muted-foreground leading-snug">
        Informational only — execute refunds, store credit, gift cards, and loyalty changes in existing POS / loyalty flows. Idempotency key is fixed per
        session for this line to avoid duplicate audit rows.
      </p>
    </div>
  );
}

function RecoveryApprovalRow({
  orderId,
  itemLabel,
  orderItemId,
}: {
  orderId: string;
  itemLabel: string;
  orderItemId: string | number;
}) {
  const approveItemRecovery = useOrdersExplorerStore((s) => s.approveItemRecovery);
  const recoveryApprovalSubmitting = useOrdersExplorerStore((s) => s.recoveryApprovalSubmitting);
  const [resolution, setResolution] = useState("recovery_approved");
  const [notes, setNotes] = useState("");
  const [replacedBy, setReplacedBy] = useState("");

  const submit = async () => {
    try {
      const trimmedReplace = replacedBy.trim();
      const payload =
        resolution === "replaced" && trimmedReplace !== "" && Number.isFinite(Number(trimmedReplace))
          ? { replacedByOrderItemId: Number(trimmedReplace) }
          : null;
      await approveItemRecovery(orderId, orderItemId, {
        resolution,
        notes: notes.trim() || null,
        payload,
      });
      toast.success("Recovery resolution recorded");
      setNotes("");
      setReplacedBy("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approval failed");
    }
  };

  return (
    <div className="rounded-lg border border-border/50 bg-background/40 px-2.5 py-2 space-y-2" data-testid="order-explorer-recovery-approval-row">
      <p className="text-[11px] font-semibold text-foreground truncate">{itemLabel}</p>
      <label className="block text-[10px] text-muted-foreground">
        Resolution
        <select
          className="mt-0.5 w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-[11px] text-foreground"
          value={resolution}
          disabled={recoveryApprovalSubmitting}
          onChange={(e) => setResolution(e.target.value)}
        >
          {RECOVERY_RESOLUTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {resolution === "replaced" ? (
        <label className="block text-[10px] text-muted-foreground">
          Replaced by item #
          <input
            type="text"
            inputMode="numeric"
            className="mt-0.5 w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-[11px] text-foreground"
            placeholder="Optional new line id"
            value={replacedBy}
            disabled={recoveryApprovalSubmitting}
            onChange={(e) => setReplacedBy(e.target.value)}
          />
        </label>
      ) : null}
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Approval notes (optional)"
        rows={2}
        disabled={recoveryApprovalSubmitting}
        className="text-[11px] min-h-0"
      />
      <Button type="button" size="sm" className="h-8 text-[11px]" disabled={recoveryApprovalSubmitting} onClick={() => void submit()}>
        Apply resolution
      </Button>
    </div>
  );
}

export function OrderExplorerDetailModal() {
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
                <p>Refunds, voids, and settlements stay on existing POS/accounting flows.</p>
                {caps.canApproveItemRecovery ? (
                  <p className="mt-1">You may record item-recovery resolutions (audit-only) for pending lines when shown below.</p>
                ) : (
                  <p className="mt-1">This screen is read-only for investigation.</p>
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

                <div className="flex flex-wrap justify-between gap-2 text-sm border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold text-foreground">{formatRp(order.total)}</span>
                </div>

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

                {caps.canApproveItemRecovery && pendingRecoveryLines.length > 0 ? (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 space-y-2" data-testid="order-explorer-recovery-approval">
                    <p className="text-xs font-semibold text-foreground">Pending recovery (manager)</p>
                    <div className="space-y-2">
                      {pendingRecoveryLines.map((it) => (
                        <div key={String(it.orderItemId ?? it.id)} className="space-y-0">
                          <RecoveryApprovalRow
                            orderId={selectedOrderId}
                            itemLabel={`${it.name} · line #${String(it.orderItemId ?? it.id)}`}
                            orderItemId={it.orderItemId ?? it.id}
                          />
                          <RecoverySettlementBlock
                            orderId={selectedOrderId}
                            orderItemId={it.orderItemId ?? it.id}
                            paymentStatus={String(order.paymentStatus)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

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
                            <p className="text-muted-foreground mt-0.5">
                              {[
                                ev.actorUserId != null ? `Actor ${ev.actorUserId}` : null,
                                ev.managerUserId != null ? `Manager ${ev.managerUserId}` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}

                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Receipt / print history</p>
                  {!caps.canUseReceiptActions ? (
                    <p className="text-[11px] text-muted-foreground">Receipt actions require POS access.</p>
                  ) : (bucket?.receipts?.length ?? 0) === 0 ? (
                    <p className="text-[11px] text-muted-foreground">No receipt renders stored for this order.</p>
                  ) : (
                    <ul className="space-y-1.5" data-testid="order-explorer-receipt-rows">
                      {(bucket?.receipts ?? []).map((r) => (
                        <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-2 py-1.5 text-[11px]">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{r.kind}</p>
                            <p className="text-muted-foreground">{formatWhen(r.createdAt)}</p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] shrink-0"
                            disabled={!caps.canUseReceiptActions}
                            onClick={() => void openPreview(r.id)}
                          >
                            <FileText className="h-3 w-3 mr-1" /> View
                          </Button>
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
    </AnimatePresence>
  );
}
