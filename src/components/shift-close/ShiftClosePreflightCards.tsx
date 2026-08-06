import type { ShiftClosePreflight } from "@/lib/api-integration/shiftCloseEndpoints";
import { Card } from "@/components/ui/card";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";

function PreflightCard({ title, value, warn }: { title: string; value: number; warn?: boolean }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className={`text-2xl font-semibold tabular-nums ${warn && value > 0 ? "text-amber-600" : ""}`}>{value}</p>
    </Card>
  );
}

export function ShiftClosePreflightCards({ preflight }: { preflight: ShiftClosePreflight }) {
  const { t } = useOpsTranslation();
  const checks = preflight.checks;
  const qr = preflight.qrOrders;
  const qrTotal = qr
    ? (qr.pending ?? 0) + (qr.underReview ?? 0) + (qr.linkedUnpaidBills ?? 0)
    : (checks?.pendingQrOrders ?? 0);

  return (
    <div className="grid grid-cols-2 gap-3">
      <PreflightCard
        title={t("shiftClose.preflightCards.openPosSessions")}
        value={preflight.openPosSessions?.count ?? checks?.openPosSession ?? 0}
        warn
      />
      <PreflightCard title={t("shiftClose.preflightCards.openBills")} value={checks?.openBills ?? 0} warn />
      <PreflightCard title={t("shiftClose.preflightCards.qrOrders")} value={qrTotal} warn />
      <PreflightCard title={t("shiftClose.preflightCards.kdsTickets")} value={checks?.pendingKitchenTickets ?? 0} warn />
      <PreflightCard title={t("shiftClose.preflightCards.printQueue")} value={checks?.failedPrintJobs ?? 0} warn />
      <PreflightCard title={t("shiftClose.preflightCards.pendingConsumption")} value={checks?.pendingConsumption ?? 0} warn />
      <PreflightCard title={t("shiftClose.preflightCards.accountingHealth")} value={checks?.failedAccountingPostings ?? 0} warn />
    </div>
  );
}
