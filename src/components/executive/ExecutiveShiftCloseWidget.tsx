import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ExecutiveWidgetCard } from "@/components/executive/ExecutiveWidgetCard";
import { executiveQueryKeys } from "@/hooks/executive/executiveQueryKeys";
import { getShiftCloseReadiness } from "@/lib/api-integration/shiftCloseEndpoints";
import { formatMoney } from "@/lib/format/currency";
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

export function ExecutiveShiftCloseWidget() {
  const { t } = useErpTranslation();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const canView = hasPermission("finance.shift_close");
  const enabled = canView && typeof activeOutletId === "number" && activeOutletId >= 1;

  const readinessQ = useQuery({
    queryKey: executiveQueryKeys.shiftCloseReadiness(activeOutletId),
    queryFn: () => getShiftCloseReadiness(activeOutletId!),
    enabled,
    staleTime: 60_000,
  });

  const last = readinessQ.data?.lastClose;

  return (
    <ExecutiveWidgetCard
      title={t("executive.shiftClose.title")}
      description={t("executive.shiftClose.description")}
      status={!enabled ? "restricted" : readinessQ.isLoading ? "loading" : readinessQ.isError ? "error" : "success"}
      permissionHint={t("executive.shiftClose.permissionHint")}
      errorMessage={readinessQ.error instanceof Error ? readinessQ.error.message : undefined}
      openTo="/shift-close"
    >
      {readinessQ.data ? (
        <div className="space-y-2">
          <MetricRow label={t("executive.shiftClose.lastClose")} value={last?.completedAt ? new Date(last.completedAt).toLocaleString() : "—"} />
          <MetricRow label={t("executive.shiftClose.openBills")} value={last?.openBillCount ?? readinessQ.data.checks.openBills} />
          <MetricRow label={t("executive.shiftClose.cashVariance")} value={last?.cashVariance != null ? formatMoney(last.cashVariance) : "—"} />
          <MetricRow label={t("executive.shiftClose.inventoryVariance")} value={last?.inventoryVariance ?? 0} />
          <MetricRow label={t("executive.shiftClose.status")} value={last?.status ?? last?.postingStatus ?? "—"} />
          <Link to="/shift-close" className="text-xs text-primary underline">{t("executive.shiftClose.runShiftClose")}</Link>
        </div>
      ) : null}
    </ExecutiveWidgetCard>
  );
}
