type GiftCardStoreCreditPanelProps = {
  outstandingValue: number;
  pendingSettlements: number;
};

export function GiftCardStoreCreditPanel({ outstandingValue, pendingSettlements }: GiftCardStoreCreditPanelProps) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Gift Card / Store Credit</h3>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border p-3">
          <p className="text-xs text-muted-foreground">Outstanding Value</p>
          <p className="text-base font-semibold text-foreground">Rp {outstandingValue.toLocaleString("id-ID")}</p>
        </div>
        <div className="rounded-xl border p-3">
          <p className="text-xs text-muted-foreground">Pending Settlements</p>
          <p className="text-base font-semibold text-foreground">{pendingSettlements}</p>
        </div>
      </div>
    </div>
  );
}
