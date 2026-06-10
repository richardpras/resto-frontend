import type {
  OfflineResilienceMetrics,
  OperationalMetrics,
  QrQueueMetrics,
  ReconciliationWarning,
} from "@/domain/operationsTypes";

/** Raw `/monitoring/metrics` API payload (matches Laravel `MonitoringMetricsResource`). */
export type MonitoringMetricsResponse = {
  outletScope?: Record<string, unknown>;
  window?: Record<string, unknown>;
  activePosSessions?: { count?: number };
  pendingKitchenTickets?: { count?: number };
  paymentRate?: {
    paidCount?: number;
    failureCount?: number;
    successRate?: number;
    failureRate?: number;
  };
  stalePayments?: { count?: number; thresholdMinutes?: number };
  qrQueue?: QrQueueMetrics | number;
  active_waiter_calls?: number;
  average_waiter_response_time?: number;
  called_but_unhandled?: number;
  printerQueue?: {
    pending?: number;
    failed?: number;
    recoverable?: number;
    deadLetter?: number;
    printing?: number;
  };
  reconciliationFailures?: { count?: number };
  asyncRecoveryFailures?: { count?: number; queuedForRetry?: number };
  offlineResilience?: Partial<OfflineResilienceMetrics>;
  hardwareBridge?: {
    activeBridges?: number;
    staleBridges?: number;
    deadLetterCount?: number;
    queueDepth?: number;
    [key: string]: unknown;
  };
  crmMetrics?: Record<string, unknown>;
  recoverySettlement?: Record<string, unknown>;
  paymentGateway?: Record<string, unknown>;
  /** Legacy / alternate shapes — ignored when canonical fields present */
  kitchen?: OperationalMetrics["kitchen"];
  pendingPayments?: number;
  activeSessions?: number;
  reconciliationWarnings?: ReconciliationWarning[];
  updatedAt?: string | null;
};

export type HardwareMetricsView = {
  deadLetters: number;
  staleBridges: number;
};

export type OfflineSyncMetricsView = {
  failures: number;
  conflicts: number;
};

/** Dashboard / store view model — always produced via `mapMonitoringMetrics()`. */
export type OperationalMetricsViewModel = OperationalMetrics & {
  hardware: HardwareMetricsView;
  offlineSync: OfflineSyncMetricsView;
};
