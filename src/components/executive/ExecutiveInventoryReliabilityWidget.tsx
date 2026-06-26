import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ExecutiveWidgetCard } from "@/components/executive/ExecutiveWidgetCard";
import { executiveQueryKeys } from "@/hooks/executive/executiveQueryKeys";
import { getInventoryPostingHealth } from "@/lib/api-integration/inventoryPostingEndpoints";
import { useAuthStore } from "@/stores/authStore";
import { useOutletStore } from "@/stores/outletStore";
import { formatMoney, formatPercent } from "@/lib/format/currency";
import { useErpTranslation } from "@/i18n/useErpTranslation";

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function ExecutiveInventoryReliabilityWidget() {
  const { t } = useErpTranslation();
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
      title={t("executive.inventoryReliability.title")}
      description={t("executive.inventoryReliability.description")}
      status={
        !enabled
          ? "restricted"
          : healthQ.isLoading
            ? "loading"
            : healthQ.isError
              ? "error"
              : "success"
      }
      permissionHint={t("executive.inventoryReliability.permissionHint")}
      errorMessage={healthQ.error instanceof Error ? healthQ.error.message : undefined}
      openTo="/inventory?tab=posting"
    >
      {healthQ.data ? (
        <div className="space-y-2">
          <MetricRow
            label={t("executive.inventoryReliability.postingSuccessRate")}
            value={formatPercent(healthQ.data.postingSuccessRate ?? 100)}
          />
          <MetricRow label={t("executive.inventoryReliability.openVariances")} value={healthQ.data.openVariances ?? 0} />
          <MetricRow
            label={t("executive.inventoryReliability.pendingConsumptionValue")}
            value={formatMoney(healthQ.data.pendingConsumptionValue ?? 0)}
          />
          <MetricRow label={t("executive.inventoryReliability.mode")} value={healthQ.data.enforcementMode} />
          <Link to="/inventory?tab=posting" className="text-xs text-primary underline">
            {t("executive.inventoryReliability.viewPending")}
          </Link>
        </div>
      ) : null}
    </ExecutiveWidgetCard>
  );
}
