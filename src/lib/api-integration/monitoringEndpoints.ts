import type {
  DashboardSummary,
  OfflineResilienceMetrics,
} from "@/domain/operationsTypes";
import { EMPTY_OFFLINE_RESILIENCE } from "@/domain/operationsTypes";
import type { MonitoringMetricsResponse, OperationalMetricsViewModel } from "@/domain/monitoring/types";
import {
  emptyOperationalMetricsViewModel,
  mapMonitoringMetrics,
  normalizeQrQueueMetrics,
} from "@/lib/api-integration/monitoringMapper";
import { apiRequest as request } from "./client";

export { normalizeQrQueueMetrics };

type MonitoringApiBody = { success?: boolean; data?: MonitoringMetricsResponse };

function asFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function mergeOfflineResilience(raw: unknown): OfflineResilienceMetrics {
  if (typeof raw !== "object" || raw === null) {
    return EMPTY_OFFLINE_RESILIENCE;
  }
  return { ...EMPTY_OFFLINE_RESILIENCE, ...(raw as OfflineResilienceMetrics) };
}

export async function getOperationalMetrics(outletId?: number | null): Promise<OperationalMetricsViewModel> {
  const query = typeof outletId === "number" && outletId >= 1 ? `?outletId=${outletId}` : "";
  const res = await request<MonitoringApiBody>(`/monitoring/metrics${query}`);
  return mapMonitoringMetrics(res.data ?? {});
}

export { emptyOperationalMetricsViewModel, mapMonitoringMetrics };

export async function getDashboardSummary(outletId?: number | null): Promise<DashboardSummary> {
  const query = typeof outletId === "number" && outletId >= 1 ? `?outletId=${outletId}` : "";
  const res = await request<MonitoringApiBody>(`/dashboard/summary${query}`);
  const data = (res.data ?? {}) as Record<string, unknown>;
  const kpis = (data.kpis ?? {}) as Record<string, unknown>;
  const monitoring = (data.monitoring ?? {}) as Record<string, unknown>;
  const monitoringQrQueue = (monitoring.qrQueue ?? {}) as Record<string, unknown>;
  const monitoringPrinterQueue = (monitoring.printerQueue ?? {}) as Record<string, unknown>;
  const crmMetrics = (data.crmMetrics ?? {}) as Record<string, unknown>;
  const retention = (crmMetrics.customerRetentionIndicators ?? {}) as Record<string, unknown>;
  const topTierCountsRaw = crmMetrics.topTierCounts;
  const topTierCounts = (typeof topTierCountsRaw === "object" && topTierCountsRaw !== null && !Array.isArray(topTierCountsRaw))
    ? Object.fromEntries(
        Object.entries(topTierCountsRaw as Record<string, unknown>).map(([k, v]) => [k, asFiniteNumber(v, 0)]),
      )
    : {};

  return {
    kpis: {
      revenueToday: asFiniteNumber(kpis.revenueToday, 0),
      orderCountToday: asFiniteNumber(kpis.orderCountToday, 0),
      avgOrderValue: asFiniteNumber(kpis.avgOrderValue, 0),
      customerCount: asFiniteNumber(kpis.customerCount, 0),
    },
    hourlyOrders: Array.isArray(data.hourlyOrders)
      ? data.hourlyOrders.map((row) => {
          const entry = row as Record<string, unknown>;
          return {
            hour: String(entry.hour ?? "-"),
            orders: asFiniteNumber(entry.orders, 0),
          };
        })
      : [],
    topMenus: Array.isArray(data.topMenus)
      ? data.topMenus.map((row) => {
          const entry = row as Record<string, unknown>;
          return {
            name: String(entry.name ?? "-"),
            qty: asFiniteNumber(entry.qty, 0),
            revenue: asFiniteNumber(entry.revenue, 0),
          };
        })
      : [],
    recentTransactions: Array.isArray(data.recentTransactions)
      ? data.recentTransactions.map((row) => {
          const entry = row as Record<string, unknown>;
          return {
            id: String(entry.id ?? "-"),
            type: String(entry.type ?? "-"),
            total: asFiniteNumber(entry.total, 0),
            status: String(entry.status ?? "-"),
            time: String(entry.time ?? "-"),
          };
        })
      : [],
    monitoring: {
      activePosSessions: asFiniteNumber(monitoring.activePosSessions, 0),
      pendingKitchenTickets: asFiniteNumber(monitoring.pendingKitchenTickets, 0),
      paymentSuccessRate: asFiniteNumber(monitoring.paymentSuccessRate, 0),
      stalePayments: asFiniteNumber(monitoring.stalePayments, 0),
      qrQueue: normalizeQrQueueMetrics(monitoringQrQueue),
      printerQueue: {
        pending: asFiniteNumber(monitoringPrinterQueue.pending, 0),
        failed: asFiniteNumber(monitoringPrinterQueue.failed, 0),
        recoverable: asFiniteNumber(monitoringPrinterQueue.recoverable, 0),
        deadLetter: asFiniteNumber(monitoringPrinterQueue.deadLetter, 0),
      },
      offlineResilience: mergeOfflineResilience(monitoring.offlineResilience),
      hardwareBridge:
        typeof monitoring.hardwareBridge === "object" && monitoring.hardwareBridge !== null
          ? (monitoring.hardwareBridge as Record<string, unknown>)
          : {},
    },
    crmMetrics: {
      activeCustomers: asFiniteNumber(crmMetrics.activeCustomers, 0),
      repeatVisitRate: asFiniteNumber(crmMetrics.repeatVisitRate, 0),
      loyaltyPointsIssued: asFiniteNumber(crmMetrics.loyaltyPointsIssued, 0),
      loyaltyPointsRedeemed: asFiniteNumber(crmMetrics.loyaltyPointsRedeemed, 0),
      topTierCounts,
      customerRetentionIndicators: {
        customersWithRecentVisit: asFiniteNumber(retention.customersWithRecentVisit, 0),
        inactiveCustomers30d: asFiniteNumber(retention.inactiveCustomers30d, 0),
      },
    },
    bestSellerOtherOutlets: Array.isArray(data.bestSellerOtherOutlets)
      ? data.bestSellerOtherOutlets.map((row) => {
          const entry = row as Record<string, unknown>;
          const trendRaw = String(entry.trend ?? "flat").toLowerCase();
          const trend = trendRaw === "up" || trendRaw === "down" ? trendRaw : "flat";
          return {
            name: String(entry.name ?? "-"),
            qty: asFiniteNumber(entry.qty, 0),
            outletName: String(entry.outletName ?? "-"),
            trend,
          };
        })
      : [],
  };
}
