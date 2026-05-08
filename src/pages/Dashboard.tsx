import { useEffect } from "react";
import { TrendingUp, DollarSign, ShoppingBag, Users, AlertTriangle, Printer, QrCode, Utensils, Cpu } from "lucide-react";
import { CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis } from "recharts";
import { useOperationalDashboardStore } from "@/stores/operationalDashboardStore";
import { useOutletStore } from "@/stores/outletStore";
import { useCrmDashboardStore } from "@/stores/crmDashboardStore";
import { ConnectivitySyncRibbon } from "@/components/ConnectivitySyncRibbon";
import { EMPTY_OFFLINE_RESILIENCE } from "@/domain/operationsTypes";

const baseStats = [
  { label: "Today's Revenue", value: "Rp 12,450,000", icon: DollarSign },
  { label: "Total Orders", value: "148", icon: ShoppingBag },
  { label: "Avg Order Value", value: "Rp 84,100", icon: TrendingUp },
  { label: "Customers", value: "112", icon: Users },
];

const hourlyData = [
  { hour: "8AM", orders: 4 }, { hour: "9AM", orders: 8 }, { hour: "10AM", orders: 12 },
  { hour: "11AM", orders: 22 }, { hour: "12PM", orders: 35 }, { hour: "1PM", orders: 28 },
  { hour: "2PM", orders: 18 }, { hour: "3PM", orders: 14 }, { hour: "4PM", orders: 10 },
  { hour: "5PM", orders: 16 }, { hour: "6PM", orders: 30 }, { hour: "7PM", orders: 38 },
  { hour: "8PM", orders: 32 }, { hour: "9PM", orders: 20 },
];

const topMenus = [
  { name: "Nasi Goreng Special", qty: 42, revenue: "Rp 1,260,000" },
  { name: "Ayam Bakar", qty: 38, revenue: "Rp 1,520,000" },
  { name: "Es Teh Manis", qty: 65, revenue: "Rp 650,000" },
  { name: "Mie Goreng", qty: 28, revenue: "Rp 700,000" },
  { name: "Sate Ayam", qty: 25, revenue: "Rp 875,000" },
];

const recentTx = [
  { id: "#ORD-148", type: "Dine-in", total: "Rp 156,000", status: "Paid", time: "2 min ago" },
  { id: "#ORD-147", type: "Takeaway", total: "Rp 84,000", status: "Paid", time: "8 min ago" },
  { id: "#ORD-146", type: "Online", total: "Rp 210,000", status: "Cooking", time: "12 min ago" },
  { id: "#ORD-145", type: "Dine-in", total: "Rp 95,000", status: "Paid", time: "15 min ago" },
];

export default function Dashboard() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const metrics = useOperationalDashboardStore((s) => s.metrics);
  const startMonitoring = useOperationalDashboardStore((s) => s.startMonitoring);
  const stopMonitoring = useOperationalDashboardStore((s) => s.stopMonitoring);
  const realtimeTransport = useOperationalDashboardStore((s) => s.realtimeTransport);
  const isLoading = useOperationalDashboardStore((s) => s.isLoading);
  const lastSyncAt = useOperationalDashboardStore((s) => s.lastSyncAt);
  const crmMetrics = useCrmDashboardStore((s) => s.metrics);
  const refreshCrmMetrics = useCrmDashboardStore((s) => s.refreshForOutlet);
  const startCrmRealtime = useCrmDashboardStore((s) => s.startRealtime);
  const stopCrmRealtime = useCrmDashboardStore((s) => s.stopRealtime);
  const startCrmPolling = useCrmDashboardStore((s) => s.startPollingFallback);
  const stopCrmPolling = useCrmDashboardStore((s) => s.stopPollingFallback);

  useEffect(() => {
    void startMonitoring(5000);
    return () => {
      stopMonitoring();
    };
  }, [startMonitoring, stopMonitoring]);

  useEffect(() => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1) return;
    void refreshCrmMetrics(activeOutletId);
    startCrmRealtime();
    startCrmPolling(15000);
    return () => {
      stopCrmPolling();
      stopCrmRealtime();
    };
  }, [activeOutletId, refreshCrmMetrics, startCrmPolling, startCrmRealtime, stopCrmPolling, stopCrmRealtime]);

  const resilient = metrics.offlineResilience ?? EMPTY_OFFLINE_RESILIENCE;

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
              <span className="text-xs font-medium text-muted-foreground">Live</span>
            </div>
            <p className="text-lg md:text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Additive operations monitoring board */}
      <div className="bg-card rounded-2xl p-5 pos-shadow-md border border-border/50 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Operational Monitoring</h3>
          <div className="text-xs text-muted-foreground">
            {isLoading ? "Syncing..." : `Transport: ${realtimeTransport}`}
            {lastSyncAt ? ` • Updated ${new Date(lastSyncAt).toLocaleTimeString()}` : ""}
          </div>
        </div>
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
            <p className="text-2xl font-bold">{metrics.qrQueue}</p>
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
            <p className="text-2xl font-bold">{crmMetrics.customerCount}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">Active Loyalty</p>
            <p className="text-2xl font-bold">{crmMetrics.activeLoyaltyMembers}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">Gift Card Outstanding</p>
            <p className="text-base font-bold">Rp {crmMetrics.giftCardOutstandingValue.toLocaleString("id-ID")}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">Pending Settlements</p>
            <p className="text-2xl font-bold">{crmMetrics.pendingGiftCardSettlements}</p>
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
            <AreaChart data={hourlyData}>
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
            {topMenus.map((m, i) => (
              <div key={m.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.qty} sold</p>
                </div>
                <span className="text-sm font-semibold text-foreground">{m.revenue}</span>
              </div>
            ))}
          </div>
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
              {recentTx.map((tx) => (
                <tr key={tx.id} className="border-b border-border/50 last:border-0">
                  <td className="py-3 font-medium text-foreground">{tx.id}</td>
                  <td className="py-3 text-muted-foreground">{tx.type}</td>
                  <td className="py-3 font-medium text-foreground">{tx.total}</td>
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
