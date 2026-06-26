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
import { useErpTranslation } from "@/i18n/useErpTranslation";

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
  const { t } = useErpTranslation();
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
        <h2 className="text-lg font-semibold">{t("purchases.analytics.title")}</h2>
        {loading && <span className="text-xs text-muted-foreground">{t("purchases.analytics.loading")}</span>}
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <KpiCard label={t("purchases.analytics.kpi.totalSpend")} value={fmt(summary.totalSpend)} />
          <KpiCard label={t("purchases.analytics.kpi.outstandingAp")} value={fmt(summary.outstandingPayables)} />
          <KpiCard label={t("purchases.analytics.kpi.overdueAp")} value={fmt(summary.overduePayables)} />
          <KpiCard label={t("purchases.analytics.kpi.matchRate")} value={pct(summary.matchRate)} />
          <KpiCard label={t("purchases.analytics.kpi.postingRate")} value={pct(summary.postingRate)} />
          <KpiCard label={t("purchases.analytics.kpi.avgPoCycle")} value={t("purchases.analytics.kpi.days", { count: summary.averagePoCycleDays })} />
          <KpiCard label={t("purchases.analytics.kpi.avgSupplierLeadTime")} value={t("purchases.analytics.kpi.days", { count: summary.averageSupplierLeadTime ?? 0 })} />
          <KpiCard
            label={t("purchases.analytics.kpi.topSupplier")}
            value={summary.topSupplier?.supplierName ?? "—"}
            sub={summary.topSupplier ? fmt(summary.topSupplier.purchaseAmount) : undefined}
          />
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="kpi" className="gap-1"><BarChart3 className="h-3.5 w-3.5" /> {t("purchases.analytics.tabs.kpi")}</TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-1"><Users className="h-3.5 w-3.5" /> {t("purchases.analytics.tabs.suppliers")}</TabsTrigger>
          <TabsTrigger value="spend" className="gap-1"><TrendingUp className="h-3.5 w-3.5" /> {t("purchases.analytics.tabs.spend")}</TabsTrigger>
          <TabsTrigger value="payables" className="gap-1"><Wallet className="h-3.5 w-3.5" /> {t("purchases.analytics.tabs.payables")}</TabsTrigger>
          <TabsTrigger value="posting" className="gap-1"><FileCheck className="h-3.5 w-3.5" /> {t("purchases.analytics.tabs.posting")}</TabsTrigger>
          <TabsTrigger value="trends" className="gap-1"><LineChart className="h-3.5 w-3.5" /> {t("purchases.analytics.tabs.trends")}</TabsTrigger>
        </TabsList>

        <TabsContent value="kpi" className="space-y-4">
          {summary && (
            <Card>
              <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><span className="text-muted-foreground">{t("purchases.analytics.kpi.purchaseOrders")}</span><p className="font-semibold">{summary.totalPurchaseOrders}</p></div>
                <div><span className="text-muted-foreground">{t("purchases.analytics.kpi.receipts")}</span><p className="font-semibold">{summary.totalReceipts}</p></div>
                <div><span className="text-muted-foreground">{t("purchases.analytics.kpi.invoices")}</span><p className="font-semibold">{summary.totalInvoices}</p></div>
                <div><span className="text-muted-foreground">{t("purchases.analytics.kpi.payments")}</span><p className="font-semibold">{summary.totalPayments}</p></div>
                <div><span className="text-muted-foreground">{t("purchases.analytics.kpi.avgInvoiceCycle")}</span><p className="font-semibold">{t("purchases.analytics.kpi.days", { count: summary.averageInvoiceCycleDays })}</p></div>
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
                    <TableHead>{t("purchases.shared.supplier")}</TableHead>
                    <TableHead>{t("purchases.analytics.suppliers.spend")}</TableHead>
                    <TableHead>{t("purchases.analytics.suppliers.poCount")}</TableHead>
                    <TableHead>{t("purchases.analytics.suppliers.avgLeadTime")}</TableHead>
                    <TableHead>{t("purchases.analytics.suppliers.onTime")}</TableHead>
                    <TableHead>{t("purchases.analytics.suppliers.invoiceAccuracy")}</TableHead>
                    <TableHead>{t("purchases.analytics.suppliers.matchRate")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierRows.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t("purchases.analytics.suppliers.empty")}</TableCell></TableRow>
                  )}
                  {supplierRows.map((row) => (
                    <TableRow key={row.supplierId}>
                      <TableCell className="font-medium">{row.supplierName}</TableCell>
                      <TableCell>{fmt(row.purchaseAmount)}</TableCell>
                      <TableCell>{row.purchaseCount}</TableCell>
                      <TableCell>{t("purchases.analytics.kpi.days", { count: row.averageLeadTime })}</TableCell>
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
              <SelectTrigger className="w-48"><SelectValue placeholder={t("purchases.analytics.spend.allSuppliers")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("purchases.analytics.spend.allSuppliers")}</SelectItem>
                {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-0">
                <p className="p-3 text-sm font-medium border-b">{t("purchases.analytics.spend.monthlySpend")}</p>
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
                <p className="p-3 text-sm font-medium border-b">{t("purchases.analytics.spend.bySupplier")}</p>
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
              <KpiCard label={t("purchases.analytics.payables.current")} value={fmt(payables.current)} />
              <KpiCard label={t("purchases.analytics.payables.days1to30")} value={fmt(payables.days1to30)} />
              <KpiCard label={t("purchases.analytics.payables.days31to60")} value={fmt(payables.days31to60)} />
              <KpiCard label={t("purchases.analytics.payables.days61to90")} value={fmt(payables.days61to90)} />
              <KpiCard label={t("purchases.analytics.payables.days90plus")} value={fmt(payables.days90plus)} />
              <KpiCard label={t("purchases.analytics.payables.totalOutstanding")} value={fmt(payables.totalOutstanding)} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="posting">
          {posting && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <KpiCard label={t("purchases.analytics.postingKpi.postedGrns")} value={posting.postedGrnCount} />
              <KpiCard label={t("purchases.analytics.postingKpi.unpostedGrns")} value={posting.unpostedGrnCount} />
              <KpiCard label={t("purchases.analytics.postingKpi.postedInvoices")} value={posting.postedInvoiceCount} />
              <KpiCard label={t("purchases.analytics.postingKpi.unpostedInvoices")} value={posting.unpostedInvoiceCount} />
              <KpiCard label={t("purchases.analytics.postingKpi.postedPayments")} value={posting.postedPaymentCount} />
              <KpiCard label={t("purchases.analytics.postingKpi.unpostedPayments")} value={posting.unpostedPaymentCount} />
              <KpiCard label={t("purchases.analytics.postingKpi.postingRate")} value={pct(posting.postingRate)} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>{t("purchases.analytics.trends.month")}</TableHead>
                    <TableHead>{t("purchases.analytics.trends.pos")}</TableHead>
                    <TableHead>{t("purchases.analytics.trends.receipts")}</TableHead>
                    <TableHead>{t("purchases.analytics.trends.invoices")}</TableHead>
                    <TableHead>{t("purchases.analytics.trends.payments")}</TableHead>
                    <TableHead>{t("purchases.analytics.trends.spend")}</TableHead>
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
