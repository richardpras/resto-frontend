import type { Customer } from "@/domain/crmTypes";

type CustomerRewardPanelProps = {
  customer: Customer | null;
  pointsBalance: number;
  onOpenProfile?: (customerId: string) => void;
};

export function CustomerRewardPanel({ customer, pointsBalance, onOpenProfile }: CustomerRewardPanelProps) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Customer Rewards</h3>
        {customer && onOpenProfile && (
          <button
            onClick={() => onOpenProfile(customer.id)}
            className="text-xs font-medium text-primary underline"
          >
            Open Profile
          </button>
        )}
      </div>
      {customer ? (
        <div className="text-sm">
          <p className="font-medium text-foreground">{customer.name}</p>
          <p className="text-muted-foreground">
            Tier: {customer.tierName ?? "-"} • Points: {pointsBalance}
          </p>
          <p className="text-muted-foreground">
            Gift Card / Store Credit: Rp {customer.giftCardBalance.toLocaleString("id-ID")}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select customer to view rewards and balances.</p>
      )}
    </div>
  );
}
