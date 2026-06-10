import type { AccountingHealth } from "@/lib/api-integration/accountingEndpoints";
import type { FailedJobSummary } from "@/lib/api-integration/failedJobsEndpoints";
import type { PaymentHealthReport } from "@/lib/api-integration/paymentEndpoints";

export type PriorityLevel = "critical" | "high" | "warning";

export type SystemPriorityAction = {
  id: string;
  level: PriorityLevel;
  title: string;
  message: string;
  actionUrl: string;
};

const LEVEL_ORDER: Record<PriorityLevel, number> = {
  critical: 0,
  high: 1,
  warning: 2,
};

export function buildSystemPriorityQueue(input: {
  paymentHealth?: PaymentHealthReport | null;
  accountingHealth?: AccountingHealth | null;
  failedJobs?: FailedJobSummary | null;
  openCriticalBugs?: number;
  inventoryCriticalAlerts?: number;
  menuOpenAlerts?: number;
  unreadNotifications?: number;
}): SystemPriorityAction[] {
  const actions: SystemPriorityAction[] = [];

  const paymentRate = input.paymentHealth?.paymentSuccessRate;
  if (typeof paymentRate === "number" && paymentRate < 90) {
    actions.push({
      id: "payment-success-low",
      level: "critical",
      title: "Payment success rate below 90%",
      message: `Current rate: ${paymentRate.toFixed(1)}%`,
      actionUrl: "/settings/payments/health",
    });
  }

  if (input.accountingHealth?.healthSeverity === "critical") {
    actions.push({
      id: "accounting-critical",
      level: "critical",
      title: "Accounting severity critical",
      message: `${input.accountingHealth.failedPostings} failed posting(s) require attention`,
      actionUrl: "/accounting?tab=health",
    });
  }

  if (input.failedJobs && (input.failedJobs.criticalFailures >= 3 || input.failedJobs.healthStatus === "critical")) {
    actions.push({
      id: "failed-jobs-spike",
      level: "critical",
      title: "Failed jobs spike",
      message: `${input.failedJobs.criticalFailures} critical failure(s) detected`,
      actionUrl: "/system/failed-jobs",
    });
  }

  if ((input.openCriticalBugs ?? 0) > 0) {
    actions.push({
      id: "critical-bugs",
      level: "high",
      title: "Open critical bug reports",
      message: `${input.openCriticalBugs} critical bug(s) awaiting triage`,
      actionUrl: "/system/bug-reports",
    });
  }

  if ((input.inventoryCriticalAlerts ?? 0) > 0) {
    actions.push({
      id: "inventory-variance",
      level: "high",
      title: "Inventory critical alerts",
      message: `${input.inventoryCriticalAlerts} critical inventory alert(s)`,
      actionUrl: "/notifications?source=inventory",
    });
  }

  if ((input.menuOpenAlerts ?? 0) > 0) {
    actions.push({
      id: "menu-alerts",
      level: "warning",
      title: "Menu automation alerts",
      message: `${input.menuOpenAlerts} open menu alert(s)`,
      actionUrl: "/notifications?source=menu_intelligence",
    });
  }

  if ((input.unreadNotifications ?? 0) > 10) {
    actions.push({
      id: "unread-notifications",
      level: "warning",
      title: "High unread notification count",
      message: `${input.unreadNotifications} unread notification(s)`,
      actionUrl: "/notifications",
    });
  }

  return actions.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}
