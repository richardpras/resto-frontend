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
import { PERMISSIONS, useAuthStore } from "@/stores/authStore";
import { canManagePlatformSettings } from "@/domain/permissionGates";
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
import { executiveQueryKeys } from "@/hooks/executive/executiveQueryKeys";

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

  const user = useAuthStore((s) => s.user);
  const canSales = hasPermission(PERMISSIONS.REPORTS);
  const canAccounting = hasPermission(PERMISSIONS.ACCOUNTING);
  const canPayment = canManagePlatformSettings(user);
  const canMonitoring = hasPermission(PERMISSIONS.POS);
  const canLoyalty = hasPermission(PERMISSIONS.MEMBERS);
  const canMenuAnalytics = hasPermission("analytics.view");
  const canMenuDashboard = hasPermission(PERMISSIONS.MENU_DASHBOARD);
  const canNotifications = scopedOutletId !== null;
  const canAudit = canManagePlatformSettings(user);
  const fetchFoodCostSeparately = canMenuAnalytics && !canMenuDashboard;

  const queries = useQueries({
    queries: [
      {
        queryKey: executiveQueryKeys.executiveSales(scopedOutletId, today.startDate, today.endDate),
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
        queryKey: executiveQueryKeys.accountingHealth(scopedOutletId),
        queryFn: () => getAccountingHealth({ outletId: scopedOutletId ?? undefined }),
        enabled: canAccounting && scopedOutletId !== null,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: executiveQueryKeys.giftCardReconciliation(scopedOutletId),
        queryFn: () => getGiftCardReconciliation({ outletId: scopedOutletId ?? undefined }),
        enabled: canAccounting && scopedOutletId !== null,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: executiveQueryKeys.paymentHealth(scopedOutletId),
        queryFn: () => getPaymentHealth({ outletId: scopedOutletId ?? undefined }),
        enabled: canPayment && scopedOutletId !== null,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: executiveQueryKeys.operationalMetrics(scopedOutletId),
        queryFn: () => getOperationalMetrics(scopedOutletId),
        enabled: canMonitoring && scopedOutletId !== null,
        staleTime: STALE_TIME_MS,
        retry: false,
      },
      {
        queryKey: executiveQueryKeys.loyaltyDashboard(scopedOutletId, loyaltyRange.startDate, loyaltyRange.endDate),
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
        queryKey: executiveQueryKeys.executiveAnalytics(scopedOutletId),
        queryFn: async () => {
          const analytics = await getExecutiveAnalytics(scopedOutletId!);
          return analytics.averageFoodCostPercent;
        },
        enabled: fetchFoodCostSeparately && scopedOutletId !== null,
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
      {
        queryKey: executiveQueryKeys.notificationsList(scopedOutletId, "recent:10"),
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
        queryKey: executiveQueryKeys.notificationsUnread(scopedOutletId),
        queryFn: () => getUserNotificationUnreadCount(scopedOutletId),
        enabled: canNotifications,
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
        queryKey: executiveQueryKeys.notificationsList(scopedOutletId, "warning:50"),
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
        queryKey: executiveQueryKeys.auditCenterSummary(scopedOutletId),
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
  const foodCostPercentValue =
    canMenuDashboard && menuDashboardQ.data
      ? menuDashboardQ.data.kpis.foodCostPercent
      : foodCostQ.data;

  const executiveScore = useMemo(() => {
    const financial =
      accountingQ.data?.healthScore !== undefined ? accountingQ.data.healthScore : null;

    const operations =
      paymentQ.data?.healthSeverity !== undefined
        ? severityToScore(paymentQ.data.healthSeverity)
        : null;

    const commercial = computeCommercialPillarScore(
      foodCostPercentValue,
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
    foodCostPercentValue,
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
    (fetchFoodCostSeparately && foodCostQ.isLoading) ||
    (canMenuDashboard && menuDashboardQ.isLoading) ||
    (canNotifications && criticalQ.isLoading);

  const foodCostLoading = fetchFoodCostSeparately ? foodCostQ.isLoading : menuDashboardQ.isLoading;
  const foodCostEnabled = (fetchFoodCostSeparately || canMenuDashboard) && scopedOutletId !== null;

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
      foodCostEnabled,
      fetchFoodCostSeparately ? "analytics.view" : PERMISSIONS.MENU_DASHBOARD,
      foodCostLoading,
      fetchFoodCostSeparately ? foodCostQ.isError : menuDashboardQ.isError,
      fetchFoodCostSeparately ? foodCostQ.error : menuDashboardQ.error,
      foodCostPercentValue,
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
