import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ExecutiveWidgetCard } from "@/components/executive/ExecutiveWidgetCard";
import { executiveQueryKeys } from "@/hooks/executive/executiveQueryKeys";
import { getInventoryPostingHealth } from "@/lib/api-integration/inventoryPostingEndpoints";
import { useAuthStore } from "@/stores/authStore";
import { useOutletStore } from "@/stores/outletStore";
import { formatMoney, formatPercent } from "@/lib/format/currency";

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function ExecutiveInventoryReliabilityWidget() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const canView = hasPermission("inventory.manage") || hasPermission("settings.manage");
  const enabled = canView && typeof activeOutletId === "number" && activeOutletId >= 1;

  const healthQ = useQuery({
    queryKey: executiveQueryKeys.inventoryPostingHealth(activeOutletId),
    queryFn: () => getInventoryPostingHealth(activeOutletId!),
    enabled,
    staleTime: 60_000,
  });

  return (
    <ExecutiveWidgetCard
      title="Inventory Reliability"
      description="Posting success, open variances, and pending consumption"
      status={
        !enabled
          ? "restricted"
          : healthQ.isLoading
            ? "loading"
            : healthQ.isError
              ? "error"
              : "success"
      }
      permissionHint="Requires inventory.manage or settings.manage"
      errorMessage={healthQ.error instanceof Error ? healthQ.error.message : undefined}
      openTo="/inventory?tab=posting"
    >
      {healthQ.data ? (
        <div className="space-y-2">
          <MetricRow
            label="Posting Success Rate"
            value={formatPercent(healthQ.data.postingSuccessRate ?? 100)}
          />
          <MetricRow label="Open Variances" value={healthQ.data.openVariances ?? 0} />
          <MetricRow
            label="Pending Consumption Value"
            value={formatMoney(healthQ.data.pendingConsumptionValue ?? 0)}
          />
          <MetricRow label="Mode" value={healthQ.data.enforcementMode} />
          <Link to="/inventory?tab=posting" className="text-xs text-primary underline">
            View pending consumption
          </Link>
        </div>
      ) : null}
    </ExecutiveWidgetCard>
  );
}
