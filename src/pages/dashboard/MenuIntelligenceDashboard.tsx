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
import { useErpTranslation } from "@/i18n/useErpTranslation";

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
  { key: "STAR" as const, className: "border-emerald-500/30 bg-emerald-500/5" },
  { key: "PUZZLE" as const, className: "border-blue-500/30 bg-blue-500/5" },
  { key: "PLOWHORSE" as const, className: "border-amber-500/30 bg-amber-500/5" },
  { key: "DOG" as const, className: "border-red-500/30 bg-red-500/5" },
];

export default function MenuIntelligenceDashboard() {
  const { t } = useErpTranslation();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const canResolveAlerts = useAuthStore((s) => s.hasPermission("automation.manage"));
  const invalidate = useInvalidateMenuDashboard();
  const data = useMenuIntelligenceDashboard(activeOutletId);
  const [alertTab, setAlertTab] = useState("open");

  const resolveMutation = useMutation({
    mutationFn: (alertId: number) => resolveAutomationAlert(activeOutletId!, alertId),
    onSuccess: () => {
      toast.success(t("menuIntelligence.alerts.resolvedSuccess"));
      if (typeof activeOutletId === "number") {
        invalidate(activeOutletId);
        data.refetchAlerts();
      }
    },
    onError: (e) => toast.error(e instanceof ApiHttpError ? e.message : t("menuIntelligence.alerts.resolveFailed")),
  });

  const quadrantMeta = useMemo(
    () =>
      QUADRANT_META.map((q) => ({
        ...q,
        label: t(`menuIntelligence.quadrants.${q.key}`),
      })),
    [t],
  );

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
          <h1 className="text-2xl font-bold">{t("menuIntelligence.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("menuIntelligence.subtitle")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={noOutlet || data.isRefetching}
          onClick={() => data.refetchAlerts()}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${data.isRefetching ? "animate-spin" : ""}`} />
          {t("menuIntelligence.refresh")}
        </Button>
      </div>

      {noOutlet && (
        <Card className="rounded-2xl border-dashed p-6 text-sm text-muted-foreground">
          {t("menuIntelligence.noOutlet")}
        </Card>
      )}

      {/* Section 1 — KPIs */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" /> {t("menuIntelligence.sections.executiveKpis")}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <KpiCard title={t("menuIntelligence.kpis.revenue")} value={formatMoney(kpis?.revenue ?? 0)} icon={DollarSign} loading={loading} />
          <KpiCard title={t("menuIntelligence.kpis.foodCostPercent")} value={formatPercent(kpis?.foodCostPercent ?? 0)} icon={Percent} loading={loading} />
          <KpiCard title={t("menuIntelligence.kpis.avgMarginPercent")} value={formatPercent(kpis?.averageMarginPercent ?? 0)} icon={TrendingUp} loading={loading} />
          <KpiCard title={t("menuIntelligence.kpis.forecastRevenue")} value={formatMoney(kpis?.forecastRevenue ?? 0)} icon={Sparkles} loading={loading} />
          <KpiCard title={t("menuIntelligence.kpis.forecastMargin")} value={formatMoney(kpis?.forecastMargin ?? 0)} icon={Target} loading={loading} />
          <KpiCard title={t("menuIntelligence.kpis.inventoryValue")} value={formatMoney(inventoryValue)} icon={Package} loading={loading} />
          <KpiCard
            title={t("menuIntelligence.kpis.healthScore")}
            value={data.summary?.health ? String(Math.round(data.summary.health.score)) : "—"}
            icon={Activity}
            loading={loading}
          />
        </div>
      </section>

      {/* Charts */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("menuIntelligence.sections.trends")}</h2>
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
          <UtensilsCrossed className="h-5 w-5" /> {t("menuIntelligence.sections.menuEngineering")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quadrantMeta.map(({ key, label, className }) => (
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
                      <span className="text-muted-foreground">{t("menuIntelligence.quadrants.count")}</span>
                      <span className="font-semibold">{quadrants[key].count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("menuIntelligence.quadrants.revenue")}</span>
                      <span className="font-medium">{formatMoney(quadrants[key].estimatedRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("menuIntelligence.quadrants.margin")}</span>
                      <span className="font-medium">{formatMoney(quadrants[key].totalMargin)}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="rounded-2xl overflow-hidden">
          <CardHeader><CardTitle className="text-base">{t("menuIntelligence.engineering.topItemsTitle")}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("menuIntelligence.table.menuItem")}</TableHead>
                  <TableHead>{t("menuIntelligence.table.class")}</TableHead>
                  <TableHead className="text-right">{t("menuIntelligence.table.qtySold")}</TableHead>
                  <TableHead className="text-right">{t("menuIntelligence.table.marginPercent")}</TableHead>
                  <TableHead className="text-right">{t("menuIntelligence.table.contribution")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t("menuIntelligence.engineering.noData")}</TableCell>
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
          <Target className="h-5 w-5" /> {t("menuIntelligence.sections.optimization")}
        </h2>
        <div className="grid gap-4 xl:grid-cols-2">
          <OppTable title={t("menuIntelligence.optimization.priceOpportunities")} rows={data.priceOpps} columns={[
            { key: "menuItemName", label: t("menuIntelligence.table.menuItem") },
            { key: "suggestedDirection", label: t("menuIntelligence.table.direction") },
            { key: "suggestedPrice", label: t("menuIntelligence.table.suggested"), format: (v) => formatMoney(Number(v)) },
            { key: "projectedMonthlyProfitIncrease", label: t("menuIntelligence.table.projProfit"), format: (v) => formatMoney(Number(v)) },
          ]} />
          <OppTable title={t("menuIntelligence.optimization.ingredientOpportunities")} rows={data.ingredientOpps} columns={[
            { key: "ingredientName", label: t("menuIntelligence.table.ingredient") },
            { key: "menuItemName", label: t("menuIntelligence.table.menuItem") },
            { key: "potentialSavings", label: t("menuIntelligence.table.savings"), format: (v) => formatMoney(Number(v ?? 0)) },
          ]} />
          <OppTable title={t("menuIntelligence.optimization.yieldOpportunities")} rows={data.yieldOpps} columns={[
            { key: "menuItemName", label: t("menuIntelligence.table.menuItem") },
            { key: "currentYieldPercent", label: t("menuIntelligence.table.currentPercent") },
            { key: "suggestedYieldPercent", label: t("menuIntelligence.table.suggestedPercent") },
            { key: "projectedSavings", label: t("menuIntelligence.table.savings"), format: (v) => formatMoney(Number(v ?? 0)) },
          ]} />
          <OppTable title={t("menuIntelligence.optimization.bundleOpportunities")} rows={data.bundleOpps} columns={[
            { key: "bundleName", label: t("menuIntelligence.table.bundle") },
            { key: "projectedRevenue", label: t("menuIntelligence.table.revenue"), format: (v) => formatMoney(Number(v ?? 0)) },
            { key: "projectedMargin", label: t("menuIntelligence.table.margin"), format: (v) => formatMoney(Number(v ?? 0)) },
          ]} />
        </div>
      </section>

      {/* Section 4 — Automation */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" /> {t("menuIntelligence.sections.alertCenter")}
        </h2>
        <Card className="rounded-2xl">
          <CardContent className="pt-6">
            <Tabs value={alertTab} onValueChange={setAlertTab}>
              <TabsList>
                <TabsTrigger value="open">{t("menuIntelligence.alerts.open", { count: data.openAlerts.length })}</TabsTrigger>
                <TabsTrigger value="critical">{t("menuIntelligence.alerts.critical", { count: data.criticalAlerts.length })}</TabsTrigger>
                <TabsTrigger value="resolved">{t("menuIntelligence.alerts.resolved", { count: data.resolvedAlerts.length })}</TabsTrigger>
              </TabsList>
              <TabsContent value={alertTab} className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("menuIntelligence.table.severity")}</TableHead>
                      <TableHead>{t("menuIntelligence.table.title")}</TableHead>
                      <TableHead>{t("menuIntelligence.table.type")}</TableHead>
                      <TableHead>{t("menuIntelligence.table.triggered")}</TableHead>
                      {alertTab !== "resolved" && canResolveAlerts && <TableHead className="text-right">{t("menuIntelligence.table.action")}</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertsForTab.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t("menuIntelligence.alerts.noAlerts")}</TableCell>
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
                              {t("menuIntelligence.alerts.resolve")}
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
          <Sparkles className="h-5 w-5" /> {t("menuIntelligence.sections.forecasting")}
        </h2>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <ForecastCard
            title={t("menuIntelligence.forecast.demandForecast")}
            subtitle={data.demandForecast?.forecastDate}
            rows={(data.demandForecast?.items ?? []).slice(0, 8).map((i) => ({
              name: i.menuItemName ?? i.menuItemId,
              value: t("menuIntelligence.forecast.units", { count: i.predictedQuantity }),
            }))}
          />
          <ForecastCard
            title={t("menuIntelligence.forecast.revenueForecast")}
            subtitle={data.revenueForecast?.forecastDate}
            rows={(data.revenueForecast?.items ?? []).slice(0, 8).map((i) => ({
              name: i.menuItemName ?? i.menuItemId,
              value: formatMoney(i.predictedRevenue),
            }))}
            footer={
              data.revenueForecast
                ? t("menuIntelligence.forecast.totalMargin", {
                    amount: formatMoney(data.revenueForecast.totals.predictedMargin),
                  })
                : undefined
            }
          />
          <ForecastCard
            title={t("menuIntelligence.forecast.marginForecast")}
            subtitle={data.revenueForecast?.forecastDate}
            rows={(data.revenueForecast?.items ?? []).slice(0, 8).map((i) => ({
              name: i.menuItemName ?? i.menuItemId,
              value: formatMoney(i.predictedMargin),
            }))}
          />
          <ForecastCard
            title={t("menuIntelligence.forecast.stockRiskForecast")}
            rows={(data.stockRisk?.risks ?? []).slice(0, 8).map((r) => ({
              name: r.ingredientName ?? r.ingredientId,
              value: r.riskLevel,
            }))}
          />
          <ForecastCard
            title={t("menuIntelligence.forecast.productionForecast")}
            rows={(data.productionForecast?.items ?? []).slice(0, 8).map((i) => ({
              name: i.menuItemName ?? i.menuItemId,
              value: t("menuIntelligence.forecast.units", { count: i.predictedQuantity }),
            }))}
          />
        </div>
      </section>

      {/* Section 6 — Inventory */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Package className="h-5 w-5" /> {t("menuIntelligence.sections.inventoryHealth")}
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-sm">{t("menuIntelligence.inventory.inventoryValue")}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatMoney(inventoryValue)}</p></CardContent>
          </Card>
          <Card className="rounded-2xl md:col-span-2">
            <CardHeader><CardTitle className="text-sm">{t("menuIntelligence.inventory.deadStock")}</CardTitle></CardHeader>
            <CardContent>
              {(data.inventory?.deadStock ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("menuIntelligence.inventory.noDeadStock")}</p>
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
          <CardHeader><CardTitle className="text-sm">{t("menuIntelligence.inventory.criticalRiskIngredients")}</CardTitle></CardHeader>
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
                <span className="text-sm text-muted-foreground">{t("menuIntelligence.inventory.noCriticalStockRisks")}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Section 7 — Health Score */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" /> {t("menuIntelligence.sections.executiveHealthScore")}
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
  const { t } = useErpTranslation();

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
                  {t("menuIntelligence.optimization.noOpportunities")}
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
  const { t } = useErpTranslation();

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">{t("menuIntelligence.forecast.noData")}</p>}
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
