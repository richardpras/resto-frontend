import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dialogScroll, dialogSize } from "@/lib/ui/dialogSizes";
import type { MemberProfileApi } from "@/lib/api-integration/membersEndpoints";
import { useMemberStore } from "@/stores/memberStore";
import { ApiHttpError } from "@/lib/api-integration/client";
import { toast } from "sonner";

type Props = {
  memberId: string | null;
  outletId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asPage?: boolean;
};

function formatRp(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function voucherStatusLabel(status: string, t: (key: string) => string): string {
  const key = `members.profile.voucherStatus.${status}`;
  const translated = t(key);
  return translated === key ? status : translated;
}

function formatVoucherDate(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function MemberProfileDialog({ memberId, outletId, open, onOpenChange, asPage = false }: Props) {
  const { t } = useTranslation("ops");
  const fetchProfile = useMemberStore((s) => s.fetchProfile);
  const redeemPoints = useMemberStore((s) => s.redeemPoints);
  const redeemReward = useMemberStore((s) => s.redeemReward);
  const [profile, setProfile] = useState<MemberProfileApi | null>(null);
  const [loading, setLoading] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemRewardOpen, setRedeemRewardOpen] = useState(false);
  const [redeemPointsValue, setRedeemPointsValue] = useState("");
  const [redeemDescription, setRedeemDescription] = useState("");
  const [selectedRewardId, setSelectedRewardId] = useState("");
  const [rewardNotes, setRewardNotes] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!memberId || !outletId) return;
    setLoading(true);
    try {
      const data = await fetchProfile(memberId, outletId);
      setProfile(data);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("members.profile.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [memberId, outletId, fetchProfile, t]);

  useEffect(() => {
    if (!open || !memberId || !outletId) return;
    void loadProfile();
  }, [open, memberId, outletId, loadProfile]);

  useEffect(() => {
    if (!open) {
      setRedeemOpen(false);
      setRedeemRewardOpen(false);
      setRedeemPointsValue("");
      setRedeemDescription("");
      setSelectedRewardId("");
      setRewardNotes("");
    }
  }, [open]);

  const affordableRewards = (profile?.availableRewards ?? []).filter(
    (r) => (profile?.currentPoints ?? 0) >= r.pointsCost,
  );

  const handleRedeemReward = async () => {
    if (!memberId || !outletId || !selectedRewardId) {
      return toast.error(t("members.redeem.selectReward"));
    }
    setRedeeming(true);
    try {
      const result = await redeemReward(memberId, outletId, {
        rewardId: Number(selectedRewardId),
        notes: rewardNotes.trim() || undefined,
      });
      toast.success(
        t("members.redeem.rewardRedeemed", {
          name: result.rewardName,
          points: result.pointsSpent,
          balance: result.currentBalance,
        }),
      );
      setRedeemRewardOpen(false);
      setSelectedRewardId("");
      setRewardNotes("");
      await loadProfile();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("members.redeem.rewardFailed"));
    } finally {
      setRedeeming(false);
    }
  };

  const handleRedeem = async () => {
    if (!memberId || !outletId) return;
    const points = Number(redeemPointsValue);
    if (!Number.isFinite(points) || points < 1) {
      return toast.error(t("members.redeem.invalidPoints"));
    }
    setRedeeming(true);
    try {
      const result = await redeemPoints(memberId, outletId, {
        points,
        description: redeemDescription.trim() || undefined,
      });
      toast.success(
        t("members.redeem.pointsRedeemed", {
          points: result.redeemedPoints,
          balance: result.currentBalance,
        }),
      );
      setRedeemOpen(false);
      setRedeemPointsValue("");
      setRedeemDescription("");
      await loadProfile();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("members.redeem.redemptionFailed"));
    } finally {
      setRedeeming(false);
    }
  };

  const profileBody = loading ? (
    <p className="text-sm text-muted-foreground">{t("members.profile.loading")}</p>
  ) : profile ? (
    <div className="space-y-4">
              <div>
                <p className="font-semibold text-foreground">{profile.member.fullName ?? profile.member.name}</p>
                <p className="text-sm text-muted-foreground">{profile.member.phone}</p>
                {profile.member.memberNo ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("members.profile.memberNo")} {profile.member.memberNo}
                  </p>
                ) : null}
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{t("members.profile.currentPoints")}</p>
                  <p className="text-2xl font-bold text-primary">{profile.currentPoints ?? 0}</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid="redeem-reward-open"
                    onClick={() => setRedeemRewardOpen(true)}
                    disabled={affordableRewards.length < 1}
                  >
                    <Gift className="h-4 w-4 mr-1" />
                    {t("members.profile.redeemReward")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    data-testid="redeem-points-open"
                    onClick={() => setRedeemOpen(true)}
                    disabled={(profile.currentPoints ?? 0) < 1}
                  >
                    {t("members.profile.manualPoints")}
                  </Button>
                </div>
              </div>
              {profile.tier ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{t("members.profile.membershipTier")}</span>
                  <span className="text-sm font-semibold border rounded-full px-3 py-1 bg-amber-50 text-amber-900 border-amber-200">
                    {profile.tier.name}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t("members.profile.noTier")}</p>
              )}
              {(profile.benefits ?? []).length > 0 ? (
                <div className="rounded-xl border p-3 space-y-2">
                  <p className="text-sm font-medium">{t("members.profile.tierBenefits")}</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.benefits.map((benefit) => (
                      <span
                        key={benefit.code}
                        className="text-xs border rounded-full px-2 py-1 bg-emerald-50 text-emerald-900 border-emerald-200"
                      >
                        {benefit.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">{t("members.profile.visits")}</p>
                  <p className="text-xl font-bold">{profile.stats.totalVisits}</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">{t("members.profile.spending")}</p>
                  <p className="text-lg font-bold">{formatRp(profile.stats.totalSpending)}</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">{t("members.profile.lastVisit")}</p>
                  <p className="text-sm font-medium">
                    {profile.stats.lastVisit ? new Date(profile.stats.lastVisit).toLocaleDateString() : "—"}
                  </p>
                </div>
              </div>
            <div className="rounded-xl border p-3 mb-4 space-y-2">
              <p className="text-sm font-medium">{t("members.profile.memberSegments")}</p>
              {(profile.memberSegments ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("members.profile.noSegments")}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.memberSegments.map((seg) => (
                    <span key={seg.id} className="text-xs border rounded-full px-2 py-1 bg-muted">
                      {seg.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border p-3 mb-4 space-y-2">
              <p className="text-sm font-medium">{t("members.profile.tierHistory")}</p>
              {(profile.tierHistory ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("members.profile.noTierHistory")}</p>
              ) : (
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {profile.tierHistory.map((row) => (
                    <div key={row.id} className="flex justify-between text-sm border rounded-lg px-3 py-2 gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{row.tierName}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {row.reason.replace(/_/g, " ")}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {row.assignedAt ? new Date(row.assignedAt).toLocaleString() : "—"}
                          {row.removedAt ? ` → ${new Date(row.removedAt).toLocaleString()}` : ` · ${t("members.profile.active")}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border p-3 mb-4 space-y-2">
              <p className="text-sm font-medium">{t("members.profile.notifications")}</p>
              {(profile.notifications ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("members.profile.noNotifications")}</p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {profile.notifications.map((row) => (
                    <div key={row.id} className="flex justify-between text-sm border rounded-lg px-3 py-2 gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{row.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{row.content}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                        </p>
                      </div>
                      <span className="text-xs capitalize shrink-0 text-muted-foreground">
                        {row.readAt ? t("members.profile.read") : row.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border p-3 mb-4 space-y-2">
              <p className="text-sm font-medium">{t("members.profile.availableVouchers")}</p>
              {(profile.availableVouchers ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("members.profile.noVouchers")}</p>
              ) : (
                <div className="space-y-2">
                  {profile.availableVouchers.map((v) => (
                    <div key={v.id} className="flex justify-between text-sm border rounded-lg px-3 py-2">
                      <div>
                        <p className="font-medium">{v.name}</p>
                        <p className="text-xs text-muted-foreground">{v.voucherCode}</p>
                      </div>
                      <span className="text-xs capitalize text-muted-foreground">{voucherStatusLabel(v.status, t)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border p-3 mb-4 space-y-2">
              <p className="text-sm font-medium">{t("members.profile.voucherHistory")}</p>
              {(profile.voucherHistory ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("members.profile.noVoucherHistory")}</p>
              ) : (
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {profile.voucherHistory.map((v) => (
                    <div key={v.id} className="flex justify-between text-sm border rounded-lg px-3 py-2">
                      <div>
                        <p className="font-medium">{v.name}</p>
                        <p className="text-xs text-muted-foreground">{v.voucherCode}</p>
                        {v.redeemedAt ? (
                          <p className="text-[10px] text-muted-foreground">
                            {t("members.profile.redeemedAt", { date: formatVoucherDate(v.redeemedAt) })}
                          </p>
                        ) : null}
                      </div>
                      <span className="text-xs">{voucherStatusLabel(v.status, t)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border p-3 mb-4 space-y-2">
              <p className="text-sm font-medium">{t("members.profile.expiryPolicy")}</p>
              <p className="text-sm text-muted-foreground">
                {profile.expiryPolicy?.enabled
                  ? t("members.profile.pointsExpireAfter", { days: profile.expiryPolicy.days ?? "—" })
                  : t("members.profile.pointsNeverExpire")}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">{t("members.profile.expiredPointsTotal")} </span>
                <span className="font-semibold text-destructive">
                  {(profile.expiredPointsTotal ?? 0).toLocaleString()}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">{t("members.profile.expiryHistory")}</p>
              <div className="max-h-32 overflow-y-auto space-y-2 mb-4">
                {(profile.expiryHistory ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("members.profile.noExpiredPoints")}</p>
                ) : (
                  profile.expiryHistory.map((row) => (
                    <div key={row.id} className="flex justify-between text-sm border rounded-lg px-3 py-2 gap-2">
                      <div className="min-w-0">
                        <p className="font-medium capitalize">{row.type.replace(/_/g, " ")}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                        </p>
                      </div>
                      <span className="font-semibold text-destructive shrink-0">{row.points}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">{t("members.profile.availableRewards")}</p>
              <div className="max-h-32 overflow-y-auto space-y-2 mb-4">
                {(profile.availableRewards ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("members.profile.noRewards")}</p>
                ) : (
                  profile.availableRewards.map((reward) => (
                    <div
                      key={reward.id}
                      className="flex justify-between text-sm border rounded-lg px-3 py-2 gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{reward.name}</p>
                        {reward.description ? (
                          <p className="text-[10px] text-muted-foreground truncate">{reward.description}</p>
                        ) : null}
                      </div>
                      <span className="font-semibold text-primary shrink-0">{reward.pointsCost} pts</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">{t("members.profile.rewardRedemptions")}</p>
              <div className="max-h-32 overflow-y-auto space-y-2 mb-4">
                {(profile.rewardRedemptions ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("members.profile.noRewardRedemptions")}</p>
                ) : (
                  profile.rewardRedemptions.map((row) => (
                    <div key={row.id} className="flex justify-between text-sm border rounded-lg px-3 py-2 gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{row.rewardName ?? t("members.profile.rewardFallback")}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {row.status}
                          {row.issuedAt ? ` · ${new Date(row.issuedAt).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                      <span className="font-semibold text-destructive shrink-0">-{row.pointsSpent}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">{t("members.profile.loyaltyHistory")}</p>
                <div className="max-h-40 overflow-y-auto space-y-2 mb-4">
                  {(profile.loyaltyHistory ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("members.profile.noLoyaltyHistory")}</p>
                  ) : (
                    profile.loyaltyHistory.map((row) => (
                      <div key={row.id} className="flex justify-between text-sm border rounded-lg px-3 py-2 gap-2">
                        <div className="min-w-0">
                          <p className="font-medium capitalize">{row.type.replace(/_/g, " ")}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {row.description ?? row.program ?? "—"}
                            {row.referenceType ? ` · ${row.referenceType}` : ""}
                          </p>
                        </div>
                        <span className={`font-semibold shrink-0 ${row.points >= 0 ? "text-success" : "text-destructive"}`}>
                          {row.points >= 0 ? "+" : ""}
                          {row.points}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">{t("members.profile.orderTransactions")}</p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {profile.transactions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("members.profile.noTransactions")}</p>
                  ) : (
                    profile.transactions.map((tx) => (
                      <div key={tx.id} className="flex justify-between text-sm border rounded-lg px-3 py-2">
                        <span>{t("members.profile.orderNumber", { id: tx.orderId })}</span>
                        <span className="font-medium">{formatRp(tx.totalAmount)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null;

  const redeemDialogs = (
    <>
      <Dialog open={redeemRewardOpen} onOpenChange={setRedeemRewardOpen}>
        <DialogContent className="max-w-sm" data-testid="redeem-reward-dialog">
          <DialogHeader>
            <DialogTitle>{t("members.redeem.catalogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t("members.redeem.reward")}</Label>
              <Select value={selectedRewardId} onValueChange={setSelectedRewardId}>
                <SelectTrigger data-testid="redeem-reward-select">
                  <SelectValue placeholder={t("members.redeem.selectRewardPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {affordableRewards.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({r.pointsCost} pts)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {profile ? (
                <p className="text-xs text-muted-foreground">
                  {t("members.redeem.balancePts", { balance: profile.currentPoints ?? 0 })}
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="reward-notes">{t("members.redeem.notes")}</Label>
              <Textarea
                id="reward-notes"
                value={rewardNotes}
                onChange={(e) => setRewardNotes(e.target.value)}
                placeholder={t("members.redeem.notesPlaceholder")}
                data-testid="redeem-reward-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRedeemRewardOpen(false)}>
              {t("shared.cancel")}
            </Button>
            <Button onClick={() => void handleRedeemReward()} disabled={redeeming} data-testid="redeem-reward-submit">
              {redeeming ? t("members.redeem.redeeming") : t("members.redeem.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
        <DialogContent className="max-w-sm" data-testid="redeem-points-dialog">
          <DialogHeader>
            <DialogTitle>{t("members.redeem.pointsTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="redeem-points">{t("members.redeem.points")}</Label>
              <Input
                id="redeem-points"
                type="number"
                min={1}
                max={profile?.currentPoints ?? undefined}
                value={redeemPointsValue}
                onChange={(e) => setRedeemPointsValue(e.target.value)}
                data-testid="redeem-points-input"
              />
              {profile ? (
                <p className="text-xs text-muted-foreground">
                  {t("members.redeem.available", { balance: profile.currentPoints ?? 0 })}
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="redeem-description">{t("members.redeem.description")}</Label>
              <Textarea
                id="redeem-description"
                value={redeemDescription}
                onChange={(e) => setRedeemDescription(e.target.value)}
                placeholder={t("members.redeem.descriptionPlaceholder")}
                data-testid="redeem-description-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRedeemOpen(false)}>
              {t("shared.cancel")}
            </Button>
            <Button onClick={() => void handleRedeem()} disabled={redeeming} data-testid="redeem-points-submit">
              {redeeming ? t("members.redeem.redeeming") : t("members.redeem.redeem")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (asPage) {
    if (!open) return null;
    return (
      <>
        <div data-testid="member-profile-page">{profileBody}</div>
        {redeemDialogs}
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={`${dialogSize.xl} ${dialogScroll}`} data-testid="member-profile-dialog">
          <DialogHeader>
            <DialogTitle>{t("members.profile.dialogTitle")}</DialogTitle>
          </DialogHeader>
          {profileBody}
        </DialogContent>
      </Dialog>
      {redeemDialogs}
    </>
  );
}
