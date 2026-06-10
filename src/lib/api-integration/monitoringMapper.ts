import type {
  OfflineResilienceMetrics,
  OperationalMetrics,
  QrQueueMetrics,
  ReconciliationWarning,
} from "@/domain/operationsTypes";
import { EMPTY_OFFLINE_RESILIENCE, EMPTY_QR_QUEUE } from "@/domain/operationsTypes";
import type {
  MonitoringMetricsResponse,
  OperationalMetricsViewModel,
} from "@/domain/monitoring/types";

export function normalizeQrQueueMetrics(raw: unknown): QrQueueMetrics {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return { pendingConfirmation: raw, expired: 0 };
  }
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return {
      pendingConfirmation: asFiniteNumber(o.pendingConfirmation ?? o.pending_confirmation, 0),
      expired: asFiniteNumber(o.expired, 0),
    };
  }
  return { ...EMPTY_QR_QUEUE };
}

function asFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function countFromObject(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return asFiniteNumber((raw as { count?: number }).count, 0);
  }
  return 0;
}

function mergeOfflineResilience(raw: unknown): OfflineResilienceMetrics {
  if (typeof raw !== "object" || raw === null) {
    return EMPTY_OFFLINE_RESILIENCE;
  }
  return { ...EMPTY_OFFLINE_RESILIENCE, ...(raw as OfflineResilienceMetrics) };
}

export function mapReconciliationWarnings(reconciliationFailures: unknown): ReconciliationWarning[] {
  const count = countFromObject(reconciliationFailures);
  if (count <= 0) {
    return [];
  }
  const label = count === 1 ? "1 reconciliation issue" : `${count} reconciliation issues`;
  return [
    {
      id: `reconciliation-failures-${count}`,
      message: `${label} detected (payment webhook reconciliation)`,
      severity: count >= 5 ? "critical" : "warning",
    },
  ];
}

/** Map backend monitoring DTO to dashboard view model. */
export function mapMonitoringMetrics(dto: MonitoringMetricsResponse): OperationalMetricsViewModel {
  const printerQueueRaw = dto.printerQueue ?? {};
  const hardwareBridge = dto.hardwareBridge ?? {};
  const offlineResilience = mergeOfflineResilience(dto.offlineResilience);

  const kitchenFromApi = dto.kitchen;
  const kitchenQueued =
    kitchenFromApi?.queued !== undefined
      ? asFiniteNumber(kitchenFromApi.queued, 0)
      : countFromObject(dto.pendingKitchenTickets);

  const pendingPayments =
    dto.pendingPayments !== undefined
      ? asFiniteNumber(dto.pendingPayments, 0)
      : countFromObject(dto.stalePayments);

  const activeSessions =
    dto.activeSessions !== undefined
      ? asFiniteNumber(dto.activeSessions, 0)
      : countFromObject(dto.activePosSessions);

  const reconciliationWarnings = Array.isArray(dto.reconciliationWarnings)
    ? dto.reconciliationWarnings
    : mapReconciliationWarnings(dto.reconciliationFailures);

  return {
    kitchen: {
      queued: kitchenQueued,
      inProgress: asFiniteNumber(kitchenFromApi?.inProgress, 0),
      ready: asFiniteNumber(kitchenFromApi?.ready, 0),
    },
    pendingPayments,
    activeSessions,
    qrQueue: normalizeQrQueueMetrics(dto.qrQueue),
    printerQueue: {
      pending: asFiniteNumber(printerQueueRaw.pending, 0),
      failed: asFiniteNumber(printerQueueRaw.failed, 0),
      printing: asFiniteNumber(printerQueueRaw.printing, 0),
    },
    reconciliationWarnings,
    updatedAt: dto.updatedAt ?? new Date().toISOString(),
    offlineResilience,
    hardware: {
      deadLetters: asFiniteNumber(hardwareBridge.deadLetterCount, 0),
      staleBridges: asFiniteNumber(hardwareBridge.staleBridges, 0),
    },
    offlineSync: {
      failures: asFiniteNumber(offlineResilience.syncReplayFailures, 0),
      conflicts: asFiniteNumber(offlineResilience.syncConflictOperations, 0),
    },
  };
}

export function emptyOperationalMetricsViewModel(): OperationalMetricsViewModel {
  return mapMonitoringMetrics({});
}

export function isBackendMonitoringShape(raw: Record<string, unknown>): boolean {
  return (
    "pendingKitchenTickets" in raw ||
    "stalePayments" in raw ||
    "activePosSessions" in raw ||
    "reconciliationFailures" in raw ||
    "hardwareBridge" in raw ||
    "offlineResilience" in raw ||
    "printerQueue" in raw
  );
}

/** Merge poll/realtime patch into current metrics (handles API DTO or partial view-model). */
export function mergeOperationalMetrics(
  current: OperationalMetricsViewModel,
  patch: unknown,
): OperationalMetricsViewModel {
  if (typeof patch !== "object" || patch === null) {
    return current;
  }

  const raw = patch as Record<string, unknown>;

  if (isBackendMonitoringShape(raw)) {
    return {
      ...current,
      ...mapMonitoringMetrics(raw as MonitoringMetricsResponse),
      updatedAt:
        (typeof raw.updatedAt === "string" ? raw.updatedAt : null) ??
        current.updatedAt ??
        new Date().toISOString(),
    };
  }

  const partial = patch as Partial<OperationalMetrics>;
  return {
    ...current,
    ...partial,
    kitchen: { ...current.kitchen, ...(partial.kitchen ?? {}) },
    printerQueue: { ...current.printerQueue, ...(partial.printerQueue ?? {}) },
    qrQueue: partial.qrQueue !== undefined ? normalizeQrQueueMetrics(partial.qrQueue) : current.qrQueue,
    reconciliationWarnings: partial.reconciliationWarnings ?? current.reconciliationWarnings,
    offlineResilience: partial.offlineResilience
      ? { ...(current.offlineResilience ?? EMPTY_OFFLINE_RESILIENCE), ...partial.offlineResilience }
      : current.offlineResilience,
    hardware: {
      ...current.hardware,
      ...((partial as Partial<OperationalMetricsViewModel>).hardware ?? {}),
    },
    offlineSync: {
      ...current.offlineSync,
      ...((partial as Partial<OperationalMetricsViewModel>).offlineSync ?? {}),
    },
    updatedAt: partial.updatedAt ?? current.updatedAt ?? new Date().toISOString(),
  };
}
