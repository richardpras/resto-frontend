import { useQuery } from "@tanstack/react-query";
import { ExecutiveWidgetCard } from "@/components/executive/ExecutiveWidgetCard";
import { executiveQueryKeys } from "@/hooks/executive/executiveQueryKeys";
import { getQrOrderCustomerHealth } from "@/lib/api-integration/qrOrderEndpoints";
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

export function ExecutiveCustomerOrderingWidget() {
  const { t } = useErpTranslation();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const canView = hasPermission("pos.use");
  const enabled = canView && typeof activeOutletId === "number" && activeOutletId >= 1;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: executiveQueryKeys.qrCustomerHealth(activeOutletId),
    queryFn: () => getQrOrderCustomerHealth(activeOutletId!),
    enabled,
    staleTime: 60_000,
  });

  return (
    <ExecutiveWidgetCard
      title={t("executive.customerOrdering.title")}
      description={t("executive.customerOrdering.description")}
      status={!canView ? "restricted" : isLoading ? "loading" : isError ? "error" : "success"}
      permissionHint={t("executive.customerOrdering.permissionHint")}
      errorMessage={error instanceof Error ? error.message : undefined}
      openTo="/qr-orders"
    >
      {data ? (
        <div className="space-y-2">
          <MetricRow label={t("executive.customerOrdering.pendingReviews")} value={data.pendingReviews} />
          <MetricRow label={t("executive.customerOrdering.awaitingApproval")} value={data.adjustedAwaitingApproval} />
          <MetricRow label={t("executive.customerOrdering.avgReviewTime")} value={data.averageReviewTimeMinutes} />
          <MetricRow label={t("executive.customerOrdering.avgReadyTime")} value={data.averageReadyTimeMinutes} />
          <MetricRow label={t("executive.customerOrdering.customerCallsToday")} value={data.callCashierVolume} />
        </div>
      ) : null}
    </ExecutiveWidgetCard>
  );
}
