import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle } from "lucide-react";
import { getRecoverySummary, type RecoverySummaryApi } from "@/lib/api-integration/endpoints";
import { useOutletStore } from "@/stores/outletStore";
import { useAuthStore } from "@/stores/authStore";

function formatRp(value: number): string {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

export function RecoveryDashboardWidget() {
  const { t } = useTranslation("ops");
  const outletId = useOutletStore((s) => s.activeOutletId);
  const user = useAuthStore((s) => s.user);
  const canView = user?.permissions.includes("orders.recovery.read") ?? false;
  const [summary, setSummary] = useState<RecoverySummaryApi | null>(null);

  useEffect(() => {
    if (!canView || typeof outletId !== "number" || outletId < 1) return;
    void getRecoverySummary(outletId)
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [canView, outletId]);

  if (!canView || summary == null) return null;

  return (
    <div className="bg-card rounded-2xl p-4 border border-amber-500/25 space-y-2" data-testid="recovery-dashboard-widget">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <h3 className="text-sm font-semibold text-foreground">{t("ordersExplorer.recoveryQueue.dashboardTitle", "Refund recovery")}</h3>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <div className="rounded-lg bg-muted/30 px-2 py-1.5">
          <p className="text-muted-foreground">{t("ordersExplorer.recoveryQueue.pending", "Pending")}</p>
          <p className="font-bold text-foreground">{summary.pendingCount}</p>
        </div>
        <div className="rounded-lg bg-muted/30 px-2 py-1.5">
          <p className="text-muted-foreground">{t("ordersExplorer.recoveryQueue.refundedToday", "Refunded today")}</p>
          <p className="font-bold text-foreground">{formatRp(summary.refundExecutedToday)}</p>
        </div>
        <div className="rounded-lg bg-muted/30 px-2 py-1.5">
          <p className="text-muted-foreground">{t("ordersExplorer.recoveryQueue.avgResolution", "Avg resolution")}</p>
          <p className="font-bold text-foreground">
            {summary.avgResolutionHours != null ? `${summary.avgResolutionHours}h` : "—"}
          </p>
        </div>
      </div>
      {summary.pendingCount > 0 ? (
        <Link to="/orders?recoveryPending=1" className="text-[11px] text-primary font-medium hover:underline">
          {t("ordersExplorer.recoveryQueue.openQueue", "Open pending refund queue")} →
        </Link>
      ) : null}
    </div>
  );
}
