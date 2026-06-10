import type { FailedJobSummary } from "@/lib/api-integration/failedJobsEndpoints";
import { criticalAlertCountToScore, severityToScore } from "@/lib/executive/executiveScore";

export type SystemHealthSeverity = "healthy" | "warning" | "degraded" | "critical";

export type SystemHealthScoreInput = {
  accountingScore?: number | null;
  paymentScore?: number | null;
  failedJobsScore?: number | null;
  bugReportsScore?: number | null;
  criticalNotificationsScore?: number | null;
  inventoryAlertsScore?: number | null;
  menuAlertsScore?: number | null;
};

const WEIGHTS = {
  accounting: 0.2,
  payment: 0.2,
  failedJobs: 0.2,
  bugReports: 0.15,
  criticalNotifications: 0.15,
  inventoryAlerts: 0.05,
  menuAlerts: 0.05,
} as const;

export function scoreToSystemHealthSeverity(score: number): SystemHealthSeverity {
  if (score >= 85) return "healthy";
  if (score >= 70) return "warning";
  if (score >= 50) return "degraded";
  return "critical";
}

export function bugReportsToScore(openBugs: number, criticalBugs: number): number {
  if (criticalBugs > 0) return 25;
  if (openBugs > 5) return 50;
  if (openBugs > 0) return 75;
  return 100;
}

export function inventoryAlertsToScore(criticalCount: number): number {
  return criticalAlertCountToScore(criticalCount);
}

export function menuAlertsToScore(openAlerts: number, criticalAlerts: number): number {
  if (criticalAlerts > 0) return 25;
  if (openAlerts > 3) return 50;
  if (openAlerts > 0) return 75;
  return 100;
}

export function failedJobsToScore(summary: FailedJobSummary): number {
  if (summary.healthScore > 0) return summary.healthScore;
  if (summary.criticalFailures > 0) return 25;
  if (summary.failedJobs > 5) return 50;
  if (summary.failedJobs > 0) return 75;
  return 100;
}

export function paymentHealthToScore(reliabilityScore?: number, healthSeverity?: string): number {
  if (typeof reliabilityScore === "number" && reliabilityScore > 0) return reliabilityScore;
  return severityToScore(healthSeverity);
}

export function accountingHealthToScore(healthScore?: number, healthSeverity?: string): number {
  if (typeof healthScore === "number" && healthScore > 0) return healthScore;
  return severityToScore(healthSeverity);
}

export function computeSystemHealthScore(input: SystemHealthScoreInput): {
  score: number;
  severity: SystemHealthSeverity;
  partial: boolean;
} {
  const entries: Array<{ weight: number; score: number }> = [];

  if (typeof input.accountingScore === "number") {
    entries.push({ weight: WEIGHTS.accounting, score: input.accountingScore });
  }
  if (typeof input.paymentScore === "number") {
    entries.push({ weight: WEIGHTS.payment, score: input.paymentScore });
  }
  if (typeof input.failedJobsScore === "number") {
    entries.push({ weight: WEIGHTS.failedJobs, score: input.failedJobsScore });
  }
  if (typeof input.bugReportsScore === "number") {
    entries.push({ weight: WEIGHTS.bugReports, score: input.bugReportsScore });
  }
  if (typeof input.criticalNotificationsScore === "number") {
    entries.push({ weight: WEIGHTS.criticalNotifications, score: input.criticalNotificationsScore });
  }
  if (typeof input.inventoryAlertsScore === "number") {
    entries.push({ weight: WEIGHTS.inventoryAlerts, score: input.inventoryAlertsScore });
  }
  if (typeof input.menuAlertsScore === "number") {
    entries.push({ weight: WEIGHTS.menuAlerts, score: input.menuAlertsScore });
  }

  if (entries.length === 0) {
    return { score: 0, severity: "critical", partial: true };
  }

  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  const weighted = entries.reduce((sum, e) => sum + e.score * e.weight, 0);
  const score = Math.round(weighted / totalWeight);

  return {
    score,
    severity: scoreToSystemHealthSeverity(score),
    partial: entries.length < 7,
  };
}
