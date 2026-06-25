import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  getAccountingHealth,
  type AccountingHealth,
} from "@/lib/api-integration/accountingEndpoints";
import { getAuditCenterSummary } from "@/lib/api-integration/auditCenterEndpoints";
import { listBugReports } from "@/lib/api-integration/bugReportEndpoints";
import {
  getFailedJobsSummary,
  type FailedJobSummary,
} from "@/lib/api-integration/failedJobsEndpoints";
import { getMenuDashboardSummary } from "@/lib/api-integration/menuDashboardEndpoints";
import {
  getPaymentHealth,
  type PaymentHealthReport,
} from "@/lib/api-integration/paymentEndpoints";
import { listUserNotifications } from "@/lib/api-integration/notificationEndpoints";
import { PERMISSIONS } from "@/stores/authStore";
import { criticalAlertCountToScore } from "@/lib/executive/executiveScore";
import {
  accountingHealthToScore,
  bugReportsToScore,
  computeSystemHealthScore,
  failedJobsToScore,
  inventoryAlertsToScore,
  menuAlertsToScore,
  paymentHealthToScore,
  type SystemHealthSeverity,
} from "@/lib/system-health/systemHealthScore";
import { buildSystemIncidentTimeline } from "@/lib/system-health/systemHealthIncidents";
import { executiveQueryKeys } from "@/hooks/executive/executiveQueryKeys";
import { fetchBugReportCounts, type BugReportCounts } from "@/hooks/system-health/bugReportCounts";

const STALE_TIME_MS = 60_000;

export type ExecutiveSystemHealthSummary = {
  loading: boolean;
  score: number;
  severity: SystemHealthSeverity;
  scorePartial: boolean;
  activeIncidents: number;
  bugReports: { counts?: BugReportCounts };
  failedJobs: { data?: FailedJobSummary };
};

export function useExecutiveSystemHealthSummary(
  outletId: number | null | undefined,
  hasPermission: (perm: string) => boolean,
): ExecutiveSystemHealthSummary {
  const scopedOutletId = typeof outletId === "number" && outletId >= 1 ? outletId : null;

  const canSettings = hasPermission(PERMISSIONS.SETTINGS);
  const canAccounting = hasPermission(PERMISSIONS.ACCOUNTING);
  const canMenuDashboard = hasPermission(PERMISSIONS.MENU_DASHBOARD);
  const canNotifications = scopedOutletId !== null;

  const queries = useQueries({
    queries: [
      {
        queryKey: executiveQueryKeys.accountingHealth(scopedOutletId),
        queryFn: () => getAccountingHealth({ outletId: scopedOutletId ?? undefined }),
        enabled: canAccounting && scopedOutletId !== null,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: executiveQueryKeys.paymentHealth(scopedOutletId),
        queryFn: () => getPaymentHealth({ outletId: scopedOutletId ?? undefined }),
        enabled: canSettings && scopedOutletId !== null,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: executiveQueryKeys.failedJobsSummary(),
        queryFn: () => getFailedJobsSummary(),
        enabled: canSettings,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: executiveQueryKeys.bugReportCounts(),
        queryFn: () => fetchBugReportCounts(),
        enabled: canSettings,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: executiveQueryKeys.bugReportsCritical(),
        queryFn: async () => {
          const res = await listBugReports({ severity: "critical", limit: 10 });
          return res.data.filter((r) => !["closed", "wont_fix", "fixed"].includes(r.status));
        },
        enabled: canSettings,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: executiveQueryKeys.notificationsList(scopedOutletId, "critical:50"),
        queryFn: async () => {
          const res = await listUserNotifications({
            outletId: scopedOutletId ?? undefined,
            severity: "critical",
            limit: 50,
            page: 1,
          });
          return res.data;
        },
        enabled: canNotifications,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: executiveQueryKeys.inventoryNotificationAlerts(scopedOutletId),
        queryFn: () =>
          listUserNotifications({
            outletId: scopedOutletId ?? undefined,
            source: "inventory",
            severity: "critical",
            limit: 20,
          }),
        enabled: canNotifications,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: executiveQueryKeys.notificationsList(scopedOutletId, "menu-intelligence:20"),
        queryFn: async () => {
          const res = await listUserNotifications({
            outletId: scopedOutletId ?? undefined,
            source: "menu_intelligence",
            limit: 20,
          });
          return res.data;
        },
        enabled: canNotifications,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: executiveQueryKeys.auditCenterSummary(scopedOutletId),
        queryFn: () => getAuditCenterSummary(scopedOutletId ?? undefined),
        enabled: canSettings && scopedOutletId !== null,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: executiveQueryKeys.menuDashboardSummary(scopedOutletId),
        queryFn: () => getMenuDashboardSummary(scopedOutletId!),
        enabled: canMenuDashboard && scopedOutletId !== null,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
    ],
  });

  const [
    accountingQ,
    paymentQ,
    failedJobsQ,
    bugCountsQ,
    bugCriticalQ,
    criticalNotifQ,
    inventoryQ,
    menuNcQ,
    auditQ,
    menuDashQ,
  ] = queries;

  const loading = queries.some((q) => q.isLoading && q.fetchStatus !== "idle");
  const bugCounts = bugCountsQ.data;
  const criticalNotifications = criticalNotifQ.data ?? [];

  const healthScore = useMemo(() => {
    return computeSystemHealthScore({
      accountingScore:
        canAccounting && accountingQ.data
          ? accountingHealthToScore(accountingQ.data.healthScore, accountingQ.data.healthSeverity)
          : null,
      paymentScore:
        canSettings && paymentQ.data
          ? paymentHealthToScore(paymentQ.data.reliabilityScore, paymentQ.data.healthSeverity)
          : null,
      failedJobsScore: canSettings && failedJobsQ.data ? failedJobsToScore(failedJobsQ.data) : null,
      bugReportsScore: canSettings && bugCounts ? bugReportsToScore(bugCounts.open, bugCounts.critical) : null,
      criticalNotificationsScore: canNotifications
        ? criticalAlertCountToScore(criticalNotifications.length)
        : null,
      inventoryAlertsScore: canNotifications
        ? inventoryAlertsToScore(inventoryQ.data?.meta.total ?? 0)
        : null,
      menuAlertsScore:
        canMenuDashboard && menuDashQ.data
          ? menuAlertsToScore(
              menuDashQ.data.automation.openAlerts,
              menuDashQ.data.automation.criticalAlerts,
            )
          : null,
    });
  }, [
    accountingQ.data,
    paymentQ.data,
    failedJobsQ.data,
    bugCounts,
    criticalNotifications.length,
    inventoryQ.data,
    menuDashQ.data,
    canAccounting,
    canSettings,
    canNotifications,
    canMenuDashboard,
  ]);

  const activeIncidents = useMemo(() => {
    const incidents = buildSystemIncidentTimeline({
      paymentHealth: paymentQ.data as PaymentHealthReport | undefined,
      accountingHealth: accountingQ.data as AccountingHealth | undefined,
      failedJobs: failedJobsQ.data,
      criticalBugs: bugCriticalQ.data,
      inventoryAlerts: inventoryQ.data?.data,
      menuAlerts: menuNcQ.data,
      auditSummary: auditQ.data,
    });
    return incidents.filter((i) => i.severity === "critical" || i.severity === "high").length;
  }, [paymentQ.data, accountingQ.data, failedJobsQ.data, bugCriticalQ.data, inventoryQ.data, menuNcQ.data, auditQ.data]);

  return {
    loading,
    score: healthScore.score,
    severity: healthScore.severity,
    scorePartial: healthScore.partial,
    activeIncidents,
    bugReports: { counts: bugCounts },
    failedJobs: { data: failedJobsQ.data },
  };
}
