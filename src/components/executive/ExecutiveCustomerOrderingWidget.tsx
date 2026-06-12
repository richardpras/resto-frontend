import { useQuery } from "@tanstack/react-query";
import { ExecutiveWidgetCard } from "@/components/executive/ExecutiveWidgetCard";
import { getQrOrderCustomerHealth } from "@/lib/api-integration/qrOrderEndpoints";
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

export function ExecutiveCustomerOrderingWidget() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const canView = hasPermission("pos.use");
  const enabled = canView && typeof activeOutletId === "number" && activeOutletId >= 1;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["executive", "qr-customer-health", activeOutletId],
    queryFn: () => getQrOrderCustomerHealth(activeOutletId!),
    enabled,
    staleTime: 60_000,
  });

  return (
    <ExecutiveWidgetCard
      title="Customer Ordering Health"
      description="QR review queue and customer calls"
      status={!canView ? "restricted" : isLoading ? "loading" : isError ? "error" : "success"}
      permissionHint="Requires POS access"
      errorMessage={error instanceof Error ? error.message : undefined}
      openTo="/qr-orders"
    >
      {data ? (
        <div className="space-y-2">
          <MetricRow label="Pending Reviews" value={data.pendingReviews} />
          <MetricRow label="Awaiting Customer Approval" value={data.adjustedAwaitingApproval} />
          <MetricRow label="Avg Review Time (min)" value={data.averageReviewTimeMinutes} />
          <MetricRow label="Avg Ready Time (min)" value={data.averageReadyTimeMinutes} />
          <MetricRow label="Customer Calls Today" value={data.callCashierVolume} />
        </div>
      ) : null}
    </ExecutiveWidgetCard>
  );
}
