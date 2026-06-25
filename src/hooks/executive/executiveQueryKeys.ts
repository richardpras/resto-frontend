export const executiveQueryKeys = {
  accountingHealth: (outletId: number | null) => ["accounting-health", outletId] as const,
  paymentHealth: (outletId: number | null) => ["payment-health", outletId] as const,
  giftCardReconciliation: (outletId: number | null) => ["gift-card-reconciliation", outletId] as const,
  executiveSales: (outletId: number | null, startDate: string, endDate: string) =>
    ["executive-sales", outletId, startDate, endDate] as const,
  operationalMetrics: (outletId: number | null) => ["operational-metrics", outletId] as const,
  loyaltyDashboard: (outletId: number | null, startDate: string, endDate: string) =>
    ["loyalty-dashboard", outletId, startDate, endDate] as const,
  menuDashboardSummary: (outletId: number | null) => ["menu-dashboard-summary", outletId] as const,
  executiveAnalytics: (outletId: number | null) => ["executive-analytics", outletId] as const,
  notificationsList: (outletId: number | null, fingerprint: string) =>
    ["notifications-list", outletId, fingerprint] as const,
  notificationsUnread: (outletId: number | null) => ["notifications-unread", outletId] as const,
  auditCenterSummary: (outletId: number | null) => ["audit-center-summary", outletId] as const,
  failedJobsSummary: () => ["failed-jobs-summary"] as const,
  bugReportCounts: () => ["bug-report-counts"] as const,
  bugReportsCritical: () => ["bug-reports-critical"] as const,
  inventoryNotificationAlerts: (outletId: number | null) => ["inventory-notification-alerts", outletId] as const,
  inventoryPostingHealth: (outletId: number | null) => ["inventory-posting-health", outletId] as const,
  shiftCloseReadiness: (outletId: number | null) => ["shift-close-readiness", outletId] as const,
  qrCustomerHealth: (outletId: number | null) => ["qr-customer-health", outletId] as const,
};
