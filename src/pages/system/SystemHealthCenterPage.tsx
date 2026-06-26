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
import { useErpTranslation } from "@/i18n/useErpTranslation";

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default function SystemHealthCenterPage() {
  const { t } = useErpTranslation();
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
        <h1 className="text-xl font-semibold">{t("reportsHub.cards.system-health-center.title")}</h1>
        <p className="text-muted-foreground">{t("system.healthCenter.permissionDenied")}</p>
      </div>
    );
  }

  if (typeof activeOutletId !== "number" || activeOutletId < 1) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">{t("reportsHub.cards.system-health-center.title")}</h1>
        <p className="text-sm text-muted-foreground mt-2">{t("system.healthCenter.selectOutlet")}</p>
      </div>
    );
  }

  const handleRefresh = () => {
    health.refetchAll();
    toast.message(t("system.healthCenter.refreshing"));
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("reportsHub.cards.system-health-center.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("reportsHub.cards.system-health-center.description")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("ops:shared.refresh")}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/reports">{t("system.healthCenter.reportsHub")}</Link>
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
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t("system.healthCenter.metrics.activeIncidents")}</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{health.activeIncidents}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t("system.healthCenter.metrics.criticalAlerts")}</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{health.notifications.critical?.length ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t("system.healthCenter.metrics.openBugs")}</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{health.bugReports.counts?.open ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t("system.healthCenter.metrics.failedJobs")}</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{health.failedJobs.data?.failedJobs ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t("system.healthCenter.metrics.unread")}</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{health.notifications.unreadCount ?? 0}</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <SystemModuleHealthCard
          title={t("system.healthCenter.modules.accountingHealth")}
          status={health.accounting.status}
          severity={health.accounting.data?.healthSeverity}
          openTo="/accounting?tab=health"
          errorMessage={health.accounting.error}
        >
          {health.accounting.data ? (
            <div className="space-y-2">
              <MetricRow label={t("system.healthCenter.modules.healthScore")} value={health.accounting.data.healthScore} />
              <MetricRow label={t("system.healthCenter.modules.failedPostings")} value={health.accounting.data.failedPostings} />
              <MetricRow label={t("system.healthCenter.modules.priorityQueue")} value={health.accounting.data.priorityQueue?.length ?? 0} />
              {health.accounting.data.priorityQueue?.[0] ? (
                <p className="text-xs text-muted-foreground truncate">
                  {t("system.healthCenter.modules.latest", { title: health.accounting.data.priorityQueue[0].title })}
                </p>
              ) : null}
            </div>
          ) : null}
        </SystemModuleHealthCard>

        <SystemModuleHealthCard
          title={t("system.healthCenter.modules.inventoryPosting")}
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
              <MetricRow label={t("system.healthCenter.modules.pending")} value={inventoryPostingQ.data.pendingPostings} />
              <MetricRow label={t("system.healthCenter.modules.reviewRequired")} value={inventoryPostingQ.data.reviewRequiredPostings} />
              <MetricRow label={t("system.healthCenter.modules.failed")} value={inventoryPostingQ.data.failedPostings} />
              <MetricRow label={t("system.healthCenter.modules.openIncidents")} value={inventoryPostingQ.data.openIncidents} />
              <MetricRow label={t("system.healthCenter.modules.mode")} value={inventoryPostingQ.data.enforcementMode} />
            </div>
          ) : null}
        </SystemModuleHealthCard>

        <ShiftCloseReadinessWidget />

        <SystemModuleHealthCard
          title={t("system.healthCenter.modules.duplicateOrderPrevention")}
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
              <MetricRow label={t("system.healthCenter.modules.retries")} value={checkoutIntegrityQ.data.retries} />
              <MetricRow label={t("system.healthCenter.modules.idempotencyHits")} value={checkoutIntegrityQ.data.idempotencyHits} />
              <MetricRow label={t("system.healthCenter.modules.duplicatesPrevented")} value={checkoutIntegrityQ.data.duplicatePreventionCount} />
              <MetricRow label={t("system.healthCenter.modules.resumedOrders")} value={checkoutIntegrityQ.data.resumeExistingOrderCount} />
              <MetricRow label={t("system.healthCenter.modules.qrBillResumes")} value={checkoutIntegrityQ.data.qrResumeCount} />
            </div>
          ) : null}
        </SystemModuleHealthCard>

        <SystemModuleHealthCard
          title={t("system.healthCenter.modules.paymentHealth")}
          status={health.payment.status}
          severity={health.payment.data?.healthSeverity}
          openTo="/settings/payments/health"
          errorMessage={health.payment.error}
        >
          {health.payment.data ? (
            <div className="space-y-2">
              <MetricRow label={t("system.healthCenter.modules.successRate")} value={`${health.payment.data.paymentSuccessRate ?? "—"}%`} />
              <MetricRow label={t("system.healthCenter.modules.failedWebhooks")} value={health.payment.data.failedWebhooks ?? 0} />
              <MetricRow label={t("system.healthCenter.modules.openIncidents")} value={health.payment.data.openIncidents ?? 0} />
            </div>
          ) : null}
        </SystemModuleHealthCard>

        <SystemModuleHealthCard
          title={t("system.healthCenter.modules.failedJobs")}
          status={health.failedJobs.status}
          severity={health.failedJobs.data?.healthStatus}
          openTo="/system/failed-jobs"
          errorMessage={health.failedJobs.error}
        >
          {health.failedJobs.data ? (
            <div className="space-y-2">
              <MetricRow label={t("system.healthCenter.modules.totalFailures")} value={health.failedJobs.data.failedJobs} />
              <MetricRow label={t("system.healthCenter.modules.critical")} value={health.failedJobs.data.criticalFailures} />
              <MetricRow
                label={t("system.healthCenter.modules.oldestMinutes")}
                value={health.failedJobs.data.oldestFailureMinutes ?? "—"}
              />
            </div>
          ) : null}
        </SystemModuleHealthCard>

        <SystemModuleHealthCard
          title={t("system.healthCenter.modules.bugReports")}
          status={health.bugReports.status}
          severity={health.bugReports.counts?.critical ? "critical" : "healthy"}
          openTo="/system/bug-reports"
          errorMessage={health.bugReports.error}
        >
          {health.bugReports.counts ? (
            <div className="space-y-2">
              <MetricRow label={t("system.healthCenter.modules.open")} value={health.bugReports.counts.open} />
              <MetricRow label={t("system.healthCenter.modules.critical")} value={health.bugReports.counts.critical} />
              <MetricRow label={t("system.healthCenter.modules.investigating")} value={health.bugReports.counts.investigating} />
              <MetricRow label={t("system.healthCenter.modules.fixedToday")} value={health.bugReports.counts.fixedToday} />
            </div>
          ) : null}
        </SystemModuleHealthCard>

        <SystemModuleHealthCard
          title={t("system.healthCenter.modules.notifications")}
          status={health.notifications.status}
          openTo="/notifications"
          errorMessage={health.notifications.error}
        >
          <div className="space-y-2">
            <MetricRow label={t("system.healthCenter.modules.critical")} value={health.notifications.critical?.length ?? 0} />
            <MetricRow label={t("system.healthCenter.modules.unread")} value={health.notifications.unreadCount ?? 0} />
            {Object.entries(health.notifications.bySource ?? {})
              .slice(0, 4)
              .map(([source, count]) => (
                <MetricRow key={source} label={source} value={count} />
              ))}
          </div>
        </SystemModuleHealthCard>

        <SystemModuleHealthCard
          title={t("system.healthCenter.modules.auditActivity")}
          status={health.audit.status}
          openTo="/system/audit"
          errorMessage={health.audit.error}
        >
          {health.audit.data ? (
            <div className="space-y-2">
              <MetricRow label={t("system.healthCenter.modules.today")} value={health.audit.data.todayEvents} />
              <MetricRow label={t("system.healthCenter.modules.critical")} value={health.audit.data.criticalEvents} />
              <MetricRow label={t("system.healthCenter.modules.topActor")} value={health.audit.data.topActors?.[0]?.userName ?? "—"} />
              <MetricRow label={t("system.healthCenter.modules.topModule")} value={health.audit.data.topModules?.[0]?.module ?? "—"} />
            </div>
          ) : null}
        </SystemModuleHealthCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("system.healthCenter.incidentTimeline")}</CardTitle>
          </CardHeader>
          <CardContent>
            <SystemIncidentTimeline incidents={health.incidents} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("system.healthCenter.priorityQueue")}</CardTitle>
          </CardHeader>
          <CardContent>
            <SystemPriorityQueue actions={health.priorityQueue} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("system.healthCenter.reliabilityTrends")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <SystemHealthTrendChart
              title={t("system.healthCenter.trends.systemScore")}
              data={health.trends.systemScore.map((d) => ({ date: d.date, value: d.score }))}
              valueLabel={t("system.healthCenter.trends.score")}
            />
            <SystemHealthTrendChart
              title={t("system.healthCenter.trends.failedJobs")}
              data={health.trends.failedJobs.map((d) => ({ date: d.snapshotDate, value: d.totalFailures }))}
              valueLabel={t("system.healthCenter.trends.failures")}
              color="hsl(var(--destructive))"
            />
            <SystemHealthTrendChart
              title={t("system.healthCenter.trends.paymentSuccessRate")}
              data={(health.trends.payment?.paymentSuccessTrend ?? []).map((d) => ({
                date: d.date,
                value: d.rate,
              }))}
              valueLabel={t("system.healthCenter.trends.rate")}
            />
            <SystemHealthTrendChart
              title={t("system.healthCenter.trends.accountingPostingFailures")}
              data={(health.trends.accounting?.postingFailures ?? []).map((d) => ({
                date: d.date,
                value: d.count,
              }))}
              valueLabel={t("system.healthCenter.trends.failures")}
            />
            <SystemHealthTrendChart
              title={t("system.healthCenter.trends.paymentIncidents")}
              data={(health.trends.payment?.incidentTrend ?? []).map((d) => ({
                date: d.date,
                value: d.count,
              }))}
              valueLabel={t("system.healthCenter.trends.incidents")}
            />
            <SystemHealthTrendChart
              title={t("system.healthCenter.trends.bugVolume")}
              data={health.trends.bugVolume.map((d) => ({ date: d.date, value: d.count }))}
              valueLabel={t("system.healthCenter.trends.bugs")}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
