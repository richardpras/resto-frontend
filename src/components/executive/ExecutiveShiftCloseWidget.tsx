import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ExecutiveWidgetCard } from "@/components/executive/ExecutiveWidgetCard";
import { getShiftCloseReadiness } from "@/lib/api-integration/shiftCloseEndpoints";
import { formatMoney } from "@/lib/format/currency";
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

export function ExecutiveShiftCloseWidget() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const canView = hasPermission("finance.shift_close");
  const enabled = canView && typeof activeOutletId === "number" && activeOutletId >= 1;

  const readinessQ = useQuery({
    queryKey: ["executive", "shift-close-readiness", activeOutletId],
    queryFn: () => getShiftCloseReadiness(activeOutletId!),
    enabled,
    staleTime: 60_000,
  });

  const last = readinessQ.data?.lastClose;

  return (
    <ExecutiveWidgetCard
      title="Last Shift Close"
      description="Snapshot variances and posting status"
      status={!enabled ? "restricted" : readinessQ.isLoading ? "loading" : readinessQ.isError ? "error" : "success"}
      permissionHint="Requires finance.shift_close"
      errorMessage={readinessQ.error instanceof Error ? readinessQ.error.message : undefined}
      openTo="/shift-close"
    >
      {readinessQ.data ? (
        <div className="space-y-2">
          <MetricRow label="Last Close" value={last?.completedAt ? new Date(last.completedAt).toLocaleString() : "—"} />
          <MetricRow label="Open Bills" value={last?.openBillCount ?? readinessQ.data.checks.openBills} />
          <MetricRow label="Cash Variance" value={last?.cashVariance != null ? formatMoney(last.cashVariance) : "—"} />
          <MetricRow label="Inventory Variance" value={last?.inventoryVariance ?? 0} />
          <MetricRow label="Status" value={last?.status ?? last?.postingStatus ?? "—"} />
          <Link to="/shift-close" className="text-xs text-primary underline">Run shift close</Link>
        </div>
      ) : null}
    </ExecutiveWidgetCard>
  );
}
