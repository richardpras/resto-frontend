import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatIDR } from "@/stores/accountingStore";
import {
  getApReconciliation,
  getGiftCardReconciliation,
  getPayrollReconciliation,
  getProcurementReconciliation,
  type ApReconciliationReport,
  type GiftCardReconciliationReport,
  type PayrollReconciliationReport,
  type ProcurementReconciliationReport,
} from "@/lib/api-integration/accountingEndpoints";
import { useOutletStore } from "@/stores/outletStore";

export function StatusBadge({ status }: { status?: string }) {
  const tone =
    status === "balanced"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : status === "variance"
        ? "bg-destructive/15 text-destructive"
        : "bg-amber-500/15 text-amber-800 dark:text-amber-200";
  return <Badge variant="outline" className={tone}>{status ?? "unknown"}</Badge>;
}

function MetricRow({ label, value }: { label: string; value: number | string | undefined }) {
  return (
    <div className="flex justify-between text-sm py-1 border-b border-border/30">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{typeof value === "number" ? formatIDR(value) : (value ?? "—")}</span>
    </div>
  );
}

function LiabilitySection({
  title,
  outstanding,
  glBalance,
  variance,
}: {
  title: string;
  outstanding?: number;
  glBalance?: number;
  variance?: number;
}) {
  return (
    <div className="space-y-1 pt-2">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <MetricRow label="Outstanding" value={outstanding} />
      <MetricRow label="GL Balance" value={glBalance} />
      <MetricRow label="Variance" value={variance} />
    </div>
  );
}

function ApCard({ data }: { data: ApReconciliationReport }) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Accounts Payable</h3>
        <StatusBadge status={data.status} />
      </div>
      <MetricRow label="Subledger" value={data.subledger} />
      <MetricRow label="GL Balance" value={data.glBalance} />
      <MetricRow label="Difference" value={data.difference} />
    </Card>
  );
}

function ProcurementCard({ data }: { data: ProcurementReconciliationReport }) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Procurement</h3>
        <StatusBadge status={data.status} />
      </div>
      <MetricRow label="Posted GRN Total" value={data.postedGrnTotal} />
      <MetricRow label="Posted Invoice Total" value={data.postedInvoiceTotal} />
      <MetricRow label="Posted Payment Total" value={data.postedPaymentTotal} />
      <div className="text-xs text-muted-foreground pt-2">GRNI</div>
      <MetricRow label="GRNI GL" value={data.grni.glBalance as number | undefined} />
      <MetricRow label="GRNI Difference" value={data.grni.difference as number | undefined} />
    </Card>
  );
}

export function GiftCardCard({ data }: { data: GiftCardReconciliationReport }) {
  const giftCardOutstanding = data.giftCardLiabilityOutstanding;
  const giftCardGl = data.giftCardLiabilityGLBalance ?? data.giftCardLiabilityBalance;
  const giftCardVariance = data.giftCardLiabilityVariance;
  const storeCreditOutstanding = data.storeCreditLiabilityOutstanding;
  const storeCreditGl = data.storeCreditLiabilityGLBalance ?? data.storeCreditLiabilityBalance;
  const storeCreditVariance = data.storeCreditLiabilityVariance;

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Gift Cards</h3>
        <StatusBadge status={data.status} />
      </div>

      <LiabilitySection
        title="Gift Card Liability (2130)"
        outstanding={giftCardOutstanding}
        glBalance={giftCardGl}
        variance={giftCardVariance}
      />

      <LiabilitySection
        title="Store Credit Liability (2135)"
        outstanding={storeCreditOutstanding}
        glBalance={storeCreditGl}
        variance={storeCreditVariance}
      />

      <div className="space-y-1 pt-2 border-t border-border/40">
        <p className="text-xs font-medium text-muted-foreground">Aggregate</p>
        <MetricRow label="Outstanding" value={data.subledgerOutstanding} />
        <MetricRow label="GL Balance" value={data.glLiabilityBalance} />
        <MetricRow label="Variance" value={data.difference} />
      </div>

      <div className="text-xs text-muted-foreground pt-2 border-t border-border/40">Activity</div>
      <MetricRow label="Redeemed (subledger)" value={data.redeemedAmount} />
      <MetricRow label="Pending settlements" value={data.pendingSettlements} />
      <MetricRow label="Settled settlements" value={data.settledSettlements} />
      {(data.pendingGlIssuances ?? 0) > 0 && (
        <MetricRow label="Pending GL issuances" value={data.pendingGlIssuances} />
      )}
    </Card>
  );
}

function PayrollCard({ data }: { data: PayrollReconciliationReport }) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Payroll</h3>
        <StatusBadge status={data.status as string | undefined} />
      </div>
      <MetricRow label="Subledger" value={data.subledger as number | undefined} />
      <MetricRow label="GL Balance" value={data.glBalance as number | undefined} />
      <MetricRow label="Difference" value={data.difference as number | undefined} />
    </Card>
  );
}

export default function AccountingReconciliation() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const [loading, setLoading] = useState(false);
  const [ap, setAp] = useState<ApReconciliationReport | null>(null);
  const [procurement, setProcurement] = useState<ProcurementReconciliationReport | null>(null);
  const [payroll, setPayroll] = useState<PayrollReconciliationReport | null>(null);
  const [giftCards, setGiftCards] = useState<GiftCardReconciliationReport | null>(null);

  const load = async () => {
    setLoading(true);
    const scope = typeof activeOutletId === "number" && activeOutletId >= 1 ? { outletId: activeOutletId } : undefined;
    try {
      const [apData, procData, payData, giftCardData] = await Promise.all([
        getApReconciliation(scope),
        getProcurementReconciliation(scope),
        getPayrollReconciliation(scope),
        getGiftCardReconciliation(scope),
      ]);
      setAp(apData);
      setProcurement(procData);
      setPayroll(payData);
      setGiftCards(giftCardData);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load reconciliation reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [activeOutletId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Subledger vs GL tie-out for AP, procurement, payroll, and gift cards.</p>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>
      <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {ap && <ApCard data={ap} />}
        {procurement && <ProcurementCard data={procurement} />}
        {payroll && <PayrollCard data={payroll} />}
        {giftCards && <GiftCardCard data={giftCards} />}
      </div>
    </div>
  );
}
