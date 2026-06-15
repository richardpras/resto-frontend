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
  const qr = preflight.qrOrders;
  const qrTotal = qr ? qr.pending + qr.underReview + qr.linkedUnpaidBills : preflight.checks.pendingQrOrders;

  return (
    <div className="grid grid-cols-2 gap-3">
      <PreflightCard
        title={t("shiftClose.preflightCards.openPosSessions")}
        value={preflight.openPosSessions?.count ?? preflight.checks.openPosSession ?? 0}
        warn
      />
      <PreflightCard title={t("shiftClose.preflightCards.openBills")} value={preflight.checks.openBills} warn />
      <PreflightCard title={t("shiftClose.preflightCards.qrOrders")} value={qrTotal} warn />
      <PreflightCard title={t("shiftClose.preflightCards.kdsTickets")} value={preflight.checks.pendingKitchenTickets} warn />
      <PreflightCard title={t("shiftClose.preflightCards.printQueue")} value={preflight.checks.failedPrintJobs} warn />
      <PreflightCard title={t("shiftClose.preflightCards.pendingConsumption")} value={preflight.checks.pendingConsumption} warn />
      <PreflightCard title={t("shiftClose.preflightCards.accountingHealth")} value={preflight.checks.failedAccountingPostings} warn />
    </div>
  );
}
