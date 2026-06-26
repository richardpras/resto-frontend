import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { formatIDR, useAccountingStore } from "@/stores/accountingStore";
import { getCashFlowReport, type CashFlowReport } from "@/lib/api-integration/accountingEndpoints";
import { useAuthStore } from "@/stores/authStore";
import { canViewFinancialStatements } from "@/domain/permissionGates";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import type { TFunction } from "i18next";

function Section({ title, rows, total, totalLabel }: { title: string; rows: [string, number][]; total?: number; totalLabel: string }) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold">{title}</h3>
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between text-sm py-1 border-b border-border/40">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-mono">{formatIDR(value)}</span>
        </div>
      ))}
      {total !== undefined && (
        <div className="flex justify-between text-sm font-semibold pt-2">
          <span>{totalLabel}</span>
          <span className="font-mono">{formatIDR(total)}</span>
        </div>
      )}
    </div>
  );
}

function cashFlowLineLabel(key: string, t: TFunction): string {
  return t(`accounting.reports.cashFlowLines.${key}`);
}

function toRows(section: Record<string, number>, t: TFunction): [string, number][] {
  return Object.entries(section)
    .filter(([key]) => key !== "total")
    .map(([key, value]) => [cashFlowLineLabel(key, t), value]);
}

export default function CashFlow() {
  const { t } = useErpTranslation();
  const user = useAuthStore((s) => s.user);
  const allowed = canViewFinancialStatements(user);
  const outlets = useAccountingStore((s) => s.outletOptions);
  const today = new Date();
  const [from, setFrom] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [outletFilter, setOutletFilter] = useState("all");
  const [report, setReport] = useState<CashFlowReport | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const outletId = outletFilter === "all" ? undefined : Number(outletFilter);
      const data = await getCashFlowReport({
        from,
        to,
        ...(typeof outletId === "number" && outletId >= 1 ? { outletId } : {}),
      });
      setReport(data);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("accounting.reports.loadCashFlowFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!allowed) return;
    void load();
  }, [outletFilter, allowed]);

  if (!allowed) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">{t("accounting.financialStatementRestricted")}</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <Label htmlFor="cf-from">{t("accounting.reports.from")}</Label>
          <Input id="cf-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="cf-to">{t("accounting.reports.to")}</Label>
          <Input id="cf-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <Label>{t("accounting.reports.outlet")}</Label>
          <Select value={outletFilter} onValueChange={setOutletFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("accounting.reports.allOutlets")}</SelectItem>
              {outlets.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={() => void load()} disabled={loading} className="w-full">
            {loading ? t("common:common.loading") : t("common:common.refresh")}
          </Button>
        </div>
        <div className="flex items-end">
          <Button variant="outline" className="w-full" onClick={() => window.print()}>
            <Download className="h-4 w-4 mr-1" /> {t("accounting.reports.export")}
          </Button>
        </div>
      </div>

      {!loading && !report && (
        <p className="text-sm text-muted-foreground text-center py-8">{t("accounting.reports.cashFlowEmpty")}</p>
      )}

      {report && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{t("accounting.reports.cashFlowStatement")}</h2>
            <div className="text-xs text-muted-foreground">{from} → {to}</div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Section title={t("accounting.reports.operatingActivities")} rows={toRows(report.operating, t)} total={report.operating.total} totalLabel={t("accounting.reports.total")} />
            <Section title={t("accounting.reports.investingActivities")} rows={toRows(report.investing, t)} total={report.investing.total} totalLabel={t("accounting.reports.total")} />
            <Section title={t("accounting.reports.financingActivities")} rows={toRows(report.financing, t)} total={report.financing.total} totalLabel={t("accounting.reports.total")} />
          </div>
          <div className="rounded-lg bg-muted/40 p-4 flex justify-between items-center">
            <span className="font-semibold">{t("accounting.reports.netCashChange", { from: report.from, to: report.to })}</span>
            <span className="text-lg font-mono font-bold">{formatIDR(report.netCashChange)}</span>
          </div>
        </>
      )}
    </Card>
  );
}
