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

function groupLabel(source: UserNotificationSourceModule): string {
  if (APPROVAL_SOURCES.has(source)) return "Approvals";
  if (source === "menu_intelligence") return "Menu";
  if (source === "inventory") return "Inventory";
  if (source === "accounting") return "Accounting";
  if (source === "payments") return "Payments";
  return source;
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
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 py-4">
        <span className="text-sm font-medium">Critical Alerts</span>
        {loading ? (
          <Badge variant="outline">Loading…</Badge>
        ) : (
          <>
            <Badge variant="destructive">{criticalCount} Critical</Badge>
            <Badge className="bg-warning/15 text-warning border-warning/30">{warningCount} Warning</Badge>
            <Badge variant="secondary">{unreadCount} Unread</Badge>
          </>
        )}
        <Button variant="link" size="sm" className="ml-auto px-0" asChild>
          <Link to="/notifications">View Notification Center</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ExecutiveDashboard() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const data = useExecutiveDashboardData(activeOutletId, hasPermission);

  const criticalCount = data.criticalNotifications.data?.length ?? 0;
  const warningCount = data.warningNotifications.data?.length ?? 0;
  const unreadCount = data.unreadCount.data ?? 0;

  if (typeof activeOutletId !== "number" || activeOutletId < 1) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Owner Control Tower</h1>
        <p className="text-sm text-muted-foreground mt-2">Select an outlet to load the executive dashboard.</p>
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
    if (pct > 45) return <Badge variant="destructive">High</Badge>;
    if (pct > 40) return <Badge className="bg-warning/15 text-warning border-warning/30">Elevated</Badge>;
    return <Badge variant="outline">On Target</Badge>;
  })();

  const notificationsByGroup = (data.notifications.data?.data ?? []).reduce<Record<string, UserNotification[]>>(
    (acc, item) => {
      const key = groupLabel(item.sourceModule);
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
          <h1 className="text-2xl font-bold tracking-tight">Owner Control Tower</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cross-functional overview — sales, finance, operations, commercial performance, and alerts.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => data.refetchAll()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
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
        <h2 className="text-lg font-semibold">Financial</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <ExecutiveWidgetCard
            title="Executive Sales"
            description="Today — gross, net, and refunds"
            status={data.sales.status}
            permissionHint={data.sales.permissionHint}
            errorMessage={data.sales.errorMessage}
            openTo="/reports/executive-sales"
          >
            {sales ? (
              <div className="space-y-2">
                <MetricRow label="Gross Sales" value={formatMoney(sales.grossSales)} />
                <MetricRow label="Net Sales" value={formatMoney(sales.netSales)} />
                <MetricRow label="Refund Amount" value={formatMoney(sales.refundAmount)} />
                <MetricRow label="Refund Count" value={sales.refundCount} />
              </div>
            ) : null}
          </ExecutiveWidgetCard>

          <ExecutiveWidgetCard
            title="Accounting Health"
            description="Posting integrity and reconciliation signals"
            status={data.accountingHealth.status}
            permissionHint={data.accountingHealth.permissionHint}
            errorMessage={data.accountingHealth.errorMessage}
            openTo="/accounting?tab=health"
          >
            {data.accountingHealth.data ? (
              <div className="space-y-2">
                <MetricRow label="Health Score" value={data.accountingHealth.data.healthScore} />
                <MetricRow label="Severity" value={data.accountingHealth.data.healthSeverity ?? "—"} />
                <MetricRow label="Failed Postings" value={data.accountingHealth.data.failedPostings} />
                <MetricRow
                  label="Priority Queue"
                  value={data.accountingHealth.data.priorityQueue?.length ?? 0}
                />
              </div>
            ) : null}
          </ExecutiveWidgetCard>

          <ExecutiveWidgetCard
            title="Gift Card Liability"
            description="Gift card and store credit GL tie-out"
            status={data.giftCardLiability.status}
            permissionHint={data.giftCardLiability.permissionHint}
            errorMessage={data.giftCardLiability.errorMessage}
            openTo="/accounting?tab=recon"
          >
            {data.giftCardLiability.data ? (
              <div className="space-y-2">
                <MetricRow
                  label="Gift Card Liability"
                  value={formatMoney(data.giftCardLiability.data.giftCardLiabilityBalance ?? 0)}
                />
                <MetricRow
                  label="Store Credit Liability"
                  value={formatMoney(data.giftCardLiability.data.storeCreditLiabilityBalance ?? 0)}
                />
                <MetricRow label="Status" value={data.giftCardLiability.data.status} />
              </div>
            ) : null}
          </ExecutiveWidgetCard>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Operations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExecutiveDashboardSystemHealthWidget />

          <ExecutiveInventoryReliabilityWidget />

          <ExecutiveShiftCloseWidget />

          <ExecutiveCustomerOrderingWidget />

          <ExecutiveWidgetCard
            title="Payment Health"
            description="Gateway reliability and incidents"
            status={data.paymentHealth.status}
            permissionHint={data.paymentHealth.permissionHint}
            errorMessage={data.paymentHealth.errorMessage}
            openTo="/settings/payments/health"
          >
            {data.paymentHealth.data ? (
              <div className="space-y-2">
                <MetricRow label="Severity" value={data.paymentHealth.data.healthSeverity ?? "—"} />
                <MetricRow
                  label="Success Rate"
                  value={
                    data.paymentHealth.data.paymentSuccessRate !== undefined
                      ? formatPercent(data.paymentHealth.data.paymentSuccessRate)
                      : "—"
                  }
                />
                <MetricRow label="Failed Webhooks" value={data.paymentHealth.data.failedWebhooks ?? 0} />
                <MetricRow label="Open Incidents" value={data.paymentHealth.data.openIncidents ?? 0} />
              </div>
            ) : null}
          </ExecutiveWidgetCard>

          <ExecutiveWidgetCard
            title="Audit Activity"
            description="Today's audit events and critical changes"
            status={data.auditActivity.status}
            permissionHint={data.auditActivity.permissionHint}
            errorMessage={data.auditActivity.errorMessage}
            openTo="/system/audit"
          >
            {data.auditActivity.data ? (
              <div className="space-y-2">
                <MetricRow label="Today's Events" value={data.auditActivity.data.todayEvents} />
                <MetricRow label="Critical Events" value={data.auditActivity.data.criticalEvents} />
                <MetricRow label="Active Users" value={data.auditActivity.data.activeUsers} />
              </div>
            ) : null}
          </ExecutiveWidgetCard>

          <ExecutiveWidgetCard
            title="Operational Monitoring"
            description="Kitchen, payments, printer, bridge, and sync"
            status={data.monitoring.status}
            permissionHint={data.monitoring.permissionHint}
            errorMessage={data.monitoring.errorMessage}
            openTo="/"
          >
            {monitoring ? (
              <div className="space-y-2">
                <MetricRow
                  label="Kitchen Queue"
                  value={monitoring.kitchen.queued + monitoring.kitchen.inProgress}
                />
                <MetricRow label="Pending Payments" value={monitoring.pendingPayments} />
                <MetricRow label="Active Sessions" value={monitoring.activeSessions} />
                <MetricRow label="Printer Failures" value={monitoring.printerQueue.failed} />
                <MetricRow label="Hardware Bridge Issues" value={monitoring.hardware.staleBridges} />
                <MetricRow label="Offline Sync Failures" value={monitoring.offlineSync.failures} />
              </div>
            ) : null}
          </ExecutiveWidgetCard>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Commercial</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <ExecutiveWidgetCard
            title="Loyalty Overview"
            description="Last 30 days"
            status={data.loyalty.status}
            permissionHint={data.loyalty.permissionHint}
            errorMessage={data.loyalty.errorMessage}
            openTo="/loyalty-programs"
          >
            {loyaltySummary ? (
              <div className="space-y-2">
                <MetricRow label="Active Customers" value={loyaltySummary.activeMembers} />
                <MetricRow label="Repeat Visit Rate" value={formatPercent(loyaltySummary.repeatCustomerRate)} />
                <MetricRow
                  label="Voucher Redemption Rate"
                  value={formatPercent(data.loyalty.data?.voucherAnalytics.voucherRedemptionRate ?? 0)}
                />
              </div>
            ) : null}
          </ExecutiveWidgetCard>

          <ExecutiveWidgetCard
            title="Top Customers"
            description="Top 5 members by spend"
            status={data.loyalty.status}
            permissionHint={data.loyalty.permissionHint}
            errorMessage={data.loyalty.errorMessage}
            openTo="/customers"
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
              <p className="text-sm text-muted-foreground">No member data.</p>
            )}
          </ExecutiveWidgetCard>

          <ExecutiveWidgetCard
            title="Top Products"
            description="Today — from executive sales"
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
              <p className="text-sm text-muted-foreground">No product data.</p>
            )}
          </ExecutiveWidgetCard>

          <ExecutiveWidgetCard
            title="Food Cost"
            description="Menu analytics average"
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
                  <MetricRow label="Open Menu Alerts" value={data.menuOpenAlerts.data ?? 0} />
                ) : null}
              </div>
            ) : null}
          </ExecutiveWidgetCard>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <ExecutiveWidgetCard
          title="Alert Summary"
          description="Latest notifications across domains"
          status={data.notifications.status}
          permissionHint={data.notifications.permissionHint}
          errorMessage={data.notifications.errorMessage}
          openTo="/notifications"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
            <div className="space-y-2">
              <MetricRow label="Critical" value={criticalCount} />
              <MetricRow label="Warning" value={warningCount} />
              <MetricRow label="Unread" value={unreadCount} />
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
                <p className="text-sm text-muted-foreground">No recent notifications.</p>
              ) : null}
            </div>
          </div>
        </ExecutiveWidgetCard>
      </section>
    </div>
  );
}
