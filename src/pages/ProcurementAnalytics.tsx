import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Users, Wallet, FileCheck, LineChart } from "lucide-react";
import {
  getProcurementAnalyticsSummary,
  getProcurementAnalyticsSuppliers,
  getProcurementAnalyticsSpend,
  getProcurementAnalyticsPayables,
  getProcurementAnalyticsTrends,
  getProcurementAnalyticsPosting,
  type ProcurementAnalyticsSummary,
  type SupplierPerformanceRow,
  type ProcurementSpendAnalysis,
  type ProcurementPayablesAnalytics,
  type ProcurementTrendAnalysis,
  type ProcurementPostingAnalytics,
} from "@/lib/api-integration/purchaseEndpoints";
import { useOutletStore } from "@/stores/outletStore";
import { useSupplierStore } from "@/stores/supplierStore";

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
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

export default function ProcurementAnalytics() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const { suppliers, fetchSuppliers } = useSupplierStore();

  const [tab, setTab] = useState("kpi");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ProcurementAnalyticsSummary | null>(null);
  const [supplierRows, setSupplierRows] = useState<SupplierPerformanceRow[]>([]);
  const [spend, setSpend] = useState<ProcurementSpendAnalysis | null>(null);
  const [payables, setPayables] = useState<ProcurementPayablesAnalytics | null>(null);
  const [trends, setTrends] = useState<ProcurementTrendAnalysis | null>(null);
  const [posting, setPosting] = useState<ProcurementPostingAnalytics | null>(null);

  const [supplierFilter, setSupplierFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const scope = useMemo(
    () => (typeof activeOutletId === "number" && activeOutletId >= 1 ? { outletId: activeOutletId } : undefined),
    [activeOutletId],
  );

  const loadAll = useCallback(async () => {
    if (!scope) {
      setSummary(null);
      setSupplierRows([]);
      setSpend(null);
      setPayables(null);
      setTrends(null);
      setPosting(null);
      return;
    }
    setLoading(true);
    try {
      const spendParams = {
        ...scope,
        ...(supplierFilter ? { supplierId: Number(supplierFilter) } : {}),
        ...(fromDate ? { fromDate } : {}),
        ...(toDate ? { toDate } : {}),
      };
      const [sum, sup, sp, pay, tr, post] = await Promise.all([
        getProcurementAnalyticsSummary(scope),
        getProcurementAnalyticsSuppliers(scope),
        getProcurementAnalyticsSpend(spendParams),
        getProcurementAnalyticsPayables(scope),
        getProcurementAnalyticsTrends(scope),
        getProcurementAnalyticsPosting(scope),
      ]);
      setSummary(sum);
      setSupplierRows(sup);
      setSpend(sp);
      setPayables(pay);
      setTrends(tr);
      setPosting(post);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [scope, supplierFilter, fromDate, toDate]);

  useEffect(() => {
    void fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const fmt = (n: number) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const pct = (n: number) => `${Number(n).toFixed(1)}%`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Procurement Analytics</h2>
        {loading && <span className="text-xs text-muted-foreground">Loading…</span>}
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Total Spend" value={fmt(summary.totalSpend)} />
          <KpiCard label="Outstanding AP" value={fmt(summary.outstandingPayables)} />
          <KpiCard label="Overdue AP" value={fmt(summary.overduePayables)} />
          <KpiCard label="Match Rate" value={pct(summary.matchRate)} />
          <KpiCard label="Posting Rate" value={pct(summary.postingRate)} />
          <KpiCard label="Avg PO Cycle" value={`${summary.averagePoCycleDays} days`} />
          <KpiCard label="Avg Supplier Lead Time" value={`${summary.averageSupplierLeadTime ?? 0} days`} />
          <KpiCard
            label="Top Supplier"
            value={summary.topSupplier?.supplierName ?? "—"}
            sub={summary.topSupplier ? fmt(summary.topSupplier.purchaseAmount) : undefined}
          />
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="kpi" className="gap-1"><BarChart3 className="h-3.5 w-3.5" /> KPI</TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-1"><Users className="h-3.5 w-3.5" /> Suppliers</TabsTrigger>
          <TabsTrigger value="spend" className="gap-1"><TrendingUp className="h-3.5 w-3.5" /> Spend</TabsTrigger>
          <TabsTrigger value="payables" className="gap-1"><Wallet className="h-3.5 w-3.5" /> AP</TabsTrigger>
          <TabsTrigger value="posting" className="gap-1"><FileCheck className="h-3.5 w-3.5" /> Posting</TabsTrigger>
          <TabsTrigger value="trends" className="gap-1"><LineChart className="h-3.5 w-3.5" /> Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="kpi" className="space-y-4">
          {summary && (
            <Card>
              <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><span className="text-muted-foreground">Purchase Orders</span><p className="font-semibold">{summary.totalPurchaseOrders}</p></div>
                <div><span className="text-muted-foreground">Receipts</span><p className="font-semibold">{summary.totalReceipts}</p></div>
                <div><span className="text-muted-foreground">Invoices</span><p className="font-semibold">{summary.totalInvoices}</p></div>
                <div><span className="text-muted-foreground">Payments</span><p className="font-semibold">{summary.totalPayments}</p></div>
                <div><span className="text-muted-foreground">Avg Invoice Cycle</span><p className="font-semibold">{summary.averageInvoiceCycleDays} days</p></div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="suppliers">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Supplier</TableHead>
                    <TableHead>Spend</TableHead>
                    <TableHead>PO Count</TableHead>
                    <TableHead>Avg Lead Time</TableHead>
                    <TableHead>On-Time %</TableHead>
                    <TableHead>Invoice Accuracy</TableHead>
                    <TableHead>Match Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierRows.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No supplier data.</TableCell></TableRow>
                  )}
                  {supplierRows.map((row) => (
                    <TableRow key={row.supplierId}>
                      <TableCell className="font-medium">{row.supplierName}</TableCell>
                      <TableCell>{fmt(row.purchaseAmount)}</TableCell>
                      <TableCell>{row.purchaseCount}</TableCell>
                      <TableCell>{row.averageLeadTime} days</TableCell>
                      <TableCell>{pct(row.onTimeDeliveryRate)}</TableCell>
                      <TableCell>{pct(row.invoiceAccuracyRate)}</TableCell>
                      <TableCell>{pct(row.matchRate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="spend" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select value={supplierFilter || "all"} onValueChange={(v) => setSupplierFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All suppliers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All suppliers</SelectItem>
                {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-0">
                <p className="p-3 text-sm font-medium border-b">Monthly Spend</p>
                <Table>
                  <TableBody>
                    {(spend?.monthlySpend ?? []).map((row) => (
                      <TableRow key={row.month}><TableCell>{row.month}</TableCell><TableCell className="text-right">{fmt(row.amount)}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-0">
                <p className="p-3 text-sm font-medium border-b">By Supplier</p>
                <Table>
                  <TableBody>
                    {(spend?.supplierSpend ?? []).slice(0, 10).map((row) => (
                      <TableRow key={row.id}><TableCell>{row.name}</TableCell><TableCell className="text-right">{fmt(row.amount)}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payables">
          {payables && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <KpiCard label="Current" value={fmt(payables.current)} />
              <KpiCard label="1–30 Days" value={fmt(payables.days1to30)} />
              <KpiCard label="31–60 Days" value={fmt(payables.days31to60)} />
              <KpiCard label="61–90 Days" value={fmt(payables.days61to90)} />
              <KpiCard label="90+ Days" value={fmt(payables.days90plus)} />
              <KpiCard label="Total Outstanding" value={fmt(payables.totalOutstanding)} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="posting">
          {posting && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Posted GRNs" value={posting.postedGrnCount} />
              <KpiCard label="Unposted GRNs" value={posting.unpostedGrnCount} />
              <KpiCard label="Posted Invoices" value={posting.postedInvoiceCount} />
              <KpiCard label="Unposted Invoices" value={posting.unpostedInvoiceCount} />
              <KpiCard label="Posted Payments" value={posting.postedPaymentCount} />
              <KpiCard label="Unposted Payments" value={posting.unpostedPaymentCount} />
              <KpiCard label="Posting Rate" value={pct(posting.postingRate)} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Month</TableHead>
                    <TableHead>POs</TableHead>
                    <TableHead>Receipts</TableHead>
                    <TableHead>Invoices</TableHead>
                    <TableHead>Payments</TableHead>
                    <TableHead>Spend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(trends?.months ?? []).map((month, i) => (
                    <TableRow key={month}>
                      <TableCell>{month}</TableCell>
                      <TableCell>{trends?.purchaseOrders[i] ?? 0}</TableCell>
                      <TableCell>{trends?.receipts[i] ?? 0}</TableCell>
                      <TableCell>{trends?.invoices[i] ?? 0}</TableCell>
                      <TableCell>{trends?.payments[i] ?? 0}</TableCell>
                      <TableCell>{fmt(trends?.spend[i] ?? 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
