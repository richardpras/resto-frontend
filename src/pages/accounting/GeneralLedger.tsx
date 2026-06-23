import { useEffect, useState } from "react";
import { useAccountingStore, formatIDR } from "@/stores/accountingStore";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { canViewFinancialStatements } from "@/domain/permissionGates";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";

export default function GeneralLedger() {
  const { t } = useErpTranslation();
  const user = useAuthStore((s) => s.user);
  const allowed = canViewFinancialStatements(user);
  const accounts = useAccountingStore((s) => s.accounts);
  const outlets = useAccountingStore((s) => s.outletOptions);
  const ledger = useAccountingStore((s) => s.ledgerReport);
  const fetchLedgerReport = useAccountingStore((s) => s.fetchLedgerReport);
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
  const [from, setFrom] = useState(monthAgo.toISOString().slice(0, 10));
  const [to, setTo] = useState(today);
  const [outletFilter, setOutletFilter] = useState("all");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");

  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  }, [accountId, accounts]);

  useEffect(() => {
    if (!allowed || !accountId) {
      return;
    }
    const outletId = outletFilter === "all" ? undefined : Number(outletFilter);
    void fetchLedgerReport({ accountId, from, to, outletId })
      .catch((e) => {
        toast.error(formatApiErrorMessage(e, t) || t("accounting.ledger.loadFailed"));
      });
  }, [allowed, accountId, from, to, outletFilter, fetchLedgerReport, t]);

  if (!allowed) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">{t("accounting.financialStatementRestricted")}</p>
      </Card>
    );
  }

  const exportCSV = () => {
    const rows = [
      [
        t("accounting.ledger.date"),
        t("accounting.ledger.reference"),
        t("accounting.ledger.description"),
        t("accounting.ledger.debit"),
        t("accounting.ledger.credit"),
        t("accounting.ledger.balance"),
      ],
    ];
    ledger.rows.forEach((r) => rows.push([r.date, r.reference, r.description, String(r.debit), String(r.credit), String(r.balance)]));
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `ledger-${ledger.account?.code}.csv`; link.click();
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <Label>{t("accounting.ledger.account")}</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>{t("accounting.ledger.from")}</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label>{t("accounting.ledger.to")}</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div>
          <Label>{t("accounting.ledger.outlet")}</Label>
          <Select value={outletFilter} onValueChange={setOutletFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("accounting.ledger.allOutlets")}</SelectItem>
              {outlets.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button variant="outline" onClick={exportCSV} className="w-full"><Download className="h-4 w-4 mr-1" /> {t("accounting.ledger.exportCsv")}</Button>
        </div>
      </div>

      {ledger.account && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3"><div className="text-xs text-muted-foreground">{t("accounting.ledger.openingBalance")}</div><div className="text-lg font-bold font-mono">{formatIDR(ledger.opening)}</div></Card>
          <Card className="p-3"><div className="text-xs text-muted-foreground">{t("accounting.ledger.movements")}</div><div className="text-lg font-bold font-mono">{t("accounting.ledger.entriesCount", { count: ledger.rows.length })}</div></Card>
          <Card className="p-3"><div className="text-xs text-muted-foreground">{t("accounting.ledger.closingBalance")}</div><div className="text-lg font-bold font-mono text-primary">{formatIDR(ledger.closing)}</div></Card>
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("accounting.ledger.date")}</TableHead>
              <TableHead>{t("accounting.ledger.reference")}</TableHead>
              <TableHead>{t("accounting.ledger.description")}</TableHead>
              <TableHead className="text-right">{t("accounting.ledger.debit")}</TableHead>
              <TableHead className="text-right">{t("accounting.ledger.credit")}</TableHead>
              <TableHead className="text-right">{t("accounting.ledger.balance")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledger.rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t("accounting.ledger.noMovements")}</TableCell></TableRow>
            ) : ledger.rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.date}</TableCell>
                <TableCell className="font-mono text-sm">{r.reference || "—"}</TableCell>
                <TableCell>{r.description}</TableCell>
                <TableCell className="text-right font-mono">{r.debit ? formatIDR(r.debit) : "—"}</TableCell>
                <TableCell className="text-right font-mono">{r.credit ? formatIDR(r.credit) : "—"}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatIDR(r.balance)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
