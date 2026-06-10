import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { fetchExecutiveSalesReport } from "@/lib/api-integration/reportingEndpoints";
import {
  getAccountingHealth,
  getGiftCardReconciliation,
  type AccountingHealth,
  type GiftCardReconciliationReport,
} from "@/lib/api-integration/accountingEndpoints";
import { getPaymentHealth, type PaymentHealthReport } from "@/lib/api-integration/paymentEndpoints";
import { getOperationalMetrics } from "@/lib/api-integration/monitoringEndpoints";
import { fetchLoyaltyAnalyticsDashboard, type LoyaltyAnalyticsDashboard } from "@/lib/api-integration/loyaltyEngineEndpoints";
import { getExecutiveAnalytics, getMenuDashboardSummary } from "@/lib/api-integration/menuDashboardEndpoints";
import {
  getUserNotificationUnreadCount,
  listUserNotifications,
  type ListNotificationsResponse,
  type UserNotification,
} from "@/lib/api-integration/notificationEndpoints";
import { getAuditCenterSummary, type AuditCenterSummary } from "@/lib/api-integration/auditCenterEndpoints";
import { ApiHttpError } from "@/lib/api-integration/client";
import { PERMISSIONS } from "@/stores/authStore";
import type { ExecutiveWidgetStatus } from "@/components/executive/ExecutiveWidgetCard";
import type { OperationalMetricsViewModel } from "@/domain/monitoring/types";
import type { ExecutiveSalesReport } from "@/lib/api-integration/reportingEndpoints";
import {
  computeCommercialPillarScore,
  computeExecutiveScore,
  criticalAlertCountToScore,
  severityToScore,
  type ExecutiveScoreResult,
} from "@/lib/executive/executiveScore";

const STALE_TIME_MS = 60_000;

export type ExecutiveWidgetState<T> = {
  status: ExecutiveWidgetStatus;
  data?: T;
  permissionHint?: string;
  errorMessage?: string;
};

function todayRange(): { startDate: string; endDate: string } {
  const today = new Date().toISOString().slice(0, 10);
  return { startDate: today, endDate: today };
}

function last30DaysRange(): { startDate: string; endDate: string } {
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

function resolveWidgetState<T>(
  enabled: boolean,
  permissionHint: string,
  isLoading: boolean,
  isError: boolean,
  error: unknown,
  data: T | undefined,
  isEmpty?: (value: T) => boolean,
): ExecutiveWidgetState<T> {
  if (!enabled) {
    return { status: "restricted", permissionHint };
  }
  if (isLoading) {
    return { status: "loading" };
  }
  if (isError) {
    if (isForbidden(error)) {
      return { status: "restricted", permissionHint };
    }
    return {
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Failed to load data",
    };
  }
  if (data === undefined || (isEmpty?.(data) ?? false)) {
    return { status: "empty" };
  }
  return { status: "success", data };
}

export type ExecutiveDashboardData = {
  sales: ExecutiveWidgetState<ExecutiveSalesReport>;
  accountingHealth: ExecutiveWidgetState<AccountingHealth>;
  giftCardLiability: ExecutiveWidgetState<GiftCardReconciliationReport>;
  paymentHealth: ExecutiveWidgetState<PaymentHealthReport>;
  monitoring: ExecutiveWidgetState<OperationalMetricsViewModel>;
  loyalty: ExecutiveWidgetState<LoyaltyAnalyticsDashboard>;
  foodCostPercent: ExecutiveWidgetState<number>;
  menuOpenAlerts: ExecutiveWidgetState<number>;
  menuCriticalAlerts: ExecutiveWidgetState<number>;
  notifications: ExecutiveWidgetState<ListNotificationsResponse>;
  unreadCount: ExecutiveWidgetState<number>;
  criticalNotifications: ExecutiveWidgetState<UserNotification[]>;
  warningNotifications: ExecutiveWidgetState<UserNotification[]>;
  auditActivity: ExecutiveWidgetState<AuditCenterSummary>;
  executiveScore: ExecutiveScoreResult;
  scoreLoading: boolean;
  refetchAll: () => void;
};

export function useExecutiveDashboardData(
  outletId: number | null | undefined,
  hasPermission: (perm: string) => boolean,
): ExecutiveDashboardData {
  const scopedOutletId = typeof outletId === "number" && outletId >= 1 ? outletId : null;
  const today = todayRange();
  const loyaltyRange = last30DaysRange();

  const canSales = hasPermission(PERMISSIONS.REPORTS);
  const canAccounting = hasPermission(PERMISSIONS.ACCOUNTING);
  const canPayment = hasPermission(PERMISSIONS.SETTINGS);
  const canMonitoring = hasPermission(PERMISSIONS.POS);
  const canLoyalty = hasPermission(PERMISSIONS.MEMBERS);
  const canMenuAnalytics = hasPermission("analytics.view");
  const canMenuDashboard = hasPermission(PERMISSIONS.MENU_DASHBOARD);
  const canNotifications = scopedOutletId !== null;
  const canAudit = hasPermission(PERMISSIONS.SETTINGS);

  const queries = useQueries({
    queries: [
      {
        queryKey: ["executive", "sales", scopedOutletId, today.startDate],
        queryFn: () =>
          fetchExecutiveSalesReport({
            outletId: scopedOutletId ?? undefined,
            startDate: today.startDate,
            endDate: today.endDate,
          }),
        enabled: canSales && scopedOutletId !== null,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: ["executive", "accounting-health", scopedOutletId],
        queryFn: () => getAccountingHealth({ outletId: scopedOutletId ?? undefined }),
        enabled: canAccounting && scopedOutletId !== null,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: ["executive", "gift-card", scopedOutletId],
        queryFn: () => getGiftCardReconciliation({ outletId: scopedOutletId ?? undefined }),
        enabled: canAccounting && scopedOutletId !== null,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: ["executive", "payment-health", scopedOutletId],
        queryFn: () => getPaymentHealth({ outletId: scopedOutletId ?? undefined }),
        enabled: canPayment && scopedOutletId !== null,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: ["executive", "monitoring", scopedOutletId],
        queryFn: () => getOperationalMetrics(scopedOutletId),
        enabled: canMonitoring && scopedOutletId !== null,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: ["executive", "loyalty", scopedOutletId, loyaltyRange.startDate],
        queryFn: () =>
          fetchLoyaltyAnalyticsDashboard({
            outletId: scopedOutletId!,
            fromDate: loyaltyRange.startDate,
            toDate: loyaltyRange.endDate,
          }),
        enabled: canLoyalty && scopedOutletId !== null,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: ["executive", "food-cost", scopedOutletId],
        queryFn: async () => {
          const analytics = await getExecutiveAnalytics(scopedOutletId!);
          return analytics.averageFoodCostPercent;
        },
        enabled: canMenuAnalytics && scopedOutletId !== null,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: ["executive", "menu-dashboard", scopedOutletId],
        queryFn: () => getMenuDashboardSummary(scopedOutletId!),
        enabled: canMenuDashboard && scopedOutletId !== null,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: ["executive", "notifications", scopedOutletId],
        queryFn: () =>
          listUserNotifications({
            outletId: scopedOutletId ?? undefined,
            limit: 10,
            page: 1,
          }),
        enabled: canNotifications,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: ["executive", "notifications-unread", scopedOutletId],
        queryFn: () => getUserNotificationUnreadCount(scopedOutletId),
        enabled: canNotifications,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: ["executive", "notifications-critical", scopedOutletId],
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
        queryKey: ["executive", "notifications-warning", scopedOutletId],
        queryFn: async () => {
          const res = await listUserNotifications({
            outletId: scopedOutletId ?? undefined,
            severity: "warning",
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
        queryKey: ["executive", "audit-activity", scopedOutletId],
        queryFn: () => getAuditCenterSummary(scopedOutletId ?? undefined),
        enabled: canAudit && scopedOutletId !== null,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
    ],
  });

  const [
    salesQ,
    accountingQ,
    giftCardQ,
    paymentQ,
    monitoringQ,
    loyaltyQ,
    foodCostQ,
    menuDashboardQ,
    notificationsQ,
    unreadQ,
    criticalQ,
    warningQ,
    auditQ,
  ] = queries;

  const refetchAll = () => {
    for (const query of queries) {
      void query.refetch();
    }
  };

  const menuOpenAlerts = menuDashboardQ.data?.automation.openAlerts;
  const menuCriticalAlerts = menuDashboardQ.data?.automation.criticalAlerts;

  const executiveScore = useMemo(() => {
    const financial =
      accountingQ.data?.healthScore !== undefined ? accountingQ.data.healthScore : null;

    const operations =
      paymentQ.data?.healthSeverity !== undefined
        ? severityToScore(paymentQ.data.healthSeverity)
        : null;

    const commercial = computeCommercialPillarScore(
      foodCostQ.data,
      menuOpenAlerts,
      menuCriticalAlerts,
    );

    const criticalCount = criticalQ.data?.length ?? 0;
    const alerts =
      criticalQ.isSuccess ? criticalAlertCountToScore(criticalCount) : null;

    return computeExecutiveScore({
      financial: canAccounting && financial !== null ? financial : null,
      operations: canPayment && operations !== null ? operations : null,
      commercial: commercial,
      alerts: canNotifications && alerts !== null ? alerts : null,
    });
  }, [
    accountingQ.data,
    paymentQ.data,
    foodCostQ.data,
    menuOpenAlerts,
    menuCriticalAlerts,
    criticalQ.data,
    criticalQ.isSuccess,
    canAccounting,
    canPayment,
    canNotifications,
  ]);

  const scoreLoading =
    (canAccounting && accountingQ.isLoading) ||
    (canPayment && paymentQ.isLoading) ||
    (canMenuAnalytics && foodCostQ.isLoading) ||
    (canMenuDashboard && menuDashboardQ.isLoading) ||
    (canNotifications && criticalQ.isLoading);

  return {
    sales: resolveWidgetState(
      canSales && scopedOutletId !== null,
      PERMISSIONS.REPORTS,
      salesQ.isLoading,
      salesQ.isError,
      salesQ.error,
      salesQ.data,
    ),
    accountingHealth: resolveWidgetState(
      canAccounting && scopedOutletId !== null,
      PERMISSIONS.ACCOUNTING,
      accountingQ.isLoading,
      accountingQ.isError,
      accountingQ.error,
      accountingQ.data,
    ),
    giftCardLiability: resolveWidgetState(
      canAccounting && scopedOutletId !== null,
      PERMISSIONS.ACCOUNTING,
      giftCardQ.isLoading,
      giftCardQ.isError,
      giftCardQ.error,
      giftCardQ.data,
    ),
    paymentHealth: resolveWidgetState(
      canPayment && scopedOutletId !== null,
      PERMISSIONS.SETTINGS,
      paymentQ.isLoading,
      paymentQ.isError,
      paymentQ.error,
      paymentQ.data,
    ),
    monitoring: resolveWidgetState(
      canMonitoring && scopedOutletId !== null,
      PERMISSIONS.POS,
      monitoringQ.isLoading,
      monitoringQ.isError,
      monitoringQ.error,
      monitoringQ.data,
    ),
    loyalty: resolveWidgetState(
      canLoyalty && scopedOutletId !== null,
      PERMISSIONS.MEMBERS,
      loyaltyQ.isLoading,
      loyaltyQ.isError,
      loyaltyQ.error,
      loyaltyQ.data,
    ),
    foodCostPercent: resolveWidgetState(
      canMenuAnalytics && scopedOutletId !== null,
      "analytics.view",
      foodCostQ.isLoading,
      foodCostQ.isError,
      foodCostQ.error,
      foodCostQ.data,
    ),
    menuOpenAlerts: resolveWidgetState(
      canMenuDashboard && scopedOutletId !== null,
      PERMISSIONS.MENU_DASHBOARD,
      menuDashboardQ.isLoading,
      menuDashboardQ.isError,
      menuDashboardQ.error,
      menuOpenAlerts,
      (v) => v === undefined,
    ),
    menuCriticalAlerts: resolveWidgetState(
      canMenuDashboard && scopedOutletId !== null,
      PERMISSIONS.MENU_DASHBOARD,
      menuDashboardQ.isLoading,
      menuDashboardQ.isError,
      menuDashboardQ.error,
      menuCriticalAlerts,
      (v) => v === undefined,
    ),
    notifications: resolveWidgetState(
      canNotifications,
      "authenticated user",
      notificationsQ.isLoading,
      notificationsQ.isError,
      notificationsQ.error,
      notificationsQ.data,
      (res) => res.data.length === 0,
    ),
    unreadCount: resolveWidgetState(
      canNotifications,
      "authenticated user",
      unreadQ.isLoading,
      unreadQ.isError,
      unreadQ.error,
      unreadQ.data,
    ),
    criticalNotifications: resolveWidgetState(
      canNotifications,
      "authenticated user",
      criticalQ.isLoading,
      criticalQ.isError,
      criticalQ.error,
      criticalQ.data,
    ),
    warningNotifications: resolveWidgetState(
      canNotifications,
      "authenticated user",
      warningQ.isLoading,
      warningQ.isError,
      warningQ.error,
      warningQ.data,
    ),
    auditActivity: resolveWidgetState(
      canAudit && scopedOutletId !== null,
      PERMISSIONS.SETTINGS,
      auditQ.isLoading,
      auditQ.isError,
      auditQ.error,
      auditQ.data,
    ),
    executiveScore,
    scoreLoading,
    refetchAll,
  };
}
