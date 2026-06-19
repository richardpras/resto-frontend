import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemberProfileDialog } from "@/components/members/MemberProfileDialog";
import { GiftCardStoreCreditPanel } from "@/components/crm/GiftCardStoreCreditPanel";
import { useOutletStore } from "@/stores/outletStore";
import { useMemberStore } from "@/stores/memberStore";
import { useCrmDashboardStore } from "@/stores/crmDashboardStore";
import { useLoyaltyStore } from "@/stores/loyaltyStore";
import type { MemberProfileApi } from "@/lib/api-integration/membersEndpoints";

export default function MemberProfilePage() {
  const { t } = useTranslation("ops");
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const fetchProfile = useMemberStore((s) => s.fetchProfile);
  const fetchRedemptions = useLoyaltyStore((s) => s.fetchRedemptions);
  const redemptions = useLoyaltyStore((s) => s.redemptions);
  const crmMetrics = useCrmDashboardStore((s) => s.metrics);
  const refreshCrm = useCrmDashboardStore((s) => s.refreshForOutlet);
  const [profile, setProfile] = useState<MemberProfileApi | null>(null);

  const outletId = typeof activeOutletId === "number" ? activeOutletId : null;

  useEffect(() => {
    if (!memberId || outletId === null) return;
    void fetchProfile(memberId, outletId).then((data) => {
      setProfile(data);
      const crmId = data.crmAccount?.id ? String(data.crmAccount.id) : data.member.loyaltyAccountId ?? null;
      if (crmId) void fetchRedemptions({ customerId: crmId, perPage: 50 }).catch(() => undefined);
    }).catch(() => setProfile(null));
  }, [memberId, outletId, fetchProfile, fetchRedemptions]);

  useEffect(() => {
    if (outletId !== null) void refreshCrm(outletId);
  }, [outletId, refreshCrm]);

  const crmAccountId = profile?.crmAccount?.id ? String(profile.crmAccount.id) : profile?.member.loyaltyAccountId ?? null;
  const crmRedemptions = crmAccountId
    ? redemptions.filter((row) => row.customerId === crmAccountId)
    : [];

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/members"><ArrowLeft className="h-4 w-4 mr-1" /> {t("members.profile.back")}</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("members.profile.pageTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("members.profile.pageSubtitle")}</p>
        </div>
      </div>

      {profile && (
        <div className="rounded-2xl border border-border/50 bg-card p-4 max-w-sm">
          <p className="text-xs text-muted-foreground">{t("members.profile.points")}</p>
          <p className="text-2xl font-bold text-primary">{profile.pointsBalance ?? profile.currentPoints ?? 0}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{t("members.profile.pointsHint")}</p>
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("members.profile.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="loyalty">{t("members.profile.tabs.loyalty")}</TabsTrigger>
          <TabsTrigger value="crm">{t("members.profile.tabs.crm")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {profile ? (
            <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-2">
              <h2 className="text-lg font-semibold">{profile.member.fullName ?? profile.member.name}</h2>
              <p className="text-sm text-muted-foreground">{profile.member.phone} · {profile.member.email ?? "—"}</p>
              <p className="text-sm">{t("members.profile.memberNo")} <span className="font-medium">{profile.member.memberNo ?? "—"}</span></p>
              {profile.crmAccount ? (
                <p className="text-sm">{t("members.profile.crmCode")} <span className="font-medium">{profile.crmAccount.code}</span></p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("members.profile.loadingOverview")}</p>
          )}
        </TabsContent>

        <TabsContent value="loyalty">
          <MemberProfileDialog
            memberId={memberId ?? null}
            outletId={outletId}
            open={Boolean(memberId && outletId)}
            onOpenChange={(open) => { if (!open) navigate("/members"); }}
            asPage
          />
        </TabsContent>

        <TabsContent value="crm" className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-4">
            <h3 className="text-sm font-semibold mb-2">{t("members.profile.pointsLedger")}</h3>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {(profile?.crmPointsLedger ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("members.profile.noLedger")}</p>
              ) : (
                profile?.crmPointsLedger.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm rounded-lg bg-muted/30 px-2 py-1.5">
                    <span>{item.reason}</span>
                    <span className={item.deltaPoints >= 0 ? "text-primary" : "text-destructive"}>{item.deltaPoints}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card p-4">
            <h3 className="text-sm font-semibold mb-2">{t("members.profile.recentRedemptions")}</h3>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {crmRedemptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("members.profile.noRedemptions")}</p>
              ) : (
                crmRedemptions.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm rounded-lg bg-muted/30 px-2 py-1.5">
                    <span>{item.status}</span>
                    <span>Rp {item.amountValue.toLocaleString("id-ID")}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <GiftCardStoreCreditPanel
            outstandingValue={crmMetrics.giftCardOutstandingValue}
            pendingSettlements={crmMetrics.pendingGiftCardSettlements}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
