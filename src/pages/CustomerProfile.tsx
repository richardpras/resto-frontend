import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useCustomerStore } from "@/stores/customerStore";
import { useLoyaltyStore } from "@/stores/loyaltyStore";
import { GiftCardStoreCreditPanel } from "@/components/crm/GiftCardStoreCreditPanel";
import { useCrmDashboardStore } from "@/stores/crmDashboardStore";

export default function CustomerProfile() {
  const { customerId } = useParams<{ customerId: string }>();
  const customer = useCustomerStore((s) => s.selectedCustomer);
  const fetchCustomerById = useCustomerStore((s) => s.fetchCustomerById);
  const ledger = useLoyaltyStore((s) => s.pointsLedger);
  const redemptions = useLoyaltyStore((s) => s.redemptions);
  const pointsBalanceByCustomer = useLoyaltyStore((s) => s.pointsBalanceByCustomer);
  const crmMetrics = useCrmDashboardStore((s) => s.metrics);

  useEffect(() => {
    if (!customerId) return;
    void fetchCustomerById(customerId);
  }, [customerId, fetchCustomerById]);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Customer Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Loyalty, points ledger, and gift-card/store-credit details.</p>
      </div>
      {!customer ? (
        <div className="rounded-2xl border border-border/50 bg-card p-6 text-sm text-muted-foreground">Loading customer profile...</div>
      ) : (
        <>
          <div className="rounded-2xl border border-border/50 bg-card p-4">
            <h2 className="text-lg font-semibold text-foreground">{customer.name}</h2>
            <p className="text-sm text-muted-foreground">{customer.code} • {customer.phone ?? "-"} • {customer.email ?? "-"}</p>
            <p className="text-sm mt-2">
              Tier: <span className="font-medium">{customer.tierName ?? "-"}</span>
              {" • "}Points: <span className="font-medium">{pointsBalanceByCustomer[customer.id] ?? customer.pointsBalance}</span>
            </p>
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border/50 bg-card p-4">
              <h3 className="text-sm font-semibold mb-2">Points Ledger</h3>
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {ledger.filter((item) => item.customerId === customer.id).map((item) => (
                  <div key={item.id} className="flex justify-between text-sm rounded-lg bg-muted/30 px-2 py-1.5">
                    <span>{item.reason}</span>
                    <span className={item.deltaPoints >= 0 ? "text-primary" : "text-destructive"}>{item.deltaPoints}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card p-4">
              <h3 className="text-sm font-semibold mb-2">Recent Redemptions</h3>
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {redemptions.filter((item) => item.customerId === customer.id).map((item) => (
                  <div key={item.id} className="flex justify-between text-sm rounded-lg bg-muted/30 px-2 py-1.5">
                    <span>{item.status}</span>
                    <span>Rp {item.amountValue.toLocaleString("id-ID")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <GiftCardStoreCreditPanel
            outstandingValue={crmMetrics.giftCardOutstandingValue}
            pendingSettlements={crmMetrics.pendingGiftCardSettlements}
          />
        </>
      )}
    </div>
  );
}
