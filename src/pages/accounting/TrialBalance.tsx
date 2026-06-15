import { useEffect, useState } from "react";
import { useAccountingStore, formatIDR, computeTrialBalanceTotals } from "@/stores/accountingStore";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { canViewFinancialStatements } from "@/domain/permissionGates";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";

export default function TrialBalance() {
  const { t } = useErpTranslation();
  const user = useAuthStore((s) => s.user);
  const allowed = canViewFinancialStatements(user);
  const outlets = useAccountingStore((s) => s.outlets);
  const trialBalanceRows = useAccountingStore((s) => s.trialBalanceRows);
  const trialBalanceSummary = useAccountingStore((s) => s.trialBalanceSummary);
  const fetchTrialBalanceReport = useAccountingStore((s) => s.fetchTrialBalanceReport);
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [outlet, setOutlet] = useState("all");

  useEffect(() => {
    if (!allowed) return;
    void fetchTrialBalanceReport({ from, to, outlet })
      .catch((e) => {
        toast.error(formatApiErrorMessage(e, t) || t("accounting.reports.loadTrialBalanceFailed"));
      });
  }, [allowed, from, to, outlet, fetchTrialBalanceReport, t]);

  if (!allowed) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">{t("accounting.financialStatementRestricted")}</p>
      </Card>
    );
  }

  const totals = computeTrialBalanceTotals(trialBalanceRows);
  const displaySummary = trialBalanceSummary ?? {
    totalDebit: totals.totalDebit,
    totalCredit: totals.totalCredit,
    balanced: totals.balanced,
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div><Label>{t("accounting.reports.from")}</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label>{t("accounting.reports.to")}</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div>
          <Label>{t("accounting.reports.outlet")}</Label>
          <Select value={outlet} onValueChange={setOutlet}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("accounting.reports.allOutlets")}</SelectItem>
              {outlets.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Badge variant={displaySummary.balanced ? "default" : "destructive"} className="w-full justify-center py-2">
            {displaySummary.balanced ? t("accounting.journal.balanced") : t("accounting.journal.unbalanced")}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">{t("accounting.reports.totalDebit")}</div>
          <div className="text-lg font-bold font-mono">{formatIDR(displaySummary.totalDebit)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">{t("accounting.reports.totalCredit")}</div>
          <div className="text-lg font-bold font-mono">{formatIDR(displaySummary.totalCredit)}</div>
        </Card>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("accounting.reports.code")}</TableHead>
              <TableHead>{t("accounting.reports.account")}</TableHead>
              <TableHead className="text-right">{t("accounting.journal.debit")}</TableHead>
              <TableHead className="text-right">{t("accounting.journal.credit")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trialBalanceRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">{t("accounting.reports.noTrialBalanceRows")}</TableCell>
              </TableRow>
            ) : (
              trialBalanceRows.map((row) => (
                <TableRow key={row.accountId}>
                  <TableCell className="font-mono">{row.code}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="text-right font-mono">{row.debit ? formatIDR(row.debit) : "—"}</TableCell>
                  <TableCell className="text-right font-mono">{row.credit ? formatIDR(row.credit) : "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
