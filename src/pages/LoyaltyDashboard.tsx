import { useEffect } from "react";
import { useOutletStore } from "@/stores/outletStore";
import { useLoyaltyStore } from "@/stores/loyaltyStore";
import { useCrmDashboardStore } from "@/stores/crmDashboardStore";
import { GiftCardStoreCreditPanel } from "@/components/crm/GiftCardStoreCreditPanel";

export default function LoyaltyDashboard() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const tiers = useLoyaltyStore((s) => s.tiers);
  const redemptions = useLoyaltyStore((s) => s.redemptions);
  const loyaltyLifecycle = useLoyaltyStore((s) => s.lifecycle);
  const refreshLoyalty = useLoyaltyStore((s) => s.refreshForOutlet);
  const startLoyaltyRealtime = useLoyaltyStore((s) => s.startRealtime);
  const stopLoyaltyRealtime = useLoyaltyStore((s) => s.stopRealtime);
  const startLoyaltyPolling = useLoyaltyStore((s) => s.startPollingFallback);
  const stopLoyaltyPolling = useLoyaltyStore((s) => s.stopPollingFallback);
  const crmMetrics = useCrmDashboardStore((s) => s.metrics);
  const refreshCrm = useCrmDashboardStore((s) => s.refreshForOutlet);
  const startCrmRealtime = useCrmDashboardStore((s) => s.startRealtime);
  const stopCrmRealtime = useCrmDashboardStore((s) => s.stopRealtime);
  const startCrmPolling = useCrmDashboardStore((s) => s.startPollingFallback);
  const stopCrmPolling = useCrmDashboardStore((s) => s.stopPollingFallback);

  useEffect(() => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1) return;
    void refreshLoyalty(activeOutletId);
    void refreshCrm(activeOutletId);
    startLoyaltyRealtime();
    startLoyaltyPolling(12000);
    startCrmRealtime();
    startCrmPolling(15000);
    return () => {
      stopCrmPolling();
      stopCrmRealtime();
      stopLoyaltyPolling();
      stopLoyaltyRealtime();
    };
  }, [
    activeOutletId,
    refreshLoyalty,
    refreshCrm,
    startLoyaltyRealtime,
    startLoyaltyPolling,
    stopLoyaltyPolling,
    stopLoyaltyRealtime,
    startCrmRealtime,
    startCrmPolling,
    stopCrmPolling,
    stopCrmRealtime,
  ]);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Loyalty Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Realtime loyalty health, tiers, and redemption throughput.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <p className="text-xs text-muted-foreground">Active Loyalty Members</p>
          <p className="text-2xl font-bold">{crmMetrics.activeLoyaltyMembers}</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <p className="text-xs text-muted-foreground">Points Issued</p>
          <p className="text-2xl font-bold">{crmMetrics.pointsIssued}</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <p className="text-xs text-muted-foreground">Points Redeemed</p>
          <p className="text-2xl font-bold">{crmMetrics.pointsRedeemed}</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <p className="text-xs text-muted-foreground">Redemption Count</p>
          <p className="text-2xl font-bold">{crmMetrics.redemptionCount}</p>
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <h3 className="text-sm font-semibold mb-2">Loyalty Tiers</h3>
          <div className="space-y-1">
            {tiers.map((tier) => (
              <div key={tier.id} className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
                {tier.name} ({tier.code}) • min {tier.minPoints} pts • {tier.discountRate}% discount
              </div>
            ))}
            {tiers.length === 0 && (
              <p className="text-sm text-muted-foreground">{loyaltyLifecycle === "loading" ? "Loading tiers..." : "No tier configured."}</p>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <h3 className="text-sm font-semibold mb-2">Latest Redemptions</h3>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {redemptions.map((redemption) => (
              <div key={redemption.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
                <span>{redemption.status}</span>
                <span>{redemption.pointsUsed} pts • Rp {redemption.amountValue.toLocaleString("id-ID")}</span>
              </div>
            ))}
            {redemptions.length === 0 && <p className="text-sm text-muted-foreground">No redemption data yet.</p>}
          </div>
        </div>
      </div>
      <GiftCardStoreCreditPanel
        outstandingValue={crmMetrics.giftCardOutstandingValue}
        pendingSettlements={crmMetrics.pendingGiftCardSettlements}
      />
    </div>
  );
}
