import { useEffect } from "react";
import { TrendingUp, DollarSign, ShoppingBag, Users, AlertTriangle, Printer, QrCode, Utensils, Cpu, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis } from "recharts";
import { useOperationalDashboardStore } from "@/stores/operationalDashboardStore";
import { useOutletStore } from "@/stores/outletStore";
import { useDashboardSummaryStore } from "@/stores/dashboardSummaryStore";
import { ConnectivitySyncRibbon } from "@/components/ConnectivitySyncRibbon";
import { EMPTY_OFFLINE_RESILIENCE } from "@/domain/operationsTypes";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardMonitoringSectionSkeleton } from "@/components/skeletons/dashboard/DashboardMonitoringSectionSkeleton";
import { SkeletonBusyRegion } from "@/components/skeletons/SkeletonBusyRegion";
import { useAuthStore } from "@/stores/authStore";
import { getUserCapabilities } from "@/domain/accessControl";

function formatRp(value: number): string {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

export default function Dashboard() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const authUser = useAuthStore((s) => s.user);
  const capabilities = getUserCapabilities(authUser);
  const metrics = useOperationalDashboardStore((s) => s.metrics);
  const startMonitoring = useOperationalDashboardStore((s) => s.startMonitoring);
  const stopMonitoring = useOperationalDashboardStore((s) => s.stopMonitoring);
  const realtimeTransport = useOperationalDashboardStore((s) => s.realtimeTransport);
  const initialLoading = useOperationalDashboardStore((s) => s.initialLoading);
  const switchingOutlet = useOperationalDashboardStore((s) => s.switchingOutlet);
  const backgroundRefreshing = useOperationalDashboardStore((s) => s.backgroundRefreshing);
  const realtimeRefreshing = useOperationalDashboardStore((s) => s.realtimeRefreshing);
  const lastSyncAt = useOperationalDashboardStore((s) => s.lastSuccessfulSyncAt);
  const summary = useDashboardSummaryStore((s) => s.summary);
  const summaryInitialLoading = useDashboardSummaryStore((s) => s.initialLoading);
  const summarySwitchingOutlet = useDashboardSummaryStore((s) => s.switchingOutlet);
  const summaryBackgroundRefreshing = useDashboardSummaryStore((s) => s.backgroundRefreshing);
  const summaryLastSyncAt = useDashboardSummaryStore((s) => s.lastSuccessfulSyncAt);
  const summaryHasLoadedOnce = useDashboardSummaryStore((s) => s.hasLoadedOnce);
  const refreshSummary = useDashboardSummaryStore((s) => s.refresh);

  useEffect(() => {
    if (!capabilities.monitoring) return;
    if (typeof activeOutletId !== "number" || activeOutletId < 1) return;
    void startMonitoring(5000, activeOutletId);
    void refreshSummary(activeOutletId, summaryHasLoadedOnce ? "outlet-switch" : "initial");
    return () => stopMonitoring();
  }, [activeOutletId, refreshSummary, startMonitoring, stopMonitoring, summaryHasLoadedOnce, capabilities.monitoring]);

  useEffect(() => {
    if (!capabilities.monitoring) return;
    if (typeof activeOutletId !== "number" || activeOutletId < 1) return;
    const timer = setInterval(() => {
      void refreshSummary(activeOutletId, "background");
    }, 15000);
    return () => clearInterval(timer);
  }, [activeOutletId, refreshSummary, capabilities.monitoring]);

  const resilient = metrics.offlineResilience ?? EMPTY_OFFLINE_RESILIENCE;

  const baseStats = [
    { label: "Today's Revenue", value: formatRp(summary.kpis.revenueToday), icon: DollarSign },
    { label: "Total Orders", value: `${summary.kpis.orderCountToday}`, icon: ShoppingBag },
    { label: "Avg Order Value", value: formatRp(summary.kpis.avgOrderValue), icon: TrendingUp },
    { label: "Customers", value: `${summary.kpis.customerCount}`, icon: Users },
  ];

  const showDashboardSkeleton = summaryInitialLoading || summarySwitchingOutlet;
  const showMonitoringSkeleton = initialLoading || switchingOutlet;
  const syncText = summaryLastSyncAt ?? lastSyncAt;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl">
      <ConnectivitySyncRibbon outletId={activeOutletId} />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Overview of today's operations</p>
      </div>

      {/* Existing stat cards (kept additive) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {baseStats.map((s) => (
          <div key={s.label} className="bg-card rounded-2xl p-4 pos-shadow-md border border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {summaryBackgroundRefreshing || backgroundRefreshing || realtimeRefreshing ? "Syncing..." : "Live"}
              </span>
            </div>
            <p className="text-lg md:text-xl font-bold text-foreground">{showDashboardSkeleton ? "..." : s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Additive operations monitoring board */}
      <div className="bg-card rounded-2xl p-5 pos-shadow-md border border-border/50 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Operational Monitoring</h3>
          <div className="text-xs text-muted-foreground min-h-[1rem] flex items-center">
            {showMonitoringSkeleton ? (
              <Skeleton className="h-3 w-44" />
            ) : (
              <>
                Transport: {realtimeTransport}
                {syncText ? ` • Updated ${new Date(syncText).toLocaleTimeString()}` : ""}
                {backgroundRefreshing || summaryBackgroundRefreshing ? " • Background refresh" : ""}
              </>
            )}
          </div>
        </div>
        <SkeletonBusyRegion busy={showMonitoringSkeleton} label="Loading operational metrics">
          {showMonitoringSkeleton ? (
            <DashboardMonitoringSectionSkeleton showMetaRow={false} />
          ) : (
            <>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Utensils className="h-3 w-3" /> Kitchen Counters</p>
            <p className="text-sm font-semibold">Queued {metrics.kitchen.queued} • In Progress {metrics.kitchen.inProgress} • Ready {metrics.kitchen.ready}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">Pending Payments</p>
            <p className="text-2xl font-bold">{metrics.pendingPayments}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">Active Sessions</p>
            <p className="text-2xl font-bold">{metrics.activeSessions}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><QrCode className="h-3 w-3" /> Realtime QR Queue</p>
            <p className="text-2xl font-bold">
              {metrics.qrQueue.pendingConfirmation + metrics.qrQueue.expired}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Pending confirmation {metrics.qrQueue.pendingConfirmation} · Expired {metrics.qrQueue.expired}
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Printer className="h-3 w-3" /> Printer Queue</p>
            <p className="text-sm font-semibold">Pending {metrics.printerQueue.pending} • Printing {metrics.printerQueue.printing} • Failed {metrics.printerQueue.failed}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Reconciliation Warnings</p>
            <p className="text-sm font-semibold">{metrics.reconciliationWarnings.length} warning(s)</p>
          </div>
        </div>
        {metrics.reconciliationWarnings.length > 0 && (
          <div className="space-y-2">
            {metrics.reconciliationWarnings.map((warning) => (
              <div key={warning.id} className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
                {warning.message}
              </div>
            ))}
          </div>
        )}
            </>
          )}
        </SkeletonBusyRegion>
      </div>

      {/* Additive CRM monitoring card */}
      <div className="bg-card rounded-2xl p-5 pos-shadow-md border border-border/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">CRM Snapshot</h3>
          <span className="text-xs text-muted-foreground">Gift card + loyalty</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">Customers</p>
            <p className="text-2xl font-bold">{summary.crmMetrics.activeCustomers}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">Repeat Visit Rate</p>
            <p className="text-2xl font-bold">{summary.crmMetrics.repeatVisitRate}%</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">Points Issued</p>
            <p className="text-base font-bold">{summary.crmMetrics.loyaltyPointsIssued.toLocaleString("id-ID")}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">Points Redeemed</p>
            <p className="text-2xl font-bold">{summary.crmMetrics.loyaltyPointsRedeemed.toLocaleString("id-ID")}</p>
          </div>
        </div>
      </div>

      {/* Phase 13 — Offline / multi-terminal operational signals (additive) */}
        <div className="bg-card rounded-2xl p-5 pos-shadow-md border border-border/50 space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Offline resilience & terminals</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">Replay applied (window)</p>
              <p className="text-2xl font-bold">{resilient.syncOperationsApplied}</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">Replay failures</p>
              <p className="text-2xl font-bold text-destructive">{resilient.syncReplayFailures}</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">Stale replay rejections</p>
              <p className="text-2xl font-bold">{resilient.syncStaleReplayRejections}</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">Server conflicts logged</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{resilient.syncConflictOperations}</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">Duplicate replay hits</p>
              <p className="text-2xl font-bold">{resilient.duplicateReplayAttemptsObserved}</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">Conflict audit events</p>
              <p className="text-2xl font-bold">{resilient.conflictEventsLogged}</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">Registered terminals</p>
              <p className="text-2xl font-bold">{resilient.registeredTerminals}</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">Stale terminals (heartbeat)</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{resilient.staleTerminalDevices}</p>
            </div>
          </div>
        </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Peak Hours */}
        <div className="lg:col-span-2 bg-card rounded-2xl p-5 pos-shadow-md border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-4">Peak Hours</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={summary.hourlyOrders}>
              <defs>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(147, 16%, 19%)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(147, 16%, 19%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(140, 12%, 90%)" />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="hsl(147, 8%, 46%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(147, 8%, 46%)" />
              <Tooltip />
              <Area type="monotone" dataKey="orders" stroke="hsl(147, 16%, 19%)" fill="url(#colorOrders)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Menus */}
        <div className="bg-card rounded-2xl p-5 pos-shadow-md border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-4">Best Sellers</h3>
          <div className="space-y-3">
            {summary.topMenus.map((m, i) => (
              <div key={m.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.qty} sold</p>
                </div>
                <span className="text-sm font-semibold text-foreground">{formatRp(m.revenue)}</span>
              </div>
            ))}
            {summary.topMenus.length === 0 && (
              <p className="text-sm text-muted-foreground">No top menu data yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-5 pos-shadow-md border border-border/50">
        <h3 className="text-sm font-semibold text-foreground mb-4">Best Seller di Outlet Lain</h3>
        <div className="space-y-3">
          {summary.bestSellerOtherOutlets.map((item, index) => (
            <div key={`${item.name}-${item.outletName}`} className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground w-5">{index + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.outletName} • {item.qty} sold</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                {item.trend === "up" ? <ArrowUpRight className="h-3 w-3 text-success" /> : null}
                {item.trend === "down" ? <ArrowDownRight className="h-3 w-3 text-destructive" /> : null}
                {item.trend === "flat" ? <Minus className="h-3 w-3" /> : null}
                {item.trend}
              </span>
            </div>
          ))}
          {summary.bestSellerOtherOutlets.length === 0 && (
            <p className="text-sm text-muted-foreground">No cross-outlet bestseller data available.</p>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-card rounded-2xl p-5 pos-shadow-md border border-border/50">
        <h3 className="text-sm font-semibold text-foreground mb-4">Recent Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b">
                <th className="pb-3 font-medium">Order</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Total</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentTransactions.map((tx) => (
                <tr key={tx.id} className="border-b border-border/50 last:border-0">
                  <td className="py-3 font-medium text-foreground">#{tx.id}</td>
                  <td className="py-3 text-muted-foreground">{tx.type}</td>
                  <td className="py-3 font-medium text-foreground">{formatRp(tx.total)}</td>
                  <td className="py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      tx.status === "Paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3 text-muted-foreground">{tx.time}</td>
                </tr>
              ))}
              {summary.recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-sm text-muted-foreground">No recent transactions.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
