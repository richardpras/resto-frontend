import type { Printer } from "@/domain/settingsDomainTypes";

export type ReconciliationSeverity = "warning" | "critical";

export interface ReconciliationWarning {
  id: string;
  message: string;
  severity: ReconciliationSeverity;
}

export interface PrinterQueueJob {
  id: string;
  status: "pending" | "printing" | "failed" | "done";
  route: string;
  attempts: number;
  createdAt: string | null;
}

export interface PrinterQueueSummary {
  printerId: string;
  printerName: string;
  pending: number;
  failed: number;
  printing: number;
  jobs: PrinterQueueJob[];
}

/** Server `monitoring/metrics` offline-resilience slice (Phase 13). */
export type OfflineResilienceMetrics = {
  registeredTerminals: number;
  staleTerminalDevices: number;
  aggregateReconnectCounter: number;
  syncOperationsApplied: number;
  syncReplayFailures: number;
  syncStaleReplayRejections: number;
  syncConflictOperations: number;
  duplicateReplayAttemptsObserved: number;
  conflictEventsLogged: number;
};

export const EMPTY_OFFLINE_RESILIENCE: OfflineResilienceMetrics = {
  registeredTerminals: 0,
  staleTerminalDevices: 0,
  aggregateReconnectCounter: 0,
  syncOperationsApplied: 0,
  syncReplayFailures: 0,
  syncStaleReplayRejections: 0,
  syncConflictOperations: 0,
  duplicateReplayAttemptsObserved: 0,
  conflictEventsLogged: 0,
};

export interface OperationalMetrics {
  kitchen: {
    queued: number;
    inProgress: number;
    ready: number;
  };
  pendingPayments: number;
  activeSessions: number;
  qrQueue: number;
  printerQueue: {
    pending: number;
    failed: number;
    printing: number;
  };
  reconciliationWarnings: ReconciliationWarning[];
  updatedAt: string | null;
  offlineResilience?: OfflineResilienceMetrics;
}

export interface PrinterProfileInput extends Printer {
  routeRules?: string[];
}
