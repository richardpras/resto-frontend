import { useCallback, useEffect, useState } from "react";
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
import type { MemberProfileApi } from "@/lib/api-integration/membersEndpoints";
import { useMemberStore } from "@/stores/memberStore";
import { ApiHttpError } from "@/lib/api-integration/client";
import { toast } from "sonner";

type Props = {
  memberId: string | null;
  outletId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatRp(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function voucherStatusLabel(status: string): string {
  switch (status) {
    case "issued":
      return "Issued";
    case "claimed":
      return "Claimed";
    case "redeemed":
      return "Redeemed";
    case "expired":
      return "Expired";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function formatVoucherDate(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function MemberProfileDialog({ memberId, outletId, open, onOpenChange }: Props) {
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
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [memberId, outletId, fetchProfile]);

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
      return toast.error("Select a reward");
    }
    setRedeeming(true);
    try {
      const result = await redeemReward(memberId, outletId, {
        rewardId: Number(selectedRewardId),
        notes: rewardNotes.trim() || undefined,
      });
      toast.success(
        `Redeemed ${result.rewardName} for ${result.pointsSpent} pts. Balance: ${result.currentBalance}`,
      );
      setRedeemRewardOpen(false);
      setSelectedRewardId("");
      setRewardNotes("");
      await loadProfile();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Reward redemption failed");
    } finally {
      setRedeeming(false);
    }
  };

  const handleRedeem = async () => {
    if (!memberId || !outletId) return;
    const points = Number(redeemPointsValue);
    if (!Number.isFinite(points) || points < 1) {
      return toast.error("Enter a valid points amount");
    }
    setRedeeming(true);
    try {
      const result = await redeemPoints(memberId, outletId, {
        points,
        description: redeemDescription.trim() || undefined,
      });
      toast.success(`Redeemed ${result.redeemedPoints} points. Balance: ${result.currentBalance}`);
      setRedeemOpen(false);
      setRedeemPointsValue("");
      setRedeemDescription("");
      await loadProfile();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Redemption failed");
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg" data-testid="member-profile-dialog">
          <DialogHeader>
            <DialogTitle>Member profile</DialogTitle>
          </DialogHeader>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : profile ? (
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-foreground">{profile.member.fullName ?? profile.member.name}</p>
                <p className="text-sm text-muted-foreground">{profile.member.phone}</p>
                {profile.member.memberNo ? (
                  <p className="text-xs text-muted-foreground mt-1">Member no: {profile.member.memberNo}</p>
                ) : null}
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Current points</p>
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
                    Redeem reward
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
                    Manual points
                  </Button>
                </div>
              </div>
              {profile.tier ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Membership tier</span>
                  <span className="text-sm font-semibold border rounded-full px-3 py-1 bg-amber-50 text-amber-900 border-amber-200">
                    {profile.tier.name}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No active membership tier.</p>
              )}
              {(profile.benefits ?? []).length > 0 ? (
                <div className="rounded-xl border p-3 space-y-2">
                  <p className="text-sm font-medium">Tier benefits</p>
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
                  <p className="text-xs text-muted-foreground">Visits</p>
                  <p className="text-xl font-bold">{profile.stats.totalVisits}</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">Spending</p>
                  <p className="text-lg font-bold">{formatRp(profile.stats.totalSpending)}</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">Last visit</p>
                  <p className="text-sm font-medium">
                    {profile.stats.lastVisit ? new Date(profile.stats.lastVisit).toLocaleDateString() : "—"}
                  </p>
                </div>
              </div>
            <div className="rounded-xl border p-3 mb-4 space-y-2">
              <p className="text-sm font-medium">Member segments</p>
              {(profile.memberSegments ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">Not in any active segment.</p>
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
              <p className="text-sm font-medium">Tier history</p>
              {(profile.tierHistory ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No tier assignments yet.</p>
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
                          {row.removedAt ? ` → ${new Date(row.removedAt).toLocaleString()}` : " · Active"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border p-3 mb-4 space-y-2">
              <p className="text-sm font-medium">Notifications</p>
              {(profile.notifications ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No notifications yet.</p>
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
                        {row.readAt ? "Read" : row.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border p-3 mb-4 space-y-2">
              <p className="text-sm font-medium">Available vouchers</p>
              {(profile.availableVouchers ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No available vouchers.</p>
              ) : (
                <div className="space-y-2">
                  {profile.availableVouchers.map((v) => (
                    <div key={v.id} className="flex justify-between text-sm border rounded-lg px-3 py-2">
                      <div>
                        <p className="font-medium">{v.name}</p>
                        <p className="text-xs text-muted-foreground">{v.voucherCode}</p>
                      </div>
                      <span className="text-xs capitalize text-muted-foreground">{voucherStatusLabel(v.status)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border p-3 mb-4 space-y-2">
              <p className="text-sm font-medium">Voucher history</p>
              {(profile.voucherHistory ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No voucher history.</p>
              ) : (
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {profile.voucherHistory.map((v) => (
                    <div key={v.id} className="flex justify-between text-sm border rounded-lg px-3 py-2">
                      <div>
                        <p className="font-medium">{v.name}</p>
                        <p className="text-xs text-muted-foreground">{v.voucherCode}</p>
                        {v.redeemedAt ? (
                          <p className="text-[10px] text-muted-foreground">
                            Redeemed {formatVoucherDate(v.redeemedAt)}
                          </p>
                        ) : null}
                      </div>
                      <span className="text-xs">{voucherStatusLabel(v.status)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border p-3 mb-4 space-y-2">
              <p className="text-sm font-medium">Expiry policy</p>
              <p className="text-sm text-muted-foreground">
                {profile.expiryPolicy?.enabled
                  ? `Points expire after ${profile.expiryPolicy.days ?? "—"} days`
                  : "Points never expire"}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Expired points total: </span>
                <span className="font-semibold text-destructive">
                  {(profile.expiredPointsTotal ?? 0).toLocaleString()}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Expiry history</p>
              <div className="max-h-32 overflow-y-auto space-y-2 mb-4">
                {(profile.expiryHistory ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No expired points yet.</p>
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
              <p className="text-sm font-medium mb-2">Available rewards</p>
              <div className="max-h-32 overflow-y-auto space-y-2 mb-4">
                {(profile.availableRewards ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No active rewards for this outlet.</p>
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
              <p className="text-sm font-medium mb-2">Reward redemptions</p>
              <div className="max-h-32 overflow-y-auto space-y-2 mb-4">
                {(profile.rewardRedemptions ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No catalog redemptions yet.</p>
                ) : (
                  profile.rewardRedemptions.map((row) => (
                    <div key={row.id} className="flex justify-between text-sm border rounded-lg px-3 py-2 gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{row.rewardName ?? "Reward"}</p>
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
              <p className="text-sm font-medium mb-2">Loyalty history</p>
                <div className="max-h-40 overflow-y-auto space-y-2 mb-4">
                  {(profile.loyaltyHistory ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No loyalty movements yet.</p>
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
                <p className="text-sm font-medium mb-2">Order transactions</p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {profile.transactions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No transactions yet.</p>
                  ) : (
                    profile.transactions.map((tx) => (
                      <div key={tx.id} className="flex justify-between text-sm border rounded-lg px-3 py-2">
                        <span>Order #{tx.orderId}</span>
                        <span className="font-medium">{formatRp(tx.totalAmount)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={redeemRewardOpen} onOpenChange={setRedeemRewardOpen}>
        <DialogContent className="max-w-sm" data-testid="redeem-reward-dialog">
          <DialogHeader>
            <DialogTitle>Redeem catalog reward</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Reward</Label>
              <Select value={selectedRewardId} onValueChange={setSelectedRewardId}>
                <SelectTrigger data-testid="redeem-reward-select">
                  <SelectValue placeholder="Select reward" />
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
                <p className="text-xs text-muted-foreground">Balance: {profile.currentPoints ?? 0} pts</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="reward-notes">Notes</Label>
              <Textarea
                id="reward-notes"
                value={rewardNotes}
                onChange={(e) => setRewardNotes(e.target.value)}
                placeholder="e.g. Redeemed at counter"
                data-testid="redeem-reward-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRedeemRewardOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleRedeemReward()} disabled={redeeming} data-testid="redeem-reward-submit">
              {redeeming ? "Redeeming…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
        <DialogContent className="max-w-sm" data-testid="redeem-points-dialog">
          <DialogHeader>
            <DialogTitle>Redeem loyalty points</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="redeem-points">Points</Label>
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
                <p className="text-xs text-muted-foreground">Available: {profile.currentPoints ?? 0}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="redeem-description">Description</Label>
              <Textarea
                id="redeem-description"
                value={redeemDescription}
                onChange={(e) => setRedeemDescription(e.target.value)}
                placeholder="e.g. Birthday redemption"
                data-testid="redeem-description-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRedeemOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleRedeem()} disabled={redeeming} data-testid="redeem-points-submit">
              {redeeming ? "Redeeming…" : "Redeem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
