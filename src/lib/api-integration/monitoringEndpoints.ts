import type { OfflineResilienceMetrics, OperationalMetrics } from "@/domain/operationsTypes";
import { EMPTY_OFFLINE_RESILIENCE } from "@/domain/operationsTypes";
import { apiRequest as request } from "./client";

type MonitoringApiBody = { success?: boolean; data?: Record<string, unknown> };

const EMPTY_METRICS: OperationalMetrics = {
  kitchen: { queued: 0, inProgress: 0, ready: 0 },
  pendingPayments: 0,
  activeSessions: 0,
  qrQueue: 0,
  printerQueue: { pending: 0, failed: 0, printing: 0 },
  reconciliationWarnings: [],
  updatedAt: null,
  offlineResilience: EMPTY_OFFLINE_RESILIENCE,
};

function mergeOfflineResilience(raw: unknown): OfflineResilienceMetrics {
  if (typeof raw !== "object" || raw === null) {
    return EMPTY_OFFLINE_RESILIENCE;
  }
  return { ...EMPTY_OFFLINE_RESILIENCE, ...(raw as OfflineResilienceMetrics) };
}

export async function getOperationalMetrics(): Promise<OperationalMetrics> {
  const res = await request<MonitoringApiBody>("/monitoring/metrics");
  const d = res.data ?? {};
  return {
    ...EMPTY_METRICS,
    ...(d as Partial<OperationalMetrics>),
    kitchen: {
      ...EMPTY_METRICS.kitchen,
      ...(((d.kitchen ?? {}) as Partial<OperationalMetrics["kitchen"]>) ?? {}),
    },
    printerQueue: {
      ...EMPTY_METRICS.printerQueue,
      ...(((d.printerQueue ?? {}) as Partial<OperationalMetrics["printerQueue"]>) ?? {}),
    },
    reconciliationWarnings: Array.isArray(d.reconciliationWarnings)
      ? (d.reconciliationWarnings as OperationalMetrics["reconciliationWarnings"])
      : [],
    offlineResilience: mergeOfflineResilience(d.offlineResilience),
  };
}
