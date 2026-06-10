import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  getAccountingHealth,
  getAccountingHealthTrends,
  type AccountingHealth,
  type AccountingHealthTrends,
} from "@/lib/api-integration/accountingEndpoints";
import { getAuditCenterSummary, type AuditCenterSummary } from "@/lib/api-integration/auditCenterEndpoints";
import { listBugReports, type BugReportRow } from "@/lib/api-integration/bugReportEndpoints";
import {
  getFailedJobsSummary,
  getFailedJobsTrends,
  type FailedJobSnapshot,
  type FailedJobSummary,
} from "@/lib/api-integration/failedJobsEndpoints";
import { getMenuDashboardSummary, type DashboardSummary } from "@/lib/api-integration/menuDashboardEndpoints";
import {
  getUserNotificationUnreadCount,
  listUserNotifications,
  type ListNotificationsResponse,
  type UserNotification,
} from "@/lib/api-integration/notificationEndpoints";
import {
  getPaymentHealth,
  getPaymentHealthTrends,
  type PaymentHealthReport,
  type PaymentHealthTrends,
} from "@/lib/api-integration/paymentEndpoints";
import { ApiHttpError } from "@/lib/api-integration/client";
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
import { buildSystemIncidentTimeline, type SystemIncidentItem } from "@/lib/system-health/systemHealthIncidents";
import { buildSystemPriorityQueue, type SystemPriorityAction } from "@/lib/system-health/systemHealthPriorityQueue";

const STALE_TIME_MS = 60_000;

export type SystemHealthWidgetStatus = "loading" | "restricted" | "success" | "error";

function last30Days(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function isForbidden(error: unknown): boolean {
  return error instanceof ApiHttpError && (error.status === 403 || error.status === 401);
}

export type BugReportCounts = {
  open: number;
  critical: number;
  investigating: number;
  fixedToday: number;
};

export type SystemHealthData = {
  loading: boolean;
  refetchAll: () => void;
  score: number;
  severity: SystemHealthSeverity;
  scorePartial: boolean;
  activeIncidents: number;
  accounting: { status: SystemHealthWidgetStatus; data?: AccountingHealth; error?: string };
  payment: { status: SystemHealthWidgetStatus; data?: PaymentHealthReport; error?: string };
  failedJobs: { status: SystemHealthWidgetStatus; data?: FailedJobSummary; error?: string };
  bugReports: { status: SystemHealthWidgetStatus; counts?: BugReportCounts; recent?: BugReportRow[]; error?: string };
  notifications: {
    status: SystemHealthWidgetStatus;
    critical?: UserNotification[];
    unreadCount?: number;
    bySource?: Record<string, number>;
    error?: string;
  };
  audit: { status: SystemHealthWidgetStatus; data?: AuditCenterSummary; error?: string };
  inventoryAlerts: { status: SystemHealthWidgetStatus; count?: number; items?: UserNotification[]; error?: string };
  menuAlerts: { status: SystemHealthWidgetStatus; summary?: DashboardSummary["automation"]; error?: string };
  incidents: SystemIncidentItem[];
  priorityQueue: SystemPriorityAction[];
  trends: {
    failedJobs: FailedJobSnapshot[];
    payment: PaymentHealthTrends | null;
    accounting: AccountingHealthTrends | null;
    bugVolume: { date: string; count: number }[];
    systemScore: { date: string; score: number }[];
  };
};

async function fetchBugReportCounts(): Promise<BugReportCounts> {
  const [openRes, criticalRes, investigatingRes, fixedRes] = await Promise.all([
    listBugReports({ status: "open", limit: 1 }),
    listBugReports({ severity: "critical", limit: 50 }),
    listBugReports({ status: "investigating", limit: 1 }),
    listBugReports({ status: "fixed", limit: 50 }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const fixedToday = fixedRes.data.filter(
    (r) => r.resolvedAt?.slice(0, 10) === today || r.updatedAt?.slice(0, 10) === today,
  ).length;

  const openCritical = criticalRes.data.filter(
    (r) => r.status !== "closed" && r.status !== "wont_fix" && r.status !== "fixed",
  ).length;

  return {
    open: openRes.meta.total + investigatingRes.meta.total,
    critical: openCritical,
    investigating: investigatingRes.meta.total,
    fixedToday,
  };
}

export function useSystemHealthData(
  outletId: number | null | undefined,
  hasPermission: (perm: string) => boolean,
): SystemHealthData {
  const scopedOutletId = typeof outletId === "number" && outletId >= 1 ? outletId : null;
  const range = last30Days();

  const canSettings = hasPermission(PERMISSIONS.SETTINGS);
  const canAccounting = hasPermission(PERMISSIONS.ACCOUNTING);
  const canMenuDashboard = hasPermission(PERMISSIONS.MENU_DASHBOARD);
  const canNotifications = scopedOutletId !== null;

  const queries = useQueries({
    queries: [
      {
        queryKey: ["system-health", "accounting", scopedOutletId],
        queryFn: () => getAccountingHealth({ outletId: scopedOutletId ?? undefined }),
        enabled: canAccounting && scopedOutletId !== null,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: ["system-health", "payment", scopedOutletId],
        queryFn: () => getPaymentHealth({ outletId: scopedOutletId ?? undefined }),
        enabled: canSettings && scopedOutletId !== null,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: ["system-health", "failed-jobs"],
        queryFn: () => getFailedJobsSummary(),
        enabled: canSettings,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: ["system-health", "bug-counts"],
        queryFn: () => fetchBugReportCounts(),
        enabled: canSettings,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: ["system-health", "bug-critical-list"],
        queryFn: async () => {
          const res = await listBugReports({ severity: "critical", limit: 10 });
          return res.data.filter((r) => !["closed", "wont_fix", "fixed"].includes(r.status));
        },
        enabled: canSettings,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: ["system-health", "notifications-critical", scopedOutletId],
        queryFn: async () => {
          const res = await listUserNotifications({
            outletId: scopedOutletId ?? undefined,
            severity: "critical",
            limit: 50,
          });
          return res.data;
        },
        enabled: canNotifications,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: ["system-health", "notifications-unread", scopedOutletId],
        queryFn: () => getUserNotificationUnreadCount(scopedOutletId),
        enabled: canNotifications,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: ["system-health", "notifications-recent", scopedOutletId],
        queryFn: (): Promise<ListNotificationsResponse> =>
          listUserNotifications({ outletId: scopedOutletId ?? undefined, limit: 50 }),
        enabled: canNotifications,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: ["system-health", "inventory-alerts", scopedOutletId],
        queryFn: async () => {
          const res = await listUserNotifications({
            outletId: scopedOutletId ?? undefined,
            source: "inventory",
            severity: "critical",
            limit: 20,
          });
          return res;
        },
        enabled: canNotifications,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: ["system-health", "menu-alerts-nc", scopedOutletId],
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
        queryKey: ["system-health", "audit", scopedOutletId],
        queryFn: () => getAuditCenterSummary(scopedOutletId ?? undefined),
        enabled: canSettings && scopedOutletId !== null,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: ["system-health", "menu-dashboard", scopedOutletId],
        queryFn: () => getMenuDashboardSummary(scopedOutletId!),
        enabled: canMenuDashboard && scopedOutletId !== null,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: ["system-health", "failed-jobs-trends", range.startDate],
        queryFn: () => getFailedJobsTrends(range),
        enabled: canSettings,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: ["system-health", "payment-trends", scopedOutletId, range.startDate],
        queryFn: () =>
          getPaymentHealthTrends({
            outletId: scopedOutletId ?? undefined,
            startDate: range.startDate,
            endDate: range.endDate,
          }),
        enabled: canSettings && scopedOutletId !== null,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: ["system-health", "accounting-trends", scopedOutletId, range.startDate],
        queryFn: () =>
          getAccountingHealthTrends({
            outletId: scopedOutletId ?? undefined,
            startDate: range.startDate,
            endDate: range.endDate,
          }),
        enabled: canAccounting && scopedOutletId !== null,
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
    unreadQ,
    recentNotifQ,
    inventoryQ,
    menuNcQ,
    auditQ,
    menuDashQ,
    failedTrendsQ,
    paymentTrendsQ,
    accountingTrendsQ,
  ] = queries;

  const refetchAll = () => {
    for (const q of queries) void q.refetch();
  };

  const loading = queries.some((q) => q.isLoading && q.fetchStatus !== "idle");

  const widgetStatus = <T,>(
    enabled: boolean,
    q: { isLoading: boolean; isError: boolean; error: unknown; data?: T },
  ): { status: SystemHealthWidgetStatus; data?: T; error?: string } => {
    if (!enabled) return { status: "restricted" };
    if (q.isLoading) return { status: "loading" };
    if (q.isError) {
      if (isForbidden(q.error)) return { status: "restricted" };
      return {
        status: "error",
        error: q.error instanceof Error ? q.error.message : "Failed to load",
      };
    }
    return { status: "success", data: q.data };
  };

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
      bugReportsScore:
        canSettings && bugCounts ? bugReportsToScore(bugCounts.open, bugCounts.critical) : null,
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
          : canNotifications && menuNcQ.data
            ? menuAlertsToScore(menuNcQ.data.length, menuNcQ.data.filter((n) => n.severity === "critical").length)
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
    menuNcQ.data,
    canAccounting,
    canSettings,
    canNotifications,
    canMenuDashboard,
  ]);

  const notificationsBySource = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of recentNotifQ.data?.data ?? []) {
      counts[n.sourceModule] = (counts[n.sourceModule] ?? 0) + 1;
    }
    return counts;
  }, [recentNotifQ.data]);

  const bugVolumeTrend = useMemo(() => {
    const byDay: Record<string, number> = {};
    for (const n of recentNotifQ.data?.data ?? []) {
      if (n.sourceType.includes("bug_report") && n.createdAt) {
        const day = n.createdAt.slice(0, 10);
        byDay[day] = (byDay[day] ?? 0) + 1;
      }
    }
    return Object.entries(byDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [recentNotifQ.data]);

  const incidents = useMemo(
    () =>
      buildSystemIncidentTimeline({
        paymentHealth: paymentQ.data,
        accountingHealth: accountingQ.data,
        failedJobs: failedJobsQ.data,
        criticalBugs: bugCriticalQ.data,
        inventoryAlerts: inventoryQ.data?.data,
        menuAlerts: menuNcQ.data,
        auditSummary: auditQ.data,
      }),
    [paymentQ.data, accountingQ.data, failedJobsQ.data, bugCriticalQ.data, inventoryQ.data, menuNcQ.data, auditQ.data],
  );

  const priorityQueue = useMemo(
    () =>
      buildSystemPriorityQueue({
        paymentHealth: paymentQ.data,
        accountingHealth: accountingQ.data,
        failedJobs: failedJobsQ.data,
        openCriticalBugs: bugCounts?.critical,
        inventoryCriticalAlerts: inventoryQ.data?.meta.total,
        menuOpenAlerts: menuDashQ.data?.automation.openAlerts ?? menuNcQ.data?.length,
        unreadNotifications: unreadQ.data?.count,
      }),
    [paymentQ.data, accountingQ.data, failedJobsQ.data, bugCounts, inventoryQ.data, menuDashQ.data, menuNcQ.data, unreadQ.data],
  );

  const activeIncidents = incidents.filter((i) => i.severity === "critical" || i.severity === "high").length;

  const accountingW = widgetStatus(canAccounting && scopedOutletId !== null, accountingQ);
  const paymentW = widgetStatus(canSettings && scopedOutletId !== null, paymentQ);
  const failedJobsW = widgetStatus(canSettings, failedJobsQ);
  const bugW = widgetStatus(canSettings, bugCountsQ);
  const auditW = widgetStatus(canSettings && scopedOutletId !== null, auditQ);
  const inventoryW = widgetStatus(canNotifications, inventoryQ);
  const menuW = widgetStatus(canMenuDashboard && scopedOutletId !== null, menuDashQ);

  return {
    loading,
    refetchAll,
    score: healthScore.score,
    severity: healthScore.severity,
    scorePartial: healthScore.partial,
    activeIncidents,
    accounting: { status: accountingW.status, data: accountingW.data, error: accountingW.error },
    payment: { status: paymentW.status, data: paymentW.data, error: paymentW.error },
    failedJobs: { status: failedJobsW.status, data: failedJobsW.data, error: failedJobsW.error },
    bugReports: {
      status: bugW.status,
      counts: bugCounts,
      recent: bugCriticalQ.data,
      error: bugW.error,
    },
    notifications: {
      status: canNotifications ? (criticalNotifQ.isLoading ? "loading" : "success") : "restricted",
      critical: criticalNotifications,
      unreadCount: unreadQ.data?.count,
      bySource: notificationsBySource,
      error: criticalNotifQ.isError ? "Failed to load notifications" : undefined,
    },
    audit: { status: auditW.status, data: auditW.data, error: auditW.error },
    inventoryAlerts: {
      status: inventoryW.status,
      count: inventoryQ.data?.meta.total,
      items: inventoryQ.data?.data,
      error: inventoryW.error,
    },
    menuAlerts: {
      status: menuW.status,
      summary: menuDashQ.data?.automation,
      error: menuW.error,
    },
    incidents,
    priorityQueue,
    trends: {
      failedJobs: failedTrendsQ.data ?? [],
      payment: paymentTrendsQ.data ?? null,
      accounting: accountingTrendsQ.data ?? null,
      bugVolume: bugVolumeTrend,
      systemScore: (failedTrendsQ.data ?? []).map((s) => ({
        date: s.snapshotDate,
        score: Math.max(0, 100 - s.totalFailures * 2),
      })),
    },
  };
}
