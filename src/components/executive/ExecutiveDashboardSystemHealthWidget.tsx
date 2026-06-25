import { useExecutiveSystemHealthSummary } from "@/hooks/executive/useExecutiveSystemHealthSummary";
import { ExecutiveWidgetCard } from "@/components/executive/ExecutiveWidgetCard";
import { SystemHealthStatusBadge } from "@/components/system-health/SystemHealthStatusBadge";
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

export function ExecutiveDashboardSystemHealthWidget() {
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
      title="System Health Summary"
      description="Unified reliability and incident overview"
      status={status}
      permissionHint="settings.manage"
      openTo="/system/health"
      openLabel="Health Center"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold tabular-nums">{health.score}</span>
          <SystemHealthStatusBadge severity={health.severity} />
        </div>
        <MetricRow label="Active Incidents" value={health.activeIncidents} />
        <MetricRow label="Critical Bugs" value={health.bugReports.counts?.critical ?? 0} />
        <MetricRow label="Failed Jobs" value={health.failedJobs.data?.failedJobs ?? 0} />
        {health.scorePartial ? (
          <p className="text-xs text-muted-foreground">Partial score — some modules unavailable</p>
        ) : null}
      </div>
    </ExecutiveWidgetCard>
  );
}
