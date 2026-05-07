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

export default function BalanceSheet() {
  const outlets = useAccountingStore((s) => s.outlets);
  const bs = useAccountingStore((s) => s.balanceSheetReport);
  const fetchBalanceSheetReport = useAccountingStore((s) => s.fetchBalanceSheetReport);
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [outlet, setOutlet] = useState("all");

  useEffect(() => {
    void fetchBalanceSheetReport({ to: asOf, outlet })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Failed to load balance sheet report");
      });
  }, [asOf, outlet, fetchBalanceSheetReport]);

  const Section = ({ title, items, total }: { title: string; items: { account: { id: string; name: string }; amount: number }[]; total?: boolean }) => (
    <div>
      <div className="text-xs uppercase text-muted-foreground tracking-wider mt-3 mb-1">{title}</div>
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground pl-6 py-1">No accounts</div>
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
        <div><Label>As of Date</Label><Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} /></div>
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
          <Badge variant={bs.balanced ? "default" : "destructive"} className="w-full justify-center py-2">
            {bs.balanced ? "✓ Balanced" : "✗ Out of Balance"}
          </Badge>
        </div>
        <div className="flex items-end">
          <Button variant="outline" className="w-full" onClick={() => window.print()}><Download className="h-4 w-4 mr-1" /> Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-2">Assets</h3>
          <Section title="Current Assets" items={bs.currentAssets} />
          <div className="flex justify-between font-semibold border-t mt-1 pt-1 text-sm">
            <span>Total Current Assets</span><span className="font-mono">{formatIDR(totalCurrentAssets)}</span>
          </div>
          <Section title="Fixed Assets" items={bs.fixedAssets} />
          <div className="flex justify-between font-semibold border-t mt-1 pt-1 text-sm">
            <span>Total Fixed Assets</span><span className="font-mono">{formatIDR(totalFixedAssets)}</span>
          </div>
          <div className="flex justify-between font-bold border-t-2 mt-3 pt-2 text-base bg-primary/5 p-2 rounded">
            <span>TOTAL ASSETS</span><span className="font-mono">{formatIDR(bs.totalAssets)}</span>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold mb-2">Liabilities & Equity</h3>
          <Section title="Short-term Liabilities" items={bs.shortLiab} />
          <div className="flex justify-between font-semibold border-t mt-1 pt-1 text-sm">
            <span>Total Short-term</span><span className="font-mono">{formatIDR(totalShort)}</span>
          </div>
          <Section title="Long-term Liabilities" items={bs.longLiab} />
          <div className="flex justify-between font-semibold border-t mt-1 pt-1 text-sm">
            <span>Total Long-term</span><span className="font-mono">{formatIDR(totalLong)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t mt-1 pt-1 text-sm">
            <span>Total Liabilities</span><span className="font-mono">{formatIDR(bs.totalLiabilities)}</span>
          </div>

          <Section title="Equity" items={bs.equity} />
          <div className="flex justify-between text-sm py-1 pl-6">
            <span>Current Period Net Profit</span>
            <span className="font-mono">{formatIDR(bs.netProfit)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t mt-1 pt-1 text-sm">
            <span>Total Equity</span><span className="font-mono">{formatIDR(bs.totalEquity)}</span>
          </div>

          <div className="flex justify-between font-bold border-t-2 mt-3 pt-2 text-base bg-primary/5 p-2 rounded">
            <span>TOTAL LIAB. & EQUITY</span><span className="font-mono">{formatIDR(bs.totalLiabilities + bs.totalEquity)}</span>
          </div>
        </Card>
      </div>
    </Card>
  );
}
