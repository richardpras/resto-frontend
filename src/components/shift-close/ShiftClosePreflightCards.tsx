import type { ShiftClosePreflight } from "@/lib/api-integration/shiftCloseEndpoints";
import { Card } from "@/components/ui/card";

function PreflightCard({ title, value, warn }: { title: string; value: number; warn?: boolean }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className={`text-2xl font-semibold tabular-nums ${warn && value > 0 ? "text-amber-600" : ""}`}>{value}</p>
    </Card>
  );
}

export function ShiftClosePreflightCards({ preflight }: { preflight: ShiftClosePreflight }) {
  const qr = preflight.qrOrders;
  const qrTotal = qr ? qr.pending + qr.underReview + qr.linkedUnpaidBills : preflight.checks.pendingQrOrders;

  return (
    <div className="grid grid-cols-2 gap-3">
      <PreflightCard title="Open POS Sessions" value={preflight.openPosSessions?.count ?? preflight.checks.openPosSession ?? 0} warn />
      <PreflightCard title="Open Bills" value={preflight.checks.openBills} warn />
      <PreflightCard title="QR Orders" value={qrTotal} warn />
      <PreflightCard title="KDS Tickets" value={preflight.checks.pendingKitchenTickets} warn />
      <PreflightCard title="Print Queue" value={preflight.checks.failedPrintJobs} warn />
      <PreflightCard title="Pending Consumption" value={preflight.checks.pendingConsumption} warn />
      <PreflightCard title="Accounting Health" value={preflight.checks.failedAccountingPostings} warn />
    </div>
  );
}
