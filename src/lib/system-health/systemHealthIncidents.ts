import type { AccountingHealth } from "@/lib/api-integration/accountingEndpoints";
import type { AuditCenterSummary } from "@/lib/api-integration/auditCenterEndpoints";
import type { BugReportRow } from "@/lib/api-integration/bugReportEndpoints";
import type { FailedJobSummary } from "@/lib/api-integration/failedJobsEndpoints";
import type { UserNotification } from "@/lib/api-integration/notificationEndpoints";
import type { PaymentHealthReport } from "@/lib/api-integration/paymentEndpoints";

export type SystemIncidentItem = {
  id: string;
  title: string;
  message: string;
  severity: "critical" | "high" | "warning" | "info";
  module: string;
  timestamp: string;
  actionUrl?: string;
};

function ts(value: string | null | undefined): string {
  return value ?? new Date().toISOString();
}

export function buildSystemIncidentTimeline(input: {
  paymentHealth?: PaymentHealthReport | null;
  accountingHealth?: AccountingHealth | null;
  failedJobs?: FailedJobSummary | null;
  criticalBugs?: BugReportRow[];
  inventoryAlerts?: UserNotification[];
  menuAlerts?: UserNotification[];
  auditSummary?: AuditCenterSummary | null;
}): SystemIncidentItem[] {
  const items: SystemIncidentItem[] = [];

  if (input.paymentHealth?.openIncidents && input.paymentHealth.openIncidents > 0) {
    items.push({
      id: "payment-incidents",
      title: "Payment incidents open",
      message: `${input.paymentHealth.openIncidents} open payment incident(s); success rate ${input.paymentHealth.paymentSuccessRate ?? "—"}%`,
      severity: input.paymentHealth.healthSeverity === "critical" ? "critical" : "high",
      module: "payments",
      timestamp: new Date().toISOString(),
      actionUrl: "/settings/payments/health",
    });
  }

  if (input.paymentHealth?.healthSeverity === "critical") {
    items.push({
      id: "payment-outage",
      title: "Payment health critical",
      message: `Gateway reliability degraded (severity: critical)`,
      severity: "critical",
      module: "payments",
      timestamp: new Date().toISOString(),
      actionUrl: "/settings/payments/health",
    });
  }

  for (const item of input.accountingHealth?.priorityQueue ?? []) {
    items.push({
      id: `accounting-pq-${item.title}`,
      title: item.title,
      message: item.message,
      severity: item.priority === "critical" ? "critical" : item.priority === "high" ? "high" : "warning",
      module: "accounting",
      timestamp: new Date().toISOString(),
      actionUrl: item.actionUrl,
    });
  }

  if (input.accountingHealth?.healthSeverity === "critical") {
    items.push({
      id: "accounting-critical",
      title: "Accounting escalation",
      message: `Accounting health severity is critical (score ${input.accountingHealth.healthScore})`,
      severity: "critical",
      module: "accounting",
      timestamp: new Date().toISOString(),
      actionUrl: "/accounting?tab=health",
    });
  }

  if (input.failedJobs && input.failedJobs.criticalFailures > 0) {
    items.push({
      id: "failed-jobs-spike",
      title: "Failed jobs spike",
      message: `${input.failedJobs.criticalFailures} critical queue failure(s); ${input.failedJobs.failedJobs} total`,
      severity: "critical",
      module: "system",
      timestamp: new Date().toISOString(),
      actionUrl: "/system/failed-jobs",
    });
  } else if (input.failedJobs && input.failedJobs.failedJobs > 0) {
    items.push({
      id: "failed-jobs",
      title: "Background job failures",
      message: `${input.failedJobs.failedJobs} failed job(s) in queue`,
      severity: "warning",
      module: "system",
      timestamp: new Date().toISOString(),
      actionUrl: "/system/failed-jobs",
    });
  }

  for (const bug of input.criticalBugs ?? []) {
    items.push({
      id: `bug-${bug.id}`,
      title: bug.title,
      message: bug.message,
      severity: "critical",
      module: "system",
      timestamp: ts(bug.createdAt),
      actionUrl: `/system/bug-reports/${bug.id}`,
    });
  }

  for (const alert of input.inventoryAlerts ?? []) {
    items.push({
      id: `inventory-${alert.id}`,
      title: alert.title,
      message: alert.message,
      severity: alert.severity === "critical" ? "critical" : "high",
      module: "inventory",
      timestamp: ts(alert.createdAt),
      actionUrl: alert.actionUrl ?? "/notifications",
    });
  }

  for (const alert of input.menuAlerts ?? []) {
    items.push({
      id: `menu-${alert.id}`,
      title: alert.title,
      message: alert.message,
      severity: alert.severity === "critical" ? "critical" : "warning",
      module: "menu_intelligence",
      timestamp: ts(alert.createdAt),
      actionUrl: alert.actionUrl ?? "/notifications",
    });
  }

  for (const risk of input.auditSummary?.riskEvents ?? []) {
    items.push({
      id: `audit-${risk.id}`,
      title: `${risk.module}: ${risk.action}`,
      message: `${risk.entityType} #${risk.entityId} by ${risk.userName ?? "unknown"}`,
      severity: "high",
      module: "audit",
      timestamp: risk.timestamp,
      actionUrl: "/system/audit",
    });
  }

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
