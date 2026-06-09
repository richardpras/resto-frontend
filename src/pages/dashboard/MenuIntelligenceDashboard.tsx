import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  DollarSign,
  Package,
  Percent,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { HealthGauge } from "@/components/menu-dashboard/HealthGauge";
import { TrendCharts } from "@/components/menu-dashboard/TrendCharts";
import { useMenuIntelligenceDashboard, useInvalidateMenuDashboard } from "@/hooks/menu/useMenuIntelligenceDashboard";
import { useOutletStore } from "@/stores/outletStore";
import { useAuthStore } from "@/stores/authStore";
import { formatMoney, formatPercent } from "@/lib/format/currency";
import { aggregateQuadrants } from "@/lib/menu-dashboard/aggregations";
import { resolveAutomationAlert } from "@/lib/api-integration/menuDashboardEndpoints";
import { ApiHttpError } from "@/lib/api-integration/client";

function KpiCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string;
  icon: typeof DollarSign;
  loading?: boolean;
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-24" /> : <p className="text-2xl font-bold">{value}</p>}
      </CardContent>
    </Card>
  );
}

const QUADRANT_META = [
  { key: "STAR" as const, label: "STAR", className: "border-emerald-500/30 bg-emerald-500/5" },
  { key: "PUZZLE" as const, label: "PUZZLE", className: "border-blue-500/30 bg-blue-500/5" },
  { key: "PLOWHORSE" as const, label: "PLOWHORSE", className: "border-amber-500/30 bg-amber-500/5" },
  { key: "DOG" as const, label: "DOG", className: "border-red-500/30 bg-red-500/5" },
];

export default function MenuIntelligenceDashboard() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const canResolveAlerts = useAuthStore((s) => s.hasPermission("automation.manage"));
  const invalidate = useInvalidateMenuDashboard();
  const data = useMenuIntelligenceDashboard(activeOutletId);
  const [alertTab, setAlertTab] = useState("open");

  const resolveMutation = useMutation({
    mutationFn: (alertId: number) => resolveAutomationAlert(activeOutletId!, alertId),
    onSuccess: () => {
      toast.success("Alert resolved.");
      if (typeof activeOutletId === "number") {
        invalidate(activeOutletId);
        data.refetchAlerts();
      }
    },
    onError: (e) => toast.error(e instanceof ApiHttpError ? e.message : "Failed to resolve alert"),
  });

  const quadrants = useMemo(
    () => (data.matrix ? aggregateQuadrants(data.matrix.items) : null),
    [data.matrix],
  );

  const topItems = useMemo(() => {
    if (!data.matrix) return [];
    return [...data.matrix.items]
      .sort((a, b) => b.contributionMargin * b.quantitySold - a.contributionMargin * a.quantitySold)
      .slice(0, 10);
  }, [data.matrix]);

  const alertsForTab =
    alertTab === "critical"
      ? data.criticalAlerts
      : alertTab === "resolved"
        ? data.resolvedAlerts
        : data.openAlerts;

  const kpis = data.summary?.kpis;
  const inventoryValue =
    data.summary?.inventory.inventoryValue ??
    data.inventory?.inventoryValue ??
    data.executive?.inventoryValue ??
    0;

  const noOutlet = typeof activeOutletId !== "number" || activeOutletId < 1;
  const loading = data.isLoading;

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-[1600px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Menu Intelligence Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Executive view across analytics, engineering, optimization, automation, and forecasting.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={noOutlet || data.isRefetching}
          onClick={() => data.refetchAlerts()}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${data.isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {noOutlet && (
        <Card className="rounded-2xl border-dashed p-6 text-sm text-muted-foreground">
          Select an outlet in the header to load the executive dashboard.
        </Card>
      )}

      {/* Section 1 — KPIs */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" /> Executive KPIs
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <KpiCard title="Revenue" value={formatMoney(kpis?.revenue ?? 0)} icon={DollarSign} loading={loading} />
          <KpiCard title="Food Cost %" value={formatPercent(kpis?.foodCostPercent ?? 0)} icon={Percent} loading={loading} />
          <KpiCard title="Avg Margin %" value={formatPercent(kpis?.averageMarginPercent ?? 0)} icon={TrendingUp} loading={loading} />
          <KpiCard title="Forecast Revenue" value={formatMoney(kpis?.forecastRevenue ?? 0)} icon={Sparkles} loading={loading} />
          <KpiCard title="Forecast Margin" value={formatMoney(kpis?.forecastMargin ?? 0)} icon={Target} loading={loading} />
          <KpiCard title="Inventory Value" value={formatMoney(inventoryValue)} icon={Package} loading={loading} />
          <KpiCard
            title="Health Score"
            value={data.summary?.health ? String(Math.round(data.summary.health.score)) : "—"}
            icon={Activity}
            loading={loading}
          />
        </div>
      </section>

      {/* Charts */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Trends &amp; Distribution</h2>
        <TrendCharts
          salesTrend={data.executive?.salesTrend ?? []}
          marginTrend={data.marginTrend}
          foodCostTrend={data.foodCostTrend}
          snapshots={data.snapshots}
          matrix={data.matrix}
        />
      </section>

      {/* Section 2 — Engineering */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5" /> Menu Engineering
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {QUADRANT_META.map(({ key, label, className }) => (
            <Card key={key} className={`rounded-2xl border ${className}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {loading || !quadrants ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Count</span>
                      <span className="font-semibold">{quadrants[key].count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Revenue</span>
                      <span className="font-medium">{formatMoney(quadrants[key].estimatedRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Margin</span>
                      <span className="font-medium">{formatMoney(quadrants[key].totalMargin)}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="rounded-2xl overflow-hidden">
          <CardHeader><CardTitle className="text-base">Top 10 Items</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Menu Item</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Qty Sold</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                  <TableHead className="text-right">Contribution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No engineering data</TableCell>
                  </TableRow>
                )}
                {topItems.map((item) => (
                  <TableRow key={item.menuItemId}>
                    <TableCell className="font-medium">{item.menuItemName}</TableCell>
                    <TableCell><Badge variant="outline">{item.classification}</Badge></TableCell>
                    <TableCell className="text-right">{item.quantitySold}</TableCell>
                    <TableCell className="text-right">{formatPercent(item.marginPercent)}</TableCell>
                    <TableCell className="text-right">{formatMoney(item.contributionMargin)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* Section 3 — Optimization */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Target className="h-5 w-5" /> Optimization Opportunities
        </h2>
        <div className="grid gap-4 xl:grid-cols-2">
          <OppTable title="Price Opportunities" rows={data.priceOpps} columns={[
            { key: "menuItemName", label: "Menu Item" },
            { key: "suggestedDirection", label: "Direction" },
            { key: "suggestedPrice", label: "Suggested", format: (v) => formatMoney(Number(v)) },
            { key: "projectedMonthlyProfitIncrease", label: "Proj. Profit", format: (v) => formatMoney(Number(v)) },
          ]} />
          <OppTable title="Ingredient Opportunities" rows={data.ingredientOpps} columns={[
            { key: "ingredientName", label: "Ingredient" },
            { key: "menuItemName", label: "Menu Item" },
            { key: "potentialSavings", label: "Savings", format: (v) => formatMoney(Number(v ?? 0)) },
          ]} />
          <OppTable title="Yield Opportunities" rows={data.yieldOpps} columns={[
            { key: "menuItemName", label: "Menu Item" },
            { key: "currentYieldPercent", label: "Current %" },
            { key: "suggestedYieldPercent", label: "Suggested %" },
            { key: "projectedSavings", label: "Savings", format: (v) => formatMoney(Number(v ?? 0)) },
          ]} />
          <OppTable title="Bundle Opportunities" rows={data.bundleOpps} columns={[
            { key: "bundleName", label: "Bundle" },
            { key: "projectedRevenue", label: "Revenue", format: (v) => formatMoney(Number(v ?? 0)) },
            { key: "projectedMargin", label: "Margin", format: (v) => formatMoney(Number(v ?? 0)) },
          ]} />
        </div>
      </section>

      {/* Section 4 — Automation */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" /> Alert Center
        </h2>
        <Card className="rounded-2xl">
          <CardContent className="pt-6">
            <Tabs value={alertTab} onValueChange={setAlertTab}>
              <TabsList>
                <TabsTrigger value="open">Open ({data.openAlerts.length})</TabsTrigger>
                <TabsTrigger value="critical">Critical ({data.criticalAlerts.length})</TabsTrigger>
                <TabsTrigger value="resolved">Resolved ({data.resolvedAlerts.length})</TabsTrigger>
              </TabsList>
              <TabsContent value={alertTab} className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Severity</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Triggered</TableHead>
                      {alertTab !== "resolved" && canResolveAlerts && <TableHead className="text-right">Action</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertsForTab.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No alerts</TableCell>
                      </TableRow>
                    )}
                    {alertsForTab.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <Badge variant={alert.severity === "critical" ? "destructive" : "secondary"}>
                            {alert.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{alert.title}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{alert.alert_type}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {alert.triggered_at ? new Date(alert.triggered_at).toLocaleString() : "—"}
                        </TableCell>
                        {alertTab !== "resolved" && canResolveAlerts && (
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={resolveMutation.isPending}
                              onClick={() => resolveMutation.mutate(alert.id)}
                            >
                              Resolve
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      {/* Section 5 — Forecasting */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5" /> Forecasting
        </h2>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <ForecastCard
            title="Demand Forecast"
            subtitle={data.demandForecast?.forecastDate}
            rows={(data.demandForecast?.items ?? []).slice(0, 8).map((i) => ({
              name: i.menuItemName ?? i.menuItemId,
              value: `${i.predictedQuantity} units`,
            }))}
          />
          <ForecastCard
            title="Revenue Forecast"
            subtitle={data.revenueForecast?.forecastDate}
            rows={(data.revenueForecast?.items ?? []).slice(0, 8).map((i) => ({
              name: i.menuItemName ?? i.menuItemId,
              value: formatMoney(i.predictedRevenue),
            }))}
            footer={
              data.revenueForecast
                ? `Total margin: ${formatMoney(data.revenueForecast.totals.predictedMargin)}`
                : undefined
            }
          />
          <ForecastCard
            title="Margin Forecast"
            subtitle={data.revenueForecast?.forecastDate}
            rows={(data.revenueForecast?.items ?? []).slice(0, 8).map((i) => ({
              name: i.menuItemName ?? i.menuItemId,
              value: formatMoney(i.predictedMargin),
            }))}
          />
          <ForecastCard
            title="Stock Risk Forecast"
            rows={(data.stockRisk?.risks ?? []).slice(0, 8).map((r) => ({
              name: r.ingredientName ?? r.ingredientId,
              value: r.riskLevel,
            }))}
          />
          <ForecastCard
            title="Production Forecast"
            rows={(data.productionForecast?.items ?? []).slice(0, 8).map((i) => ({
              name: i.menuItemName ?? i.menuItemId,
              value: `${i.predictedQuantity} units`,
            }))}
          />
        </div>
      </section>

      {/* Section 6 — Inventory */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Package className="h-5 w-5" /> Inventory Health
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-sm">Inventory Value</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatMoney(inventoryValue)}</p></CardContent>
          </Card>
          <Card className="rounded-2xl md:col-span-2">
            <CardHeader><CardTitle className="text-sm">Dead Stock</CardTitle></CardHeader>
            <CardContent>
              {(data.inventory?.deadStock ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No dead stock detected</p>
              ) : (
                <ul className="text-sm space-y-1">
                  {data.inventory!.deadStock.slice(0, 6).map((row) => (
                    <li key={row.ingredientId} className="flex justify-between">
                      <span>{row.ingredientName ?? row.ingredientId}</span>
                      <span className="text-muted-foreground">{formatMoney(row.inventoryValue)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-sm">Critical Risk Ingredients</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(data.stockRisk?.risks ?? [])
                .filter((r) => r.riskLevel === "critical" || r.riskLevel === "high")
                .slice(0, 12)
                .map((r) => (
                  <Badge key={r.ingredientId} variant={r.riskLevel === "critical" ? "destructive" : "secondary"}>
                    {r.ingredientName ?? r.ingredientId}
                  </Badge>
                ))}
              {(data.stockRisk?.risks ?? []).filter((r) => r.riskLevel === "critical" || r.riskLevel === "high").length === 0 && (
                <span className="text-sm text-muted-foreground">No critical stock risks</span>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Section 7 — Health Score */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" /> Executive Health Score
        </h2>
        <Card className="rounded-2xl">
          <CardContent className="py-8 flex justify-center">
            <HealthGauge health={data.summary?.health} loading={loading} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function OppTable({
  title,
  rows,
  columns,
}: {
  title: string;
  rows: Array<Record<string, unknown>>;
  columns: Array<{ key: string; label: string; format?: (v: unknown) => string }>;
}) {
  return (
    <Card className="rounded-2xl overflow-hidden">
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key}>{c.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-6">
                  No opportunities
                </TableCell>
              </TableRow>
            )}
            {rows.slice(0, 10).map((row, idx) => (
              <TableRow key={idx}>
                {columns.map((c) => (
                  <TableCell key={c.key}>
                    {c.format ? c.format(row[c.key]) : String(row[c.key] ?? "—")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ForecastCard({
  title,
  subtitle,
  rows,
  footer,
}: {
  title: string;
  subtitle?: string;
  rows: Array<{ name: string; value: string }>;
  footer?: string;
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No forecast data</p>}
        {rows.map((row) => (
          <div key={row.name} className="flex justify-between text-sm gap-2">
            <span className="truncate">{row.name}</span>
            <span className="text-muted-foreground shrink-0">{row.value}</span>
          </div>
        ))}
        {footer && <p className="text-xs font-medium pt-2 border-t">{footer}</p>}
      </CardContent>
    </Card>
  );
}
