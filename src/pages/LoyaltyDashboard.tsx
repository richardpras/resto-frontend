import { useEffect } from "react";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { useOutletStore } from "@/stores/outletStore";
import { useLoyaltyStore } from "@/stores/loyaltyStore";
import { useCrmDashboardStore } from "@/stores/crmDashboardStore";
import { useAuthStore } from "@/stores/authStore";
import { getUserCapabilities } from "@/domain/accessControl";
import { GiftCardStoreCreditPanel } from "@/components/crm/GiftCardStoreCreditPanel";
import { LoyaltyTierListSkeleton } from "@/components/skeletons/list/LoyaltyTierListSkeleton";
import { SkeletonBusyRegion } from "@/components/skeletons/SkeletonBusyRegion";

export default function LoyaltyDashboard() {
  const { t } = useErpTranslation();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const authUser = useAuthStore((s) => s.user);
  const capabilities = getUserCapabilities(authUser);
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
    if (!capabilities.crm) return;
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
    capabilities.crm,
  ]);

  const showTierSkeleton = loyaltyLifecycle === "loading" && tiers.length === 0;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("loyalty.dashboard.pageTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("loyalty.dashboard.pageSubtitle")}</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <p className="text-xs text-muted-foreground">{t("loyalty.dashboard.metrics.activeMembers")}</p>
          <p className="text-2xl font-bold">{crmMetrics.activeLoyaltyMembers}</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <p className="text-xs text-muted-foreground">{t("loyalty.dashboard.metrics.pointsIssued")}</p>
          <p className="text-2xl font-bold">{crmMetrics.pointsIssued}</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <p className="text-xs text-muted-foreground">{t("loyalty.dashboard.metrics.pointsRedeemed")}</p>
          <p className="text-2xl font-bold">{crmMetrics.pointsRedeemed}</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <p className="text-xs text-muted-foreground">{t("loyalty.dashboard.metrics.redemptionCount")}</p>
          <p className="text-2xl font-bold">{crmMetrics.redemptionCount}</p>
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <h3 className="text-sm font-semibold mb-2">{t("loyalty.dashboard.tiersTitle")}</h3>
          <SkeletonBusyRegion busy={showTierSkeleton} label={t("loyalty.dashboard.loadingTiers")} className="min-h-[120px]">
            {showTierSkeleton ? (
              <LoyaltyTierListSkeleton rows={4} />
            ) : (
              <div className="space-y-1">
                {tiers.map((tier) => (
                  <div key={tier.id} className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
                    {t("loyalty.dashboard.tierLine", {
                      name: tier.name,
                      code: tier.code,
                      minPoints: tier.minPoints,
                      discountRate: tier.discountRate,
                    })}
                  </div>
                ))}
                {tiers.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t("loyalty.dashboard.noTier")}</p>
                )}
              </div>
            )}
          </SkeletonBusyRegion>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <h3 className="text-sm font-semibold mb-2">{t("loyalty.dashboard.redemptionsTitle")}</h3>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {redemptions.map((redemption) => (
              <div key={redemption.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
                <span>{redemption.status}</span>
                <span>
                  {t("loyalty.dashboard.redemptionLine", {
                    points: redemption.pointsUsed,
                    amount: `Rp ${redemption.amountValue.toLocaleString("id-ID")}`,
                  })}
                </span>
              </div>
            ))}
            {redemptions.length === 0 && <p className="text-sm text-muted-foreground">{t("loyalty.dashboard.noRedemptions")}</p>}
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
