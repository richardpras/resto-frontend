import { useEffect, useState } from "react";
import { useAccountingStore, formatIDR } from "@/stores/accountingStore";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { canViewFinancialStatements } from "@/domain/permissionGates";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";

export default function BalanceSheet() {
  const { t } = useErpTranslation();
  const user = useAuthStore((s) => s.user);
  const allowed = canViewFinancialStatements(user);
  const outlets = useAccountingStore((s) => s.outletOptions);
  const bs = useAccountingStore((s) => s.balanceSheetReport);
  const fetchBalanceSheetReport = useAccountingStore((s) => s.fetchBalanceSheetReport);
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [outletFilter, setOutletFilter] = useState("all");

  useEffect(() => {
    if (!allowed) return;
    const outletId = outletFilter === "all" ? undefined : Number(outletFilter);
    void fetchBalanceSheetReport({ to: asOf, outletId })
      .catch((e) => {
        toast.error(formatApiErrorMessage(e, t) || t("accounting.reports.loadBalanceSheetFailed"));
      });
  }, [allowed, asOf, outletFilter, fetchBalanceSheetReport, t]);

  if (!allowed) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">{t("accounting.financialStatementRestricted")}</p>
      </Card>
    );
  }

  const Section = ({ title, items, total }: { title: string; items: { account: { id: string; name: string }; amount: number }[]; total?: boolean }) => (
    <div>
      <div className="text-xs uppercase text-muted-foreground tracking-wider mt-3 mb-1">{title}</div>
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground pl-6 py-1">{t("accounting.reports.noAccounts")}</div>
      ) : items.map((i) => (
        <div key={i.account.id} className="flex justify-between text-sm py-1 pl-6">
          <span>{i.account.name}</span>
          <span className="font-mono">{formatIDR(i.amount)}</span>
        </div>
      ))}
    </div>
  );

  const totalCurrentAssets = bs.currentAssets.reduce((s, x) => s + x.amount, 0);
  const totalFixedAssets = bs.fixedAssets.reduce((s, x) => s + x.amount, 0);
  const totalShort = bs.shortLiab.reduce((s, x) => s + x.amount, 0);
  const totalLong = bs.longLiab.reduce((s, x) => s + x.amount, 0);

  return (
    <Card className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div><Label>{t("accounting.reports.asOfDate")}</Label><Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} /></div>
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
          <Badge variant={bs.balanced ? "default" : "destructive"} className="w-full justify-center py-2">
            {bs.balanced ? t("accounting.reports.balancedCheck") : t("accounting.reports.outOfBalance")}
          </Badge>
        </div>
        <div className="flex items-end">
          <Button variant="outline" className="w-full" onClick={() => window.print()}><Download className="h-4 w-4 mr-1" /> {t("accounting.reports.export")}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-2">{t("accounting.reports.assets")}</h3>
          <Section title={t("accounting.reports.currentAssets")} items={bs.currentAssets} />
          <div className="flex justify-between font-semibold border-t mt-1 pt-1 text-sm">
            <span>{t("accounting.reports.totalCurrentAssets")}</span><span className="font-mono">{formatIDR(totalCurrentAssets)}</span>
          </div>
          <Section title={t("accounting.reports.fixedAssets")} items={bs.fixedAssets} />
          <div className="flex justify-between font-semibold border-t mt-1 pt-1 text-sm">
            <span>{t("accounting.reports.totalFixedAssets")}</span><span className="font-mono">{formatIDR(totalFixedAssets)}</span>
          </div>
          <div className="flex justify-between font-bold border-t-2 mt-3 pt-2 text-base bg-primary/5 p-2 rounded">
            <span>{t("accounting.reports.totalAssets")}</span><span className="font-mono">{formatIDR(bs.totalAssets)}</span>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold mb-2">{t("accounting.reports.liabilitiesEquity")}</h3>
          <Section title={t("accounting.reports.shortTermLiabilities")} items={bs.shortLiab} />
          <div className="flex justify-between font-semibold border-t mt-1 pt-1 text-sm">
            <span>{t("accounting.reports.totalShortTerm")}</span><span className="font-mono">{formatIDR(totalShort)}</span>
          </div>
          <Section title={t("accounting.reports.longTermLiabilities")} items={bs.longLiab} />
          <div className="flex justify-between font-semibold border-t mt-1 pt-1 text-sm">
            <span>{t("accounting.reports.totalLongTerm")}</span><span className="font-mono">{formatIDR(totalLong)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t mt-1 pt-1 text-sm">
            <span>{t("accounting.reports.totalLiabilities")}</span><span className="font-mono">{formatIDR(bs.totalLiabilities)}</span>
          </div>

          <Section title={t("accounting.reports.equity")} items={bs.equity} />
          <div className="flex justify-between text-sm py-1 pl-6">
            <span>{t("accounting.reports.currentPeriodNetProfit")}</span>
            <span className="font-mono">{formatIDR(bs.netProfit)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t mt-1 pt-1 text-sm">
            <span>{t("accounting.reports.totalEquity")}</span><span className="font-mono">{formatIDR(bs.totalEquity)}</span>
          </div>

          <div className="flex justify-between font-bold border-t-2 mt-3 pt-2 text-base bg-primary/5 p-2 rounded">
            <span>{t("accounting.reports.totalLiabEquity")}</span><span className="font-mono">{formatIDR(bs.totalLiabilities + bs.totalEquity)}</span>
          </div>
        </Card>
      </div>
    </Card>
  );
}
