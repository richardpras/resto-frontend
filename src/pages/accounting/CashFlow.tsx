import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatIDR } from "@/stores/accountingStore";
import { getCashFlowReport, type CashFlowReport } from "@/lib/api-integration/accountingEndpoints";
import { useOutletStore } from "@/stores/outletStore";
import { useAuthStore } from "@/stores/authStore";
import { canViewFinancialStatements, FINANCIAL_STATEMENT_RESTRICTED_MSG } from "@/domain/permissionGates";

function Section({ title, rows, total }: { title: string; rows: [string, number][]; total?: number }) {
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
          <span>Total</span>
          <span className="font-mono">{formatIDR(total)}</span>
        </div>
      )}
    </div>
  );
}

function toRows(section: Record<string, number>): [string, number][] {
  return Object.entries(section)
    .filter(([key]) => key !== "total")
    .map(([key, value]) => [key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()), value]);
}

export default function CashFlow() {
  const user = useAuthStore((s) => s.user);
  const allowed = canViewFinancialStatements(user);
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const today = new Date();
  const [from, setFrom] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [report, setReport] = useState<CashFlowReport | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getCashFlowReport({
        from,
        to,
        ...(typeof activeOutletId === "number" && activeOutletId >= 1 ? { outletId: activeOutletId } : {}),
      });
      setReport(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load cash flow report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!allowed) return;
    void load();
  }, [activeOutletId, allowed]);

  if (!allowed) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">{FINANCIAL_STATEMENT_RESTRICTED_MSG}</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <Label htmlFor="cf-from">From</Label>
          <Input id="cf-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label htmlFor="cf-to">To</Label>
          <Input id="cf-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
        <Button onClick={() => void load()} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>
      {report && (
        <div className="grid md:grid-cols-3 gap-6">
          <Section title="Operating Activities" rows={toRows(report.operating)} total={report.operating.total} />
          <Section title="Investing Activities" rows={toRows(report.investing)} total={report.investing.total} />
          <Section title="Financing Activities" rows={toRows(report.financing)} total={report.financing.total} />
        </div>
      )}
      {report && (
        <div className="rounded-lg bg-muted/40 p-4 flex justify-between items-center">
          <span className="font-semibold">Net Cash Change ({report.from} → {report.to})</span>
          <span className="text-lg font-mono font-bold">{formatIDR(report.netCashChange)}</span>
        </div>
      )}
    </Card>
  );
}
