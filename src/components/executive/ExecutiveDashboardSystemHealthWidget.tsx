import { useExecutiveSystemHealthSummary } from "@/hooks/executive/useExecutiveSystemHealthSummary";
import { ExecutiveWidgetCard } from "@/components/executive/ExecutiveWidgetCard";
import { SystemHealthStatusBadge } from "@/components/system-health/SystemHealthStatusBadge";
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

export function ExecutiveDashboardSystemHealthWidget() {
  const { t } = useErpTranslation();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const health = useExecutiveSystemHealthSummary(activeOutletId, hasPermission);

  const status = health.loading
    ? "loading"
    : hasPermission("settings.manage")
      ? "success"
      : "restricted";

  return (
    <ExecutiveWidgetCard
      title={t("executive.systemHealthWidget.title")}
      description={t("executive.systemHealthWidget.description")}
      status={status}
      permissionHint="settings.manage"
      openTo="/system/health"
      openLabel={t("executive.systemHealthWidget.healthCenter")}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold tabular-nums">{health.score}</span>
          <SystemHealthStatusBadge severity={health.severity} />
        </div>
        <MetricRow label={t("executive.systemHealthWidget.activeIncidents")} value={health.activeIncidents} />
        <MetricRow label={t("executive.systemHealthWidget.criticalBugs")} value={health.bugReports.counts?.critical ?? 0} />
        <MetricRow label={t("executive.systemHealthWidget.failedJobs")} value={health.failedJobs.data?.failedJobs ?? 0} />
        {health.scorePartial ? (
          <p className="text-xs text-muted-foreground">{t("executive.systemHealthWidget.partialScore")}</p>
        ) : null}
      </div>
    </ExecutiveWidgetCard>
  );
}
