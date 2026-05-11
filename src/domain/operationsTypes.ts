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

/** Server `monitoring/metrics` `qrQueue` slice (pending_cashier_confirmation + expired). */
export type QrQueueMetrics = {
  pendingConfirmation: number;
  expired: number;
};

export const EMPTY_QR_QUEUE: QrQueueMetrics = {
  pendingConfirmation: 0,
  expired: 0,
};

export interface OperationalMetrics {
  kitchen: {
    queued: number;
    inProgress: number;
    ready: number;
  };
  pendingPayments: number;
  activeSessions: number;
  qrQueue: QrQueueMetrics;
  printerQueue: {
    pending: number;
    failed: number;
    printing: number;
  };
  reconciliationWarnings: ReconciliationWarning[];
  updatedAt: string | null;
  offlineResilience?: OfflineResilienceMetrics;
}

export interface DashboardTopMenu {
  name: string;
  qty: number;
  revenue: number;
}

export interface DashboardRecentTransaction {
  id: string;
  type: string;
  total: number;
  status: string;
  time: string;
}

export interface DashboardBestSellerOtherOutlet {
  name: string;
  qty: number;
  outletName: string;
  trend: "up" | "down" | "flat";
}

export interface DashboardSummary {
  kpis: {
    revenueToday: number;
    orderCountToday: number;
    avgOrderValue: number;
    customerCount: number;
  };
  hourlyOrders: { hour: string; orders: number }[];
  topMenus: DashboardTopMenu[];
  recentTransactions: DashboardRecentTransaction[];
  monitoring: {
    activePosSessions: number;
    pendingKitchenTickets: number;
    paymentSuccessRate: number;
    stalePayments: number;
    qrQueue: QrQueueMetrics;
    printerQueue: {
      pending: number;
      failed: number;
      recoverable: number;
      deadLetter: number;
    };
    offlineResilience: OfflineResilienceMetrics;
    hardwareBridge: Record<string, unknown>;
  };
  crmMetrics: {
    activeCustomers: number;
    repeatVisitRate: number;
    loyaltyPointsIssued: number;
    loyaltyPointsRedeemed: number;
    topTierCounts: Record<string, number>;
    customerRetentionIndicators: {
      customersWithRecentVisit: number;
      inactiveCustomers30d: number;
    };
  };
  bestSellerOtherOutlets: DashboardBestSellerOtherOutlet[];
}

export interface PrinterProfileInput extends Printer {
  routeRules?: string[];
}
