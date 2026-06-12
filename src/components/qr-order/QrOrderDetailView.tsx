import { Link } from "react-router-dom";
import { Bell, ChevronLeft } from "lucide-react";
import type { QrOrderPublicLookup } from "@/lib/api-integration/qrOrderPublicEndpoints";
import { QrOrderQrCodeDisplay } from "./QrOrderQrCodeDisplay";
import { QrOrderStatusTimeline } from "./QrOrderStatusTimeline";

function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

type Props = {
  order: QrOrderPublicLookup;
  isAdditionalOrder?: boolean;
  onCallCashier?: () => void;
  callCashierDisabled?: boolean;
  enableCallCashier?: boolean;
  backToMenuHref?: string | null;
};

export function QrOrderDetailView({
  order,
  isAdditionalOrder = false,
  onCallCashier,
  callCashierDisabled = false,
  enableCallCashier = true,
  backToMenuHref,
}: Props) {
  const lookupUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/qr/order/${encodeURIComponent(order.orderCode)}`
      : `/qr/order/${encodeURIComponent(order.orderCode)}`;

  return (
    <div className="min-h-screen bg-background" data-testid="qr-order-detail">
      <div className="sticky top-0 bg-card border-b border-border z-10">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          {backToMenuHref ? (
            <Link to={backToMenuHref} className="p-1.5 rounded-xl hover:bg-muted" aria-label="Back to menu">
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </Link>
          ) : null}
          <div className="min-w-0">
            <h1 className="text-base font-bold text-foreground truncate">Order {order.orderCode}</h1>
            {isAdditionalOrder && (
              <p className="text-xs text-primary font-medium">Pesanan Tambahan / Additional Order</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4 pb-8">
        <div className="bg-card rounded-2xl p-4 border border-border text-center">
          <p className="text-xs text-muted-foreground mb-1">Order Code</p>
          <p className="text-2xl font-bold text-primary tracking-wider" data-testid="qr-order-code">
            {order.orderCode}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {order.outletName} · Meja {order.tableName}
          </p>
          <p className="text-sm font-medium text-foreground mt-2" data-testid="qr-order-status-label">
            {order.customerStatusLabel}
          </p>
          {order.createdAt && (
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(order.createdAt).toLocaleString()}
            </p>
          )}
          {order.linkedPosOrder?.orderCode && (
            <p className="text-xs text-muted-foreground mt-2" data-testid="qr-order-linked-pos">
              Linked POS: <span className="font-mono text-foreground">{order.linkedPosOrder.orderCode}</span>
            </p>
          )}
          {order.openBill && (
            <p className="text-xs mt-1" data-testid="qr-order-open-bill">
              Open Bill: <span className="font-semibold text-foreground">{order.openBill.status}</span>
              {order.paymentStatus ? ` (${order.paymentStatus})` : null}
            </p>
          )}
        </div>

        <div className="bg-card rounded-2xl p-4 border border-border">
          <QrOrderQrCodeDisplay orderCode={order.orderCode} lookupUrl={lookupUrl} />
        </div>

        {order.customerMessage && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-200" data-testid="qr-order-customer-adjusted-message">
            {order.customerMessage}
          </div>
        )}

        {(order.removedItems?.length ?? 0) > 0 && (
          <div className="bg-card rounded-2xl p-4 border border-border text-sm">
            <p className="font-semibold mb-2">Removed</p>
            <ul className="space-y-1 text-muted-foreground">
              {order.removedItems?.map((item, index) => (
                <li key={`removed-${index}`}>
                  - {item.name}
                  {item.reason ? ` (${item.reason})` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(order.addedItems?.length ?? 0) > 0 && (
          <div className="bg-card rounded-2xl p-4 border border-border text-sm">
            <p className="font-semibold mb-2">Added</p>
            <ul className="space-y-1 text-muted-foreground">
              {order.addedItems?.map((item, index) => (
                <li key={`added-${index}`}>+ {item.name ?? item.to}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-card rounded-2xl p-4 border border-border">
          <h2 className="text-sm font-semibold text-foreground mb-3">Status</h2>
          <QrOrderStatusTimeline
            customerStatus={order.customerStatus}
            timelineStep={order.timelineStep}
            timeline={order.timeline}
          />
        </div>

        <div className="bg-card rounded-2xl p-4 border border-border">
          <h2 className="text-sm font-semibold text-foreground mb-3">Items</h2>
          <div className="space-y-2" data-testid="qr-order-items">
            {order.items.map((item, index) => (
              <div key={`${item.name}-${index}`} className="flex justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="text-foreground font-medium">
                    {item.name} <span className="text-muted-foreground">×{item.quantity}</span>
                  </p>
                  {item.note ? (
                    <p className="text-xs text-primary/70 italic mt-0.5">📝 {item.note}</p>
                  ) : null}
                </div>
                <span className="font-medium text-foreground shrink-0">{formatRp(item.lineTotal)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border mt-3 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatRp(order.subtotal)}</span>
            </div>
            {(order.promo ?? 0) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Promo{order.promoLabel ? ` (${order.promoLabel})` : ""}</span>
                <span>-{formatRp(order.promo ?? 0)}</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Discount</span>
                <span>-{formatRp(order.discount)}</span>
              </div>
            )}
            {(order.tax ?? 0) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>{formatRp(order.tax ?? 0)}</span>
              </div>
            )}
            {(order.service ?? 0) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Service</span>
                <span>{formatRp(order.service ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-foreground text-base pt-1">
              <span>Total</span>
              <span data-testid="qr-order-total">{formatRp(order.total)}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center px-2">
          Tunjukkan kode atau QR ini ke kasir jika diperlukan.
        </p>

        {enableCallCashier && onCallCashier && ["pending_review", "under_review", "adjusted"].includes(order.customerStatus) && (
          <button
            type="button"
            disabled={callCashierDisabled}
            onClick={onCallCashier}
            className="w-full py-3 rounded-2xl border border-primary text-primary font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Bell className="h-4 w-4" /> Call Cashier
          </button>
        )}

        {backToMenuHref && (
          <Link
            to={backToMenuHref}
            className="block w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm text-center"
            data-testid="qr-order-back-to-menu"
          >
            Order More
          </Link>
        )}
      </div>
    </div>
  );
}
