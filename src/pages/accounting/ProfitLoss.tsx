import { useEffect, useState } from "react";
import { useAccountingStore, formatIDR } from "@/stores/accountingStore";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

export default function ProfitLoss() {
  const outlets = useAccountingStore((s) => s.outlets);
  const current = useAccountingStore((s) => s.profitLossCurrent);
  const previous = useAccountingStore((s) => s.profitLossPrevious);
  const fetchProfitLossReport = useAccountingStore((s) => s.fetchProfitLossReport);
  const today = new Date();
  const startMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const endMonth = today.toISOString().slice(0, 10);
  const startPrev = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0, 10);
  const endPrev = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().slice(0, 10);

  const [from, setFrom] = useState(startMonth);
  const [to, setTo] = useState(endMonth);
  const [outlet, setOutlet] = useState("all");
  const [compare, setCompare] = useState(true);
  useEffect(() => {
    void fetchProfitLossReport({ from, to, outlet, compareFrom: startPrev, compareTo: endPrev })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Failed to load P&L report");
      });
  }, [from, to, outlet, startPrev, endPrev, fetchProfitLossReport]);

  const pct = (curr: number, prev: number) => {
    if (prev === 0) return curr === 0 ? 0 : 100;
    return ((curr - prev) / Math.abs(prev)) * 100;
  };

  const Row = ({ label, value, prev, bold, indent }: { label: string; value: number; prev?: number; bold?: boolean; indent?: boolean }) => {
    const change = prev !== undefined ? pct(value, prev) : null;
    return (
      <div className={`flex items-center justify-between py-2 ${bold ? "font-semibold border-t" : ""} ${indent ? "pl-6" : ""}`}>
        <div className="text-sm">{label}</div>
        <div className="flex items-center gap-4">
          {compare && prev !== undefined && (
            <div className="text-xs text-muted-foreground font-mono w-32 text-right">{formatIDR(prev)}</div>
          )}
          <div className={`font-mono ${bold ? "text-base" : "text-sm"} w-40 text-right`}>{formatIDR(value)}</div>
          {compare && change !== null && (
            <div className={`text-xs flex items-center gap-1 w-20 ${change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {change.toFixed(1)}%
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
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
          <Button variant={compare ? "default" : "outline"} onClick={() => setCompare(!compare)} className="w-full">
            {compare ? "Hide" : "Show"} Comparison
          </Button>
        </div>
        <div className="flex items-end">
          <Button variant="outline" className="w-full" onClick={() => window.print()}><Download className="h-4 w-4 mr-1" /> Export</Button>
        </div>
      </div>

      <Card className="p-6 space-y-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Profit & Loss Statement</h3>
          <div className="text-xs text-muted-foreground">{from} → {to}</div>
        </div>

        {compare && (
          <div className="flex items-center justify-end gap-4 text-xs text-muted-foreground border-b pb-2">
            <div className="w-32 text-right">Previous</div>
            <div className="w-40 text-right">Current</div>
            <div className="w-20">Change</div>
          </div>
        )}

        <div className="text-xs uppercase text-muted-foreground tracking-wider mt-3">Revenue</div>
        {current.revenue.map((r) => {
          const p = previous.revenue.find((x) => x.account.id === r.account.id);
          return <Row key={r.account.id} label={r.account.name} value={r.amount} prev={p?.amount ?? 0} indent />;
        })}
        <Row label="Total Revenue" value={current.totalRevenue} prev={previous.totalRevenue} bold />

        <div className="text-xs uppercase text-muted-foreground tracking-wider mt-3">Cost of Goods Sold</div>
        {current.cogs.map((r) => {
          const p = previous.cogs.find((x) => x.account.id === r.account.id);
          return <Row key={r.account.id} label={r.account.name} value={r.amount} prev={p?.amount ?? 0} indent />;
        })}
        <Row label="Total COGS" value={current.totalCOGS} prev={previous.totalCOGS} bold />

        <Row label="Gross Profit" value={current.grossProfit} prev={previous.grossProfit} bold />

        <div className="text-xs uppercase text-muted-foreground tracking-wider mt-3">Operating Expenses</div>
        {current.expenses.map((r) => {
          const p = previous.expenses.find((x) => x.account.id === r.account.id);
          return <Row key={r.account.id} label={r.account.name} value={r.amount} prev={p?.amount ?? 0} indent />;
        })}
        <Row label="Total Expenses" value={current.totalExpenses} prev={previous.totalExpenses} bold />

        <div className={`mt-4 p-4 rounded-lg ${current.netProfit >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
          <Row label="NET PROFIT" value={current.netProfit} prev={previous.netProfit} bold />
        </div>
      </Card>
    </Card>
  );
}
