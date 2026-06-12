import type { QrOrderAdjustmentEntry } from "@/lib/api-integration/qrOrderReviewEndpoints";

function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

type Props = {
  adjustments: QrOrderAdjustmentEntry[];
  promoLabel?: string | null;
  subtotal: number;
  discount: number;
  total: number;
};

export function QrOrderAdjustmentSummary({ adjustments, promoLabel, subtotal, discount, total }: Props) {
  const removed = adjustments.filter((a) => a.type === "removed");
  const added = adjustments.filter((a) => a.type === "added");
  const replaced = adjustments.filter((a) => a.type === "replaced");

  if (adjustments.length === 0 && discount <= 0) return null;

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3" data-testid="qr-order-adjustment-summary">
      <h4 className="text-sm font-semibold text-foreground">Changes Made</h4>

      {removed.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Removed</p>
          <ul className="text-sm space-y-1">
            {removed.map((item, index) => (
              <li key={`removed-${index}`} className="text-destructive">
                - {item.name}
                {item.reason ? <span className="text-muted-foreground"> ({item.reason})</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {added.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Added</p>
          <ul className="text-sm space-y-1">
            {added.map((item, index) => (
              <li key={`added-${index}`} className="text-success">
                + {item.name ?? item.to}
              </li>
            ))}
          </ul>
        </div>
      )}

      {replaced.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Replaced</p>
          <ul className="text-sm space-y-1">
            {replaced.map((item, index) => (
              <li key={`replaced-${index}`}>
                {item.from} → {item.to}
              </li>
            ))}
          </ul>
        </div>
      )}

      {promoLabel && (
        <p className="text-sm">
          <span className="text-muted-foreground">Promo:</span> {promoLabel}
        </p>
      )}

      <div className="border-t border-border pt-2 text-sm space-y-1">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatRp(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Discount</span>
            <span>-{formatRp(discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-foreground">
          <span>New Total</span>
          <span data-testid="qr-adjustment-new-total">{formatRp(total)}</span>
        </div>
      </div>
    </div>
  );
}
