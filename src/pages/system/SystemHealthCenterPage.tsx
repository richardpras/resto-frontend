import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { getInventoryPostingHealth } from "@/lib/api-integration/inventoryPostingEndpoints";
import { getPosCheckoutIntegrityHealth } from "@/lib/api-integration/posCheckoutIntegrityEndpoints";
import { ShiftCloseReadinessWidget } from "@/components/shift-close/ShiftCloseReadinessWidget";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SystemHealthScoreCard } from "@/components/system-health/SystemHealthScoreCard";
import { SystemModuleHealthCard } from "@/components/system-health/SystemModuleHealthCard";
import { SystemIncidentTimeline } from "@/components/system-health/SystemIncidentTimeline";
import { SystemPriorityQueue } from "@/components/system-health/SystemPriorityQueue";
import { SystemHealthTrendChart } from "@/components/system-health/SystemHealthTrendChart";
import { useSystemHealthData } from "@/hooks/system-health/useSystemHealthData";
import { useAuthStore } from "@/stores/authStore";
import { useOutletStore } from "@/stores/outletStore";

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default function SystemHealthCenterPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const canAccess = hasPermission("settings.manage");
  const health = useSystemHealthData(activeOutletId, hasPermission);
  const inventoryPostingQ = useQuery({
    queryKey: ["system-health", "inventory-posting", activeOutletId],
    queryFn: () => getInventoryPostingHealth(activeOutletId!),
    enabled: canAccess && typeof activeOutletId === "number" && activeOutletId >= 1,
    staleTime: 60_000,
  });
  const checkoutIntegrityQ = useQuery({
    queryKey: ["system-health", "checkout-integrity", activeOutletId],
    queryFn: () => getPosCheckoutIntegrityHealth(activeOutletId!),
    enabled: canAccess && typeof activeOutletId === "number" && activeOutletId >= 1,
    staleTime: 60_000,
  });

  if (!canAccess) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center space-y-4">
        <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground" />
        <h1 className="text-xl font-semibold">System Health Center</h1>
        <p className="text-muted-foreground">You need settings.manage permission to view the health center.</p>
      </div>
    );
  }

  if (typeof activeOutletId !== "number" || activeOutletId < 1) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">System Health Center</h1>
        <p className="text-sm text-muted-foreground mt-2">Select an outlet to load health data.</p>
      </div>
    );
  }

  const handleRefresh = () => {
    health.refetchAll();
    toast.message("Refreshing health data…");
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Health Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Unified operations and reliability command center — cross-module health aggregation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/reports">Reports Hub</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <SystemHealthScoreCard
          score={health.score}
          severity={health.severity}
          partial={health.scorePartial}
          loading={health.loading}
        />
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Active Incidents</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{health.activeIncidents}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Critical Alerts</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{health.notifications.critical?.length ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Open Bugs</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{health.bugReports.counts?.open ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Failed Jobs</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{health.failedJobs.data?.failedJobs ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Unread</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{health.notifications.unreadCount ?? 0}</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <SystemModuleHealthCard
          title="Accounting Health"
          status={health.accounting.status}
          severity={health.accounting.data?.healthSeverity}
          openTo="/accounting?tab=health"
          errorMessage={health.accounting.error}
        >
          {health.accounting.data ? (
            <div className="space-y-2">
              <MetricRow label="Health Score" value={health.accounting.data.healthScore} />
              <MetricRow label="Failed Postings" value={health.accounting.data.failedPostings} />
              <MetricRow label="Priority Queue" value={health.accounting.data.priorityQueue?.length ?? 0} />
              {health.accounting.data.priorityQueue?.[0] ? (
                <p className="text-xs text-muted-foreground truncate">
                  Latest: {health.accounting.data.priorityQueue[0].title}
                </p>
              ) : null}
            </div>
          ) : null}
        </SystemModuleHealthCard>

        <SystemModuleHealthCard
          title="Inventory Posting Issues"
          status={
            inventoryPostingQ.isLoading
              ? "loading"
              : inventoryPostingQ.isError
                ? "error"
                : "success"
          }
          severity={inventoryPostingQ.data?.severity}
          openTo="/inventory"
          errorMessage={inventoryPostingQ.error instanceof Error ? inventoryPostingQ.error.message : undefined}
        >
          {inventoryPostingQ.data ? (
            <div className="space-y-2">
              <MetricRow label="Pending" value={inventoryPostingQ.data.pendingPostings} />
              <MetricRow label="Review Required" value={inventoryPostingQ.data.reviewRequiredPostings} />
              <MetricRow label="Failed" value={inventoryPostingQ.data.failedPostings} />
              <MetricRow label="Open Incidents" value={inventoryPostingQ.data.openIncidents} />
              <MetricRow label="Mode" value={inventoryPostingQ.data.enforcementMode} />
            </div>
          ) : null}
        </SystemModuleHealthCard>

        <ShiftCloseReadinessWidget />

        <SystemModuleHealthCard
          title="Duplicate Order Prevention"
          status={
            checkoutIntegrityQ.isLoading
              ? "loading"
              : checkoutIntegrityQ.isError
                ? "error"
                : "success"
          }
          openTo="/pos"
          errorMessage={checkoutIntegrityQ.error instanceof Error ? checkoutIntegrityQ.error.message : undefined}
        >
          {checkoutIntegrityQ.data ? (
            <div className="space-y-2">
              <MetricRow label="Retries" value={checkoutIntegrityQ.data.retries} />
              <MetricRow label="Idempotency Hits" value={checkoutIntegrityQ.data.idempotencyHits} />
              <MetricRow label="Duplicates Prevented" value={checkoutIntegrityQ.data.duplicatePreventionCount} />
              <MetricRow label="Resumed Orders" value={checkoutIntegrityQ.data.resumeExistingOrderCount} />
              <MetricRow label="QR Bill Resumes" value={checkoutIntegrityQ.data.qrResumeCount} />
            </div>
          ) : null}
        </SystemModuleHealthCard>

        <SystemModuleHealthCard
          title="Payment Health"
          status={health.payment.status}
          severity={health.payment.data?.healthSeverity}
          openTo="/settings/payments/health"
          errorMessage={health.payment.error}
        >
          {health.payment.data ? (
            <div className="space-y-2">
              <MetricRow label="Success Rate" value={`${health.payment.data.paymentSuccessRate ?? "—"}%`} />
              <MetricRow label="Failed Webhooks" value={health.payment.data.failedWebhooks ?? 0} />
              <MetricRow label="Open Incidents" value={health.payment.data.openIncidents ?? 0} />
            </div>
          ) : null}
        </SystemModuleHealthCard>

        <SystemModuleHealthCard
          title="Failed Jobs"
          status={health.failedJobs.status}
          severity={health.failedJobs.data?.healthStatus}
          openTo="/system/failed-jobs"
          errorMessage={health.failedJobs.error}
        >
          {health.failedJobs.data ? (
            <div className="space-y-2">
              <MetricRow label="Total Failures" value={health.failedJobs.data.failedJobs} />
              <MetricRow label="Critical" value={health.failedJobs.data.criticalFailures} />
              <MetricRow
                label="Oldest (min)"
                value={health.failedJobs.data.oldestFailureMinutes ?? "—"}
              />
            </div>
          ) : null}
        </SystemModuleHealthCard>

        <SystemModuleHealthCard
          title="Bug Reports"
          status={health.bugReports.status}
          severity={health.bugReports.counts?.critical ? "critical" : "healthy"}
          openTo="/system/bug-reports"
          errorMessage={health.bugReports.error}
        >
          {health.bugReports.counts ? (
            <div className="space-y-2">
              <MetricRow label="Open" value={health.bugReports.counts.open} />
              <MetricRow label="Critical" value={health.bugReports.counts.critical} />
              <MetricRow label="Investigating" value={health.bugReports.counts.investigating} />
              <MetricRow label="Fixed Today" value={health.bugReports.counts.fixedToday} />
            </div>
          ) : null}
        </SystemModuleHealthCard>

        <SystemModuleHealthCard
          title="Notifications"
          status={health.notifications.status}
          openTo="/notifications"
          errorMessage={health.notifications.error}
        >
          <div className="space-y-2">
            <MetricRow label="Critical" value={health.notifications.critical?.length ?? 0} />
            <MetricRow label="Unread" value={health.notifications.unreadCount ?? 0} />
            {Object.entries(health.notifications.bySource ?? {})
              .slice(0, 4)
              .map(([source, count]) => (
                <MetricRow key={source} label={source} value={count} />
              ))}
          </div>
        </SystemModuleHealthCard>

        <SystemModuleHealthCard
          title="Audit Activity"
          status={health.audit.status}
          openTo="/system/audit"
          errorMessage={health.audit.error}
        >
          {health.audit.data ? (
            <div className="space-y-2">
              <MetricRow label="Today" value={health.audit.data.todayEvents} />
              <MetricRow label="Critical" value={health.audit.data.criticalEvents} />
              <MetricRow label="Top Actor" value={health.audit.data.topActors?.[0]?.userName ?? "—"} />
              <MetricRow label="Top Module" value={health.audit.data.topModules?.[0]?.module ?? "—"} />
            </div>
          ) : null}
        </SystemModuleHealthCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Incident Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <SystemIncidentTimeline incidents={health.incidents} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Priority Action Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <SystemPriorityQueue actions={health.priorityQueue} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reliability Trends (30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <SystemHealthTrendChart
              title="System Score (proxy)"
              data={health.trends.systemScore.map((d) => ({ date: d.date, value: d.score }))}
              valueLabel="score"
            />
            <SystemHealthTrendChart
              title="Failed Jobs"
              data={health.trends.failedJobs.map((d) => ({ date: d.snapshotDate, value: d.totalFailures }))}
              valueLabel="failures"
              color="hsl(var(--destructive))"
            />
            <SystemHealthTrendChart
              title="Payment Success Rate"
              data={(health.trends.payment?.paymentSuccessTrend ?? []).map((d) => ({
                date: d.date,
                value: d.rate,
              }))}
              valueLabel="rate"
            />
            <SystemHealthTrendChart
              title="Accounting Posting Failures"
              data={(health.trends.accounting?.postingFailures ?? []).map((d) => ({
                date: d.date,
                value: d.count,
              }))}
              valueLabel="failures"
            />
            <SystemHealthTrendChart
              title="Payment Incidents"
              data={(health.trends.payment?.incidentTrend ?? []).map((d) => ({
                date: d.date,
                value: d.count,
              }))}
              valueLabel="incidents"
            />
            <SystemHealthTrendChart
              title="Bug Volume (notifications)"
              data={health.trends.bugVolume.map((d) => ({ date: d.date, value: d.count }))}
              valueLabel="bugs"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
