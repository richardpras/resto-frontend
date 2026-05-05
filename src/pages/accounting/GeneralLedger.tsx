import { useEffect, useState } from "react";
import { getLedgerReport, type LedgerReportData } from "@/lib/api";
import { useAccountingStore, formatIDR } from "@/stores/accountingStore";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

export default function GeneralLedger() {
  const { accounts, outlets } = useAccountingStore();
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
  const [from, setFrom] = useState(monthAgo.toISOString().slice(0, 10));
  const [to, setTo] = useState(today);
  const [outlet, setOutlet] = useState("all");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [ledger, setLedger] = useState<LedgerReportData>({ account: null, rows: [], opening: 0, closing: 0 });

  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  }, [accountId, accounts]);

  useEffect(() => {
    if (!accountId) {
      setLedger({ account: null, rows: [], opening: 0, closing: 0 });
      return;
    }
    let active = true;
    void getLedgerReport({ accountId, from, to, outlet })
      .then((res) => {
        if (active) setLedger(res);
      })
      .catch((e) => {
        if (active) toast.error(e instanceof Error ? e.message : "Failed to load ledger report");
      });
    return () => {
      active = false;
    };
  }, [accountId, from, to, outlet]);

  const exportCSV = () => {
    const rows = [["Date", "Reference", "Description", "Debit", "Credit", "Balance"]];
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
          <Label>Account</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div>
          <Label>Outlet</Label>
          <Select value={outlet} onValueChange={setOutlet}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outlets</SelectItem>
              {outlets.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button variant="outline" onClick={exportCSV} className="w-full"><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
        </div>
      </div>

      {ledger.account && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3"><div className="text-xs text-muted-foreground">Opening Balance</div><div className="text-lg font-bold font-mono">{formatIDR(ledger.opening)}</div></Card>
          <Card className="p-3"><div className="text-xs text-muted-foreground">Movements</div><div className="text-lg font-bold font-mono">{ledger.rows.length} entries</div></Card>
          <Card className="p-3"><div className="text-xs text-muted-foreground">Closing Balance</div><div className="text-lg font-bold font-mono text-primary">{formatIDR(ledger.closing)}</div></Card>
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledger.rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No movements in this period</TableCell></TableRow>
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
