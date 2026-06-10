import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, BarChart3, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOutletStore } from "@/stores/outletStore";
import { useAuthStore, PERMISSIONS } from "@/stores/authStore";
import {
  fetchExecutiveSalesReport,
  type ExecutiveSalesReport,
} from "@/lib/api-integration/reportingEndpoints";
import { toast } from "sonner";

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--chart-1))", "hsl(var(--chart-2))"];

function formatRp(value: number): string {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function channelLabel(channel: string): string {
  return channel
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function paymentLabel(method: string): string {
  return method
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function ExecutiveSalesReport() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const hasAccounting = useAuthStore((s) => s.hasPermission(PERMISSIONS.ACCOUNTING));

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ExecutiveSalesReport | null>(null);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [comparison, setComparison] = useState<"none" | "previous_period">("none");

  const scope = useMemo(
    () => (typeof activeOutletId === "number" && activeOutletId >= 1 ? { outletId: activeOutletId } : undefined),
    [activeOutletId],
  );

  const load = useCallback(async () => {
    if (!scope) {
      setReport(null);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchExecutiveSalesReport({
        ...scope,
        startDate: fromDate,
        endDate: toDate,
        comparisonPeriod: comparison === "previous_period" ? "previous_period" : undefined,
      });
      setReport(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load executive sales report");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [scope, fromDate, toDate, comparison]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = report?.summary;
  const recon = summary?.accountingReconciliation;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Executive Sales Report</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Authoritative management view for gross sales, net sales, discounts, refunds, and tender mix.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label htmlFor="fromDate">Start date</Label>
            <Input id="fromDate" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="toDate">End date</Label>
            <Input id="toDate" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Comparison</Label>
            <Select value={comparison} onValueChange={(v) => setComparison(v as "none" | "previous_period")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="previous_period">Previous period</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <KpiCard label="Gross Sales" value={formatRp(summary.grossSales)} />
            <KpiCard label="Net Sales" value={formatRp(summary.netSales)} />
            <KpiCard label="Refunds" value={formatRp(summary.refundAmount)} sub={`${summary.refundCount} refund(s)`} />
            <KpiCard label="Final Revenue" value={formatRp(summary.finalRevenue)} />
            <KpiCard label="Orders" value={`${summary.orderCount}`} />
            <KpiCard label="AOV" value={formatRp(summary.averageOrderValue)} />
          </div>

          {summary.comparison && (
            <Card>
              <CardContent className="p-4 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span>Revenue growth: {summary.comparison.growth.revenueGrowthPercent}%</span>
                </div>
                <span>Order growth: {summary.comparison.growth.orderGrowthPercent}%</span>
                <span>AOV growth: {summary.comparison.growth.averageOrderValueGrowthPercent}%</span>
              </CardContent>
            </Card>
          )}

          {hasAccounting && recon && (
            <Card className={recon.status === "variance" ? "border-amber-500/50" : ""}>
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Accounting reconciliation</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Accounting revenue {formatRp(recon.accountingRevenue)} · Executive revenue {formatRp(recon.executiveRevenue)} · Difference {formatRp(recon.difference)}
                  </p>
                </div>
                {recon.status === "variance" ? (
                  <Badge variant="outline" className="bg-amber-500/15 text-amber-800">
                    <AlertTriangle className="h-3 w-3 mr-1" /> Variance
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700">Balanced</Badge>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <h2 className="text-sm font-semibold mb-3">Sales trend</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={report.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => formatRp(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="grossSales" name="Gross" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="netSales" name="Net" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="refunds" name="Refunds" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h2 className="text-sm font-semibold mb-3">Payment mix</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={report.payments} dataKey="amount" nameKey="method" cx="50%" cy="50%" outerRadius={90} label={(e) => paymentLabel(String(e.method))}>
                      {report.payments.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatRp(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <h2 className="text-sm font-semibold mb-3">Discount breakdown</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={report.discounts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => formatRp(v)} />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-2">Gift card rows are informational tender, not revenue discounts.</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div className="p-4 border-b">
                  <h2 className="text-sm font-semibold">Channel breakdown</h2>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead>Sales</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>AOV</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.channels.map((row) => (
                      <TableRow key={row.channel}>
                        <TableCell>{channelLabel(row.channel)}</TableCell>
                        <TableCell>{formatRp(row.sales)}</TableCell>
                        <TableCell>{row.orders}</TableCell>
                        <TableCell>{formatRp(row.averageOrderValue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b">
                <h2 className="text-sm font-semibold">Top products</h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.topProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No product sales in range.</TableCell>
                    </TableRow>
                  )}
                  {report.topProducts.map((row) => (
                    <TableRow key={`${row.productId}-${row.productName}`}>
                      <TableCell className="font-medium">{row.productName}</TableCell>
                      <TableCell>{row.quantity}</TableCell>
                      <TableCell>{formatRp(row.grossSales)}</TableCell>
                      <TableCell>{formatRp(row.netSales)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <KpiCard label="Gift Card Settled" value={formatRp(summary.giftCardSalesSettled)} />
            <KpiCard label="Store Credit Settled" value={formatRp(summary.storeCreditSettled)} />
            <KpiCard label="Voucher Discounts" value={formatRp(summary.voucherDiscount)} />
            <KpiCard label="Manual Discounts" value={formatRp(summary.manualDiscount)} />
          </div>
        </>
      )}

      {!scope && (
        <p className="text-sm text-muted-foreground">Select an outlet to load the executive sales report.</p>
      )}
    </div>
  );
}
