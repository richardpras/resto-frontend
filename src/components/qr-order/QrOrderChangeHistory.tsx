import type { QrOrderHistoryEntry } from "@/lib/api-integration/qrOrderReviewEndpoints";

type Props = {
  entries: QrOrderHistoryEntry[];
};

export function QrOrderChangeHistory({ entries }: Props) {
  if (entries.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="qr-order-change-history">
      <h4 className="text-sm font-semibold text-foreground">Order History</h4>
      <ol className="space-y-2">
        {entries.map((entry, index) => (
          <li key={`${entry.eventType}-${index}`} className="text-sm border-l-2 border-primary/30 pl-3">
            <p className="font-medium text-foreground">{entry.label}</p>
            {entry.occurredAt && (
              <p className="text-xs text-muted-foreground">
                {new Date(entry.occurredAt).toLocaleString("id-ID")}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
