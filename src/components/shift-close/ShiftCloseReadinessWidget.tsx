import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getShiftCloseReadiness } from "@/lib/api-integration/shiftCloseEndpoints";
import { SystemModuleHealthCard } from "@/components/system-health/SystemModuleHealthCard";
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

export function ShiftCloseReadinessWidget() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const canView = hasPermission("finance.shift_close");
  const enabled = canView && typeof activeOutletId === "number" && activeOutletId >= 1;

  const readinessQ = useQuery({
    queryKey: ["system-health", "shift-close-readiness", activeOutletId],
    queryFn: () => getShiftCloseReadiness(activeOutletId!),
    enabled,
    staleTime: 60_000,
  });

  const qr = readinessQ.data?.qrOrders;
  const pendingQr = qr ? qr.pending + qr.underReview + qr.linkedUnpaidBills : readinessQ.data?.checks.pendingQrOrders ?? 0;

  return (
    <SystemModuleHealthCard
      title="Shift Close Readiness"
      status={
        !enabled ? "restricted" : readinessQ.isLoading ? "loading" : readinessQ.isError ? "error" : "success"
      }
      severity={readinessQ.data?.closeRunning ? "warning" : readinessQ.data?.severity}
      openTo="/shift-close"
      errorMessage={readinessQ.error instanceof Error ? readinessQ.error.message : undefined}
    >
      {readinessQ.data ? (
        <div className="space-y-2">
          <MetricRow label="Last Run Status" value={readinessQ.data.lastRunStatus ?? readinessQ.data.lastClose?.status ?? "—"} />
          <MetricRow label="Open POS Sessions" value={readinessQ.data.openPosSessions?.count ?? readinessQ.data.checks.openPosSession ?? 0} />
          <MetricRow label="Open Bills" value={readinessQ.data.checks.openBills} />
          <MetricRow label="Pending QR" value={pendingQr} />
          <MetricRow label="Pending Consumption" value={readinessQ.data.checks.pendingConsumption} />
          {readinessQ.data.closeRunning ? (
            <p className="text-xs text-amber-600">Close in progress…</p>
          ) : null}
          <Link to="/shift-close" className="text-xs text-primary underline">Open shift close wizard</Link>
        </div>
      ) : null}
    </SystemModuleHealthCard>
  );
}
