import { useEffect, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import {
  orderPaymentHistoryCacheKey,
  useOrderPaymentHistoryStore,
} from "@/stores/orderPaymentHistoryStore";
import type { OrderPaymentHistoryItem } from "@/lib/api-integration/endpoints";

function formatRp(amount: number): string {
  return "Rp " + amount.toLocaleString("id-ID");
}

function formatWhen(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });
}

function methodLabel(method: string): string {
  const m = method.toLowerCase();
  if (m === "qris") return "QRIS";
  return method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "paid") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (s === "pending") return "bg-amber-500/15 text-amber-800 dark:text-amber-300";
  if (s === "failed") return "bg-destructive/15 text-destructive";
  if (s === "expired" || s === "cancelled") return "bg-muted text-muted-foreground";
  if (s === "void" || s.includes("void")) return "bg-muted text-muted-foreground line-through";
  if (s.includes("refund")) return "bg-orange-500/15 text-orange-800 dark:text-orange-300";
  return "bg-muted text-foreground";
}

function sortHistoryRows(rows: OrderPaymentHistoryItem[]): OrderPaymentHistoryItem[] {
  return [...rows].sort((a, b) => {
    const ta = new Date(a.createdAt ?? a.paidAt ?? 0).getTime();
    const tb = new Date(b.createdAt ?? b.paidAt ?? 0).getTime();
    if (ta !== tb) return ta - tb;
    return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
  });
}

export type OrderPaymentHistoryPanelProps = {
  outletId: number | null;
  orderId: string | null;
  /** Operational channel label for the order (POS / QR / …). */
  orderChannelLabel?: string | null;
};

export function OrderPaymentHistoryPanel({ outletId, orderId, orderChannelLabel }: OrderPaymentHistoryPanelProps) {
  const cacheKey = orderId ? orderPaymentHistoryCacheKey(outletId, orderId) : "";
  const entry = useOrderPaymentHistoryStore((s) => (orderId ? s.entries[orderPaymentHistoryCacheKey(outletId, orderId)] : undefined));
  const registerInterest = useOrderPaymentHistoryStore((s) => s.registerInterest);
  const unregisterInterest = useOrderPaymentHistoryStore((s) => s.unregisterInterest);
  const ensureLoaded = useOrderPaymentHistoryStore((s) => s.ensureLoaded);
  const fetchHistory = useOrderPaymentHistoryStore((s) => s.fetchHistory);

  useEffect(() => {
    if (!orderId || !cacheKey) return;
    registerInterest(outletId, orderId);
    ensureLoaded(outletId, orderId);
    return () => unregisterInterest(outletId, orderId);
  }, [cacheKey, orderId, outletId, registerInterest, unregisterInterest, ensureLoaded]);

  const rows = useMemo(() => sortHistoryRows(entry?.payments ?? []), [entry?.payments]);

  if (!orderId || typeof outletId !== "number" || outletId < 1) {
    return null;
  }

  const showInitialSkeleton = Boolean(entry?.initialLoading && rows.length === 0);
  const channel = orderChannelLabel?.trim() || "—";

  return (
    <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-2" data-testid="order-payment-history-panel">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">Payment history</p>
        <div className="flex items-center gap-1.5 shrink-0">
          {entry?.backgroundRefreshing ? (
            <span className="text-[10px] text-muted-foreground" data-testid="payment-history-refreshing">
              Updating…
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void fetchHistory(outletId, orderId, { background: true, force: true })}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
            aria-label="Refresh payment history"
            data-testid="payment-history-refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${entry?.backgroundRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {entry?.error ? (
        <p className="text-xs text-destructive" data-testid="payment-history-error">
          {entry.error}
        </p>
      ) : null}

      {showInitialSkeleton ? (
        <p className="text-xs text-muted-foreground" data-testid="payment-history-initial-loading">
          Loading payment history…
        </p>
      ) : null}

      {!showInitialSkeleton && rows.length === 0 && !entry?.error ? (
        <p className="text-xs text-muted-foreground">No payments recorded yet.</p>
      ) : null}

      {rows.length > 0 ? (
        <ul className="space-y-2 max-h-52 overflow-y-auto pr-0.5" data-testid="payment-history-rows">
          {rows.map((row) => {
            const st = (row.status ?? "paid").toLowerCase();
            const isRefundLike = st.includes("refund");
            return (
              <li
                key={String(row.id)}
                className="rounded-lg border border-border/60 bg-card/80 px-2.5 py-2 text-[11px] leading-snug space-y-1"
                data-testid={`payment-history-row-${row.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-semibold text-foreground truncate">{methodLabel(row.method)}</p>
                    <p className="text-muted-foreground">
                      {formatWhen(row.createdAt ?? row.paidAt)}
                      {row.orderSplitId != null || row.splitLabel ? (
                        <span className="text-muted-foreground">
                          {" "}
                          · Split{" "}
                          {row.splitLabel ? (
                            <span className="font-medium text-foreground">{row.splitLabel}</span>
                          ) : (
                            `#${row.orderSplitId}`
                          )}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <p className="font-bold text-foreground">{formatRp(row.amount)}</p>
                    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${statusBadgeClass(row.status)}`}>
                      {row.status}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                  <span>Channel</span>
                  <span className="text-right text-foreground">{channel}</span>
                  <span>Reference</span>
                  <span className="text-right text-foreground truncate">
                    {row.providerReference ?? (row.source === "gateway_transaction" ? "Gateway" : "—")}
                  </span>
                  <span>Cashier</span>
                  <span className="text-right">—</span>
                  <span>Settlement</span>
                  <span className="text-right">—</span>
                </div>
                {st === "void" ? (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Void</span>
                  </div>
                ) : null}
                {(isRefundLike || st === "failed" || st === "pending") && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {isRefundLike ? (
                      <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-medium text-orange-800 dark:text-orange-300">
                        Refund
                      </span>
                    ) : null}
                    {st === "failed" ? (
                      <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-medium text-destructive">Failed</span>
                    ) : null}
                    {st === "pending" ? (
                      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:text-amber-200">
                        Pending
                      </span>
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
