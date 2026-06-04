import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Gift, TrendingUp, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type Column } from "@/components/DataTable";
import {
  fetchLoyaltyAnalyticsDashboard,
  type LoyaltyAnalyticsDashboard,
  type LoyaltyAnalyticsTopMember,
} from "@/lib/api-integration/loyaltyEngineEndpoints";
import { ApiHttpError } from "@/lib/api-integration/client";
import { toast } from "sonner";

type DatePreset = "today" | "7d" | "30d" | "90d" | "custom";

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

function formatRp(value: number): string {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

function presetRange(preset: DatePreset): { fromDate: string; toDate: string } {
  const to = new Date();
  const from = new Date();
  to.setHours(0, 0, 0, 0);
  from.setHours(0, 0, 0, 0);

  switch (preset) {
    case "today":
      break;
    case "7d":
      from.setDate(from.getDate() - 6);
      break;
    case "30d":
      from.setDate(from.getDate() - 29);
      break;
    case "90d":
      from.setDate(from.getDate() - 89);
      break;
    default:
      from.setDate(from.getDate() - 29);
  }

  return {
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
  };
}

type Props = {
  outletId: number;
};

export function LoyaltyAnalyticsDashboard({ outletId }: Props) {
  const [preset, setPreset] = useState<DatePreset>("30d");
  const [fromDate, setFromDate] = useState(() => presetRange("30d").fromDate);
  const [toDate, setToDate] = useState(() => presetRange("30d").toDate);
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<LoyaltyAnalyticsDashboard | null>(null);
  const [growthView, setGrowthView] = useState<"daily" | "weekly" | "monthly">("daily");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLoyaltyAnalyticsDashboard({
        outletId,
        fromDate,
        toDate,
      });
      setDashboard(data);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load analytics dashboard");
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [outletId, fromDate, toDate]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const applyPreset = (next: DatePreset) => {
    setPreset(next);
    if (next !== "custom") {
      const range = presetRange(next);
      setFromDate(range.fromDate);
      setToDate(range.toDate);
    }
  };

  const executive = dashboard?.executiveSummary;
  const growthData = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.memberGrowth[growthView] ?? [];
  }, [dashboard, growthView]);

  const revenueComparison = useMemo(
    () =>
      executive
        ? [
            { label: "Member revenue", value: executive.memberRevenue },
            { label: "Non-member revenue", value: executive.nonMemberRevenue },
          ]
        : [],
    [executive],
  );

  const topMemberColumns: Column<LoyaltyAnalyticsTopMember>[] = [
    { key: "memberNo", header: "Member #", sortable: true },
    { key: "name", header: "Name", sortable: true },
    {
      key: "spending",
      header: "Spending",
      render: (r) => formatRp(r.spending),
    },
    { key: "points", header: "Points earned", sortable: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <div className="space-y-1">
          <Label>Date range</Label>
          <Select value={preset} onValueChange={(v) => applyPreset(v as DatePreset)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {preset === "custom" && (
          <>
            <div className="space-y-1">
              <Label>From</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>To</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </>
        )}
        <Button variant="outline" onClick={() => void loadDashboard()} disabled={loading}>
          Refresh
        </Button>
      </div>

      {loading && !dashboard && <p className="text-sm text-muted-foreground">Loading dashboard…</p>}

      {dashboard && executive && (
        <>
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Executive summary
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Total members", value: executive.totalMembers, icon: Users },
                { label: "Active members", value: executive.activeMembers, icon: Users },
                { label: "New members", value: executive.newMembers, icon: TrendingUp },
                { label: "Repeat customer rate", value: `${executive.repeatCustomerRate}%`, icon: TrendingUp },
                { label: "Member revenue", value: formatRp(executive.memberRevenue), icon: Gift },
                { label: "Non-member revenue", value: formatRp(executive.nonMemberRevenue), icon: Gift },
                { label: "Avg member spend", value: formatRp(executive.averageMemberSpend), icon: BarChart3 },
              ].map((card) => (
                <div key={card.label} className="rounded-xl border bg-card p-4">
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="text-xl font-bold mt-1">{card.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-semibold">Member growth</h3>
                <Select value={growthView} onValueChange={(v) => setGrowthView(v as typeof growthView)}>
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="newMembers" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3">Revenue comparison</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueComparison}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v: number) => formatRp(v)} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3">Points issuance trend</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboard.pointsAnalytics.issuanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="points" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-sm">
                <div><span className="text-muted-foreground">Issued</span><p className="font-semibold">{dashboard.pointsAnalytics.pointsIssued.toLocaleString()}</p></div>
                <div><span className="text-muted-foreground">Redeemed</span><p className="font-semibold">{dashboard.pointsAnalytics.pointsRedeemed.toLocaleString()}</p></div>
                <div><span className="text-muted-foreground">Expired</span><p className="font-semibold">{dashboard.pointsAnalytics.pointsExpired.toLocaleString()}</p></div>
                <div><span className="text-muted-foreground">Outstanding</span><p className="font-semibold">{dashboard.pointsAnalytics.outstandingPoints.toLocaleString()}</p></div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3">Points redemption trend</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboard.pointsAnalytics.redemptionTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="points" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3">Voucher performance</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3 text-sm">
                <div><span className="text-muted-foreground">Issued</span><p className="font-semibold">{dashboard.voucherAnalytics.vouchersIssued}</p></div>
                <div><span className="text-muted-foreground">Redeemed</span><p className="font-semibold">{dashboard.voucherAnalytics.vouchersRedeemed}</p></div>
                <div><span className="text-muted-foreground">Redemption rate</span><p className="font-semibold">{dashboard.voucherAnalytics.voucherRedemptionRate}%</p></div>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.voucherAnalytics.topVouchers}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="voucher" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="issued" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="redeemed" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3">Rewards redeemed</h3>
              <p className="text-2xl font-bold mb-3">{dashboard.rewardsAnalytics.rewardsRedeemed.toLocaleString()}</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.rewardsAnalytics.topRewards} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="reward" width={100} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">Campaign performance</h3>
            <DataTable
              columns={[
                { key: "campaign", header: "Campaign", sortable: true },
                { key: "audience", header: "Audience", sortable: true },
                { key: "voucherIssued", header: "Vouchers issued", sortable: true },
                { key: "voucherRedeemed", header: "Redeemed", sortable: true },
                {
                  key: "conversionRate",
                  header: "Conversion",
                  render: (r) => `${r.conversionRate}%`,
                },
              ]}
              data={dashboard.campaignAnalytics.campaignPerformance}
              rowKey={(r) => r.campaign}
              emptyMessage="No campaigns for this outlet."
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3">Segment distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboard.segmentAnalytics.segmentDistribution}
                      dataKey="members"
                      nameKey="segment"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ segment, members }) => `${segment}: ${members}`}
                    >
                      {dashboard.segmentAnalytics.segmentDistribution.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3">Tier distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboard.tierAnalytics.tierDistribution}
                      dataKey="members"
                      nameKey="tier"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ tier, members }) => `${tier}: ${members}`}
                    >
                      {dashboard.tierAnalytics.tierDistribution.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4" /> Automation performance
            </h3>
            <div className="grid sm:grid-cols-3 gap-3 mb-4 text-sm">
              <div><span className="text-muted-foreground">Executions</span><p className="text-xl font-bold">{dashboard.automationAnalytics.automationExecutions}</p></div>
              <div><span className="text-muted-foreground">Success</span><p className="text-xl font-bold text-emerald-600">{dashboard.automationAnalytics.automationSuccess}</p></div>
              <div><span className="text-muted-foreground">Failed</span><p className="text-xl font-bold text-destructive">{dashboard.automationAnalytics.automationFailed}</p></div>
            </div>
            <DataTable
              columns={[
                { key: "automation", header: "Automation", sortable: true },
                { key: "executions", header: "Executions", sortable: true },
                { key: "success", header: "Success", sortable: true },
              ]}
              data={dashboard.automationAnalytics.topAutomations}
              rowKey={(r) => r.automation}
              emptyMessage="No automation runs in this period."
            />
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">Top members</h3>
            <DataTable
              columns={topMemberColumns}
              data={dashboard.topMembers}
              rowKey={(r) => r.memberNo}
              emptyMessage="No member activity in this period."
            />
          </div>
        </>
      )}
    </div>
  );
}
