import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExecutiveScoreGauge } from "@/components/executive/ExecutiveScoreGauge";
import { ExecutiveWidgetCard } from "@/components/executive/ExecutiveWidgetCard";
import { ExecutiveDashboardSystemHealthWidget } from "@/components/executive/ExecutiveDashboardSystemHealthWidget";
import { ExecutiveInventoryReliabilityWidget } from "@/components/executive/ExecutiveInventoryReliabilityWidget";
import { ExecutiveCustomerOrderingWidget } from "@/components/executive/ExecutiveCustomerOrderingWidget";
import { ExecutiveShiftCloseWidget } from "@/components/executive/ExecutiveShiftCloseWidget";
import { useExecutiveDashboardData } from "@/hooks/executive/useExecutiveDashboardData";
import { useAuthStore } from "@/stores/authStore";
import { useOutletStore } from "@/stores/outletStore";
import { formatMoney, formatPercent } from "@/lib/format/currency";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import type { TFunction } from "i18next";
import type { UserNotification, UserNotificationSourceModule } from "@/lib/api-integration/notificationEndpoints";

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

const APPROVAL_SOURCES = new Set<UserNotificationSourceModule>(["procurement", "payroll", "hr"]);

function groupLabel(source: UserNotificationSourceModule, t: TFunction): string {
  if (APPROVAL_SOURCES.has(source)) return t("executive.dashboard.notificationGroups.approvals");
  if (source === "menu_intelligence") return t("executive.dashboard.notificationGroups.menu");
  if (source === "inventory") return t("executive.dashboard.notificationGroups.inventory");
  if (source === "accounting") return t("executive.dashboard.notificationGroups.accounting");
  if (source === "payments") return t("executive.dashboard.notificationGroups.payments");
  return source;
}

function formatHealthSeverity(severity: string | null | undefined, t: TFunction): string {
  if (!severity) return "—";
  return t(`accounting.health.severityLabels.${severity}`, {
    defaultValue: severity.charAt(0).toUpperCase() + severity.slice(1),
  });
}

function CriticalAlertsStrip({
  criticalCount,
  warningCount,
  unreadCount,
  loading,
}: {
  criticalCount: number;
  warningCount: number;
  unreadCount: number;
  loading: boolean;
}) {
  const { t } = useErpTranslation();

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 py-4">
        <span className="text-sm font-medium">{t("executive.dashboard.criticalAlerts.title")}</span>
        {loading ? (
          <Badge variant="outline">{t("ops:shared.loading")}</Badge>
        ) : (
          <>
            <Badge variant="destructive">{t("executive.dashboard.criticalAlerts.critical", { count: criticalCount })}</Badge>
            <Badge className="bg-warning/15 text-warning border-warning/30">
              {t("executive.dashboard.criticalAlerts.warning", { count: warningCount })}
            </Badge>
            <Badge variant="secondary">{t("executive.dashboard.criticalAlerts.unread", { count: unreadCount })}</Badge>
          </>
        )}
        <Button variant="link" size="sm" className="ml-auto px-0" asChild>
          <Link to="/notifications">{t("common:nav.notificationCenter")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ExecutiveDashboard() {
  const { t } = useErpTranslation();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const data = useExecutiveDashboardData(activeOutletId, hasPermission);

  const criticalCount = data.criticalNotifications.data?.length ?? 0;
  const warningCount = data.warningNotifications.data?.length ?? 0;
  const unreadCount = data.unreadCount.data ?? 0;

  if (typeof activeOutletId !== "number" || activeOutletId < 1) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">{t("reportsHub.cards.executive-dashboard.title")}</h1>
        <p className="text-sm text-muted-foreground mt-2">{t("executive.dashboard.selectOutlet")}</p>
      </div>
    );
  }

  const sales = data.sales.data?.summary;
  const topProducts = data.sales.data?.topProducts?.slice(0, 5) ?? [];
  const topMembers = data.loyalty.data?.topMembers?.slice(0, 5) ?? [];
  const loyaltySummary = data.loyalty.data?.executiveSummary;
  const monitoring = data.monitoring.data;

  const foodCostTrendBadge = (() => {
    const pct = data.foodCostPercent.data;
    if (pct === undefined) return null;
    if (pct > 45) return <Badge variant="destructive">{t("executive.dashboard.foodCostTrend.high")}</Badge>;
    if (pct > 40) return <Badge className="bg-warning/15 text-warning border-warning/30">{t("executive.dashboard.foodCostTrend.elevated")}</Badge>;
    return <Badge variant="outline">{t("executive.dashboard.foodCostTrend.onTarget")}</Badge>;
  })();

  const notificationsByGroup = (data.notifications.data?.data ?? []).reduce<Record<string, UserNotification[]>>(
    (acc, item) => {
      const key = groupLabel(item.sourceModule, t);
      acc[key] = acc[key] ?? [];
      acc[key].push(item);
      return acc;
    },
    {},
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("reportsHub.cards.executive-dashboard.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("reportsHub.cards.executive-dashboard.description")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => data.refetchAll()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("ops:shared.refresh")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <Card className="flex items-center justify-center p-6">
          <ExecutiveScoreGauge
            score={data.executiveScore.score}
            partial={data.executiveScore.partial}
            pillarCount={data.executiveScore.pillarCount}
            loading={data.scoreLoading}
          />
        </Card>
        <CriticalAlertsStrip
          criticalCount={criticalCount}
          warningCount={warningCount}
          unreadCount={unreadCount}
          loading={data.criticalNotifications.status === "loading" || data.unreadCount.status === "loading"}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("executive.dashboard.sections.financial")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ExecutiveWidgetCard
            title={t("executive.dashboard.widgets.executiveSales.title")}
            description={t("executive.dashboard.widgets.executiveSales.description")}
            status={data.sales.status}
            permissionHint={data.sales.permissionHint}
            errorMessage={data.sales.errorMessage}
            openTo="/reports/executive-sales"
          >
            {sales ? (
              <div className="space-y-2">
                <MetricRow label={t("executive.dashboard.metrics.grossSales")} value={formatMoney(sales.grossSales)} />
                <MetricRow label={t("executive.dashboard.metrics.netSales")} value={formatMoney(sales.netSales)} />
                <MetricRow label={t("executive.dashboard.metrics.refundAmount")} value={formatMoney(sales.refundAmount)} />
                <MetricRow label={t("executive.dashboard.metrics.refundCount")} value={sales.refundCount} />
              </div>
            ) : null}
          </ExecutiveWidgetCard>

          <ExecutiveWidgetCard
            title={t("executive.dashboard.widgets.accountingHealth.title")}
            description={t("executive.dashboard.widgets.accountingHealth.description")}
            status={data.accountingHealth.status}
            permissionHint={data.accountingHealth.permissionHint}
            errorMessage={data.accountingHealth.errorMessage}
            openTo="/accounting?tab=health"
          >
            {data.accountingHealth.data ? (
              <div className="space-y-2">
                <MetricRow label={t("executive.dashboard.metrics.healthScore")} value={data.accountingHealth.data.healthScore} />
                <MetricRow
                  label={t("executive.dashboard.metrics.severity")}
                  value={formatHealthSeverity(data.accountingHealth.data.healthSeverity, t)}
                />
                <MetricRow label={t("executive.dashboard.metrics.failedPostings")} value={data.accountingHealth.data.failedPostings} />
                <MetricRow
                  label={t("executive.dashboard.metrics.priorityQueue")}
                  value={data.accountingHealth.data.priorityQueue?.length ?? 0}
                />
              </div>
            ) : null}
          </ExecutiveWidgetCard>

          <ExecutiveWidgetCard
            title={t("executive.dashboard.widgets.giftCardLiability.title")}
            description={t("executive.dashboard.widgets.giftCardLiability.description")}
            status={data.giftCardLiability.status}
            permissionHint={data.giftCardLiability.permissionHint}
            errorMessage={data.giftCardLiability.errorMessage}
            openTo="/accounting?tab=recon"
          >
            {data.giftCardLiability.data ? (
              <div className="space-y-2">
                <MetricRow
                  label={t("executive.dashboard.metrics.giftCardLiability")}
                  value={formatMoney(data.giftCardLiability.data.giftCardLiabilityBalance ?? 0)}
                />
                <MetricRow
                  label={t("executive.dashboard.metrics.storeCreditLiability")}
                  value={formatMoney(data.giftCardLiability.data.storeCreditLiabilityBalance ?? 0)}
                />
                <MetricRow label={t("executive.dashboard.metrics.status")} value={data.giftCardLiability.data.status} />
              </div>
            ) : null}
          </ExecutiveWidgetCard>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("reportsHub.sections.operations")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExecutiveDashboardSystemHealthWidget />

          <ExecutiveInventoryReliabilityWidget />

          <ExecutiveShiftCloseWidget />

          <ExecutiveCustomerOrderingWidget />

          <ExecutiveWidgetCard
            title={t("executive.dashboard.widgets.paymentHealth.title")}
            description={t("executive.dashboard.widgets.paymentHealth.description")}
            status={data.paymentHealth.status}
            permissionHint={data.paymentHealth.permissionHint}
            errorMessage={data.paymentHealth.errorMessage}
            openTo="/settings/payments/health"
          >
            {data.paymentHealth.data ? (
              <div className="space-y-2">
                <MetricRow
                  label={t("executive.dashboard.metrics.severity")}
                  value={formatHealthSeverity(data.paymentHealth.data.healthSeverity, t)}
                />
                <MetricRow
                  label={t("executive.dashboard.metrics.successRate")}
                  value={
                    data.paymentHealth.data.paymentSuccessRate !== undefined
                      ? formatPercent(data.paymentHealth.data.paymentSuccessRate)
                      : "—"
                  }
                />
                <MetricRow label={t("executive.dashboard.metrics.failedWebhooks")} value={data.paymentHealth.data.failedWebhooks ?? 0} />
                <MetricRow label={t("executive.dashboard.metrics.openIncidents")} value={data.paymentHealth.data.openIncidents ?? 0} />
              </div>
            ) : null}
          </ExecutiveWidgetCard>

          <ExecutiveWidgetCard
            title={t("executive.dashboard.widgets.auditActivity.title")}
            description={t("executive.dashboard.widgets.auditActivity.description")}
            status={data.auditActivity.status}
            permissionHint={data.auditActivity.permissionHint}
            errorMessage={data.auditActivity.errorMessage}
            openTo="/system/audit"
          >
            {data.auditActivity.data ? (
              <div className="space-y-2">
                <MetricRow label={t("executive.dashboard.metrics.todayEvents")} value={data.auditActivity.data.todayEvents} />
                <MetricRow label={t("executive.dashboard.metrics.criticalEvents")} value={data.auditActivity.data.criticalEvents} />
                <MetricRow label={t("executive.dashboard.metrics.activeUsers")} value={data.auditActivity.data.activeUsers} />
              </div>
            ) : null}
          </ExecutiveWidgetCard>

          <ExecutiveWidgetCard
            title={t("executive.dashboard.widgets.operationalMonitoring.title")}
            description={t("executive.dashboard.widgets.operationalMonitoring.description")}
            status={data.monitoring.status}
            permissionHint={data.monitoring.permissionHint}
            errorMessage={data.monitoring.errorMessage}
            openTo="/"
          >
            {monitoring ? (
              <div className="space-y-2">
                <MetricRow
                  label={t("executive.dashboard.metrics.kitchenQueue")}
                  value={monitoring.kitchen.queued + monitoring.kitchen.inProgress}
                />
                <MetricRow label={t("executive.dashboard.metrics.pendingPayments")} value={monitoring.pendingPayments} />
                <MetricRow label={t("executive.dashboard.metrics.activeSessions")} value={monitoring.activeSessions} />
                <MetricRow label={t("executive.dashboard.metrics.printerFailures")} value={monitoring.printerQueue.failed} />
                <MetricRow label={t("executive.dashboard.metrics.hardwareBridgeIssues")} value={monitoring.hardware.staleBridges} />
                <MetricRow label={t("executive.dashboard.metrics.offlineSyncFailures")} value={monitoring.offlineSync.failures} />
              </div>
            ) : null}
          </ExecutiveWidgetCard>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("reportsHub.sections.commercial")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <ExecutiveWidgetCard
            title={t("executive.dashboard.widgets.loyaltyOverview.title")}
            description={t("executive.dashboard.widgets.loyaltyOverview.description")}
            status={data.loyalty.status}
            permissionHint={data.loyalty.permissionHint}
            errorMessage={data.loyalty.errorMessage}
            openTo="/loyalty-programs"
          >
            {loyaltySummary ? (
              <div className="space-y-2">
                <MetricRow label={t("executive.dashboard.metrics.activeCustomers")} value={loyaltySummary.activeMembers} />
                <MetricRow label={t("executive.dashboard.metrics.repeatVisitRate")} value={formatPercent(loyaltySummary.repeatCustomerRate)} />
                <MetricRow
                  label={t("executive.dashboard.metrics.voucherRedemptionRate")}
                  value={formatPercent(data.loyalty.data?.voucherAnalytics.voucherRedemptionRate ?? 0)}
                />
              </div>
            ) : null}
          </ExecutiveWidgetCard>

          <ExecutiveWidgetCard
            title={t("executive.dashboard.widgets.topCustomers.title")}
            description={t("executive.dashboard.widgets.topCustomers.description")}
            status={data.loyalty.status}
            permissionHint={data.loyalty.permissionHint}
            errorMessage={data.loyalty.errorMessage}
            openTo="/members"
          >
            {topMembers.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {topMembers.map((member) => (
                  <li key={member.memberNo} className="flex justify-between gap-2">
                    <span className="truncate">{member.name}</span>
                    <span className="tabular-nums text-muted-foreground">{formatMoney(member.spending)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t("executive.dashboard.empty.noMemberData")}</p>
            )}
          </ExecutiveWidgetCard>

          <ExecutiveWidgetCard
            title={t("executive.dashboard.widgets.topProducts.title")}
            description={t("executive.dashboard.widgets.topProducts.description")}
            status={data.sales.status}
            permissionHint={data.sales.permissionHint}
            errorMessage={data.sales.errorMessage}
            openTo="/reports/executive-sales"
          >
            {topProducts.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {topProducts.map((product) => (
                  <li key={product.productId} className="flex justify-between gap-2">
                    <span className="truncate">{product.productName}</span>
                    <span className="tabular-nums text-muted-foreground">{formatMoney(product.netSales)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t("executive.dashboard.empty.noProductData")}</p>
            )}
          </ExecutiveWidgetCard>

          <ExecutiveWidgetCard
            title={t("executive.dashboard.widgets.foodCost.title")}
            description={t("executive.dashboard.widgets.foodCost.description")}
            status={data.foodCostPercent.status}
            permissionHint={data.foodCostPercent.permissionHint}
            errorMessage={data.foodCostPercent.errorMessage}
            openTo="/dashboard/menu"
          >
            {data.foodCostPercent.data !== undefined ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xl font-bold">{formatPercent(data.foodCostPercent.data)}</span>
                  {foodCostTrendBadge}
                </div>
                {data.menuOpenAlerts.status === "success" ? (
                  <MetricRow label={t("executive.dashboard.metrics.openMenuAlerts")} value={data.menuOpenAlerts.data ?? 0} />
                ) : null}
              </div>
            ) : null}
          </ExecutiveWidgetCard>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("executive.dashboard.sections.notifications")}</h2>
        <ExecutiveWidgetCard
          title={t("executive.dashboard.widgets.alertSummary.title")}
          description={t("executive.dashboard.widgets.alertSummary.description")}
          status={data.notifications.status}
          permissionHint={data.notifications.permissionHint}
          errorMessage={data.notifications.errorMessage}
          openTo="/notifications"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
            <div className="space-y-2">
              <MetricRow label={t("executive.dashboard.metrics.critical")} value={criticalCount} />
              <MetricRow label={t("executive.dashboard.metrics.warning")} value={warningCount} />
              <MetricRow label={t("executive.dashboard.metrics.unread")} value={unreadCount} />
            </div>
            <div className="space-y-4">
              {Object.entries(notificationsByGroup).map(([group, items]) => (
                <div key={group}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{group}</p>
                  <ul className="space-y-1 text-sm">
                    {items.slice(0, 3).map((n) => (
                      <li key={n.id} className="flex items-start justify-between gap-2">
                        <span className="truncate">{n.title}</span>
                        <Badge variant={n.severity === "critical" ? "destructive" : "secondary"} className="shrink-0 text-[10px]">
                          {n.severity}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {(data.notifications.data?.data.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">{t("executive.dashboard.empty.noRecentNotifications")}</p>
              ) : null}
            </div>
          </div>
        </ExecutiveWidgetCard>
      </section>
    </div>
  );
}
