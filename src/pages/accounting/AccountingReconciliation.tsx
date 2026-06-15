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
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";

export function StatusBadge({ status }: { status?: string }) {
  const { t } = useErpTranslation();
  const tone =
    status === "balanced"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : status === "variance"
        ? "bg-destructive/15 text-destructive"
        : "bg-amber-500/15 text-amber-800 dark:text-amber-200";
  return <Badge variant="outline" className={tone}>{status ?? t("accounting.recon.statusUnknown")}</Badge>;
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
  labels,
}: {
  title: string;
  outstanding?: number;
  glBalance?: number;
  variance?: number;
  labels: { outstanding: string; glBalance: string; variance: string };
}) {
  return (
    <div className="space-y-1 pt-2">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <MetricRow label={labels.outstanding} value={outstanding} />
      <MetricRow label={labels.glBalance} value={glBalance} />
      <MetricRow label={labels.variance} value={variance} />
    </div>
  );
}

function ApCard({ data }: { data: ApReconciliationReport }) {
  const { t } = useErpTranslation();
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t("accounting.recon.accountsPayable")}</h3>
        <StatusBadge status={data.status} />
      </div>
      <MetricRow label={t("accounting.recon.subledger")} value={data.subledger} />
      <MetricRow label={t("accounting.recon.glBalance")} value={data.glBalance} />
      <MetricRow label={t("accounting.recon.difference")} value={data.difference} />
    </Card>
  );
}

function ProcurementCard({ data }: { data: ProcurementReconciliationReport }) {
  const { t } = useErpTranslation();
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t("accounting.recon.procurement")}</h3>
        <StatusBadge status={data.status} />
      </div>
      <MetricRow label={t("accounting.recon.postedGrnTotal")} value={data.postedGrnTotal} />
      <MetricRow label={t("accounting.recon.postedInvoiceTotal")} value={data.postedInvoiceTotal} />
      <MetricRow label={t("accounting.recon.postedPaymentTotal")} value={data.postedPaymentTotal} />
      <div className="text-xs text-muted-foreground pt-2">{t("accounting.recon.grni")}</div>
      <MetricRow label={t("accounting.recon.grniGl")} value={data.grni.glBalance as number | undefined} />
      <MetricRow label={t("accounting.recon.grniDifference")} value={data.grni.difference as number | undefined} />
    </Card>
  );
}

export function GiftCardCard({ data }: { data: GiftCardReconciliationReport }) {
  const { t } = useErpTranslation();
  const giftCardOutstanding = data.giftCardLiabilityOutstanding;
  const giftCardGl = data.giftCardLiabilityGLBalance ?? data.giftCardLiabilityBalance;
  const giftCardVariance = data.giftCardLiabilityVariance;
  const storeCreditOutstanding = data.storeCreditLiabilityOutstanding;
  const storeCreditGl = data.storeCreditLiabilityGLBalance ?? data.storeCreditLiabilityBalance;
  const storeCreditVariance = data.storeCreditLiabilityVariance;

  const liabilityLabels = {
    outstanding: t("accounting.recon.outstanding"),
    glBalance: t("accounting.recon.glBalance"),
    variance: t("accounting.recon.variance"),
  };

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t("accounting.recon.giftCards")}</h3>
        <StatusBadge status={data.status} />
      </div>

      <LiabilitySection
        title={t("accounting.recon.giftCardLiability")}
        outstanding={giftCardOutstanding}
        glBalance={giftCardGl}
        variance={giftCardVariance}
        labels={liabilityLabels}
      />

      <LiabilitySection
        title={t("accounting.recon.storeCreditLiability")}
        outstanding={storeCreditOutstanding}
        glBalance={storeCreditGl}
        variance={storeCreditVariance}
        labels={liabilityLabels}
      />

      <div className="space-y-1 pt-2 border-t border-border/40">
        <p className="text-xs font-medium text-muted-foreground">{t("accounting.recon.aggregate")}</p>
        <MetricRow label={t("accounting.recon.outstanding")} value={data.subledgerOutstanding} />
        <MetricRow label={t("accounting.recon.glBalance")} value={data.glLiabilityBalance} />
        <MetricRow label={t("accounting.recon.variance")} value={data.difference} />
      </div>

      <div className="text-xs text-muted-foreground pt-2 border-t border-border/40">{t("accounting.recon.activity")}</div>
      <MetricRow label={t("accounting.recon.redeemedSubledger")} value={data.redeemedAmount} />
      <MetricRow label={t("accounting.recon.pendingSettlements")} value={data.pendingSettlements} />
      <MetricRow label={t("accounting.recon.settledSettlements")} value={data.settledSettlements} />
      {(data.pendingGlIssuances ?? 0) > 0 && (
        <MetricRow label={t("accounting.recon.pendingGlIssuances")} value={data.pendingGlIssuances} />
      )}
    </Card>
  );
}

function PayrollCard({ data }: { data: PayrollReconciliationReport }) {
  const { t } = useErpTranslation();
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t("accounting.recon.payroll")}</h3>
        <StatusBadge status={data.status as string | undefined} />
      </div>
      <MetricRow label={t("accounting.recon.subledger")} value={data.subledger as number | undefined} />
      <MetricRow label={t("accounting.recon.glBalance")} value={data.glBalance as number | undefined} />
      <MetricRow label={t("accounting.recon.difference")} value={data.difference as number | undefined} />
    </Card>
  );
}

export default function AccountingReconciliation() {
  const { t } = useErpTranslation();
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
      toast.error(formatApiErrorMessage(e, t) || t("accounting.recon.loadFailed"));
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
        <p className="text-sm text-muted-foreground">{t("accounting.recon.subtitle")}</p>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? t("common:common.loading") : t("common:common.refresh")}
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
