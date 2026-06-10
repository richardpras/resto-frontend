import { useEffect, useState } from "react";
import { getFailedJobsSummary } from "@/lib/api-integration/failedJobsEndpoints";
import { listBugReports } from "@/lib/api-integration/bugReportEndpoints";
import {
  accountingHealthToScore,
  computeSystemHealthScore,
  failedJobsToScore,
  paymentHealthToScore,
} from "@/lib/system-health/systemHealthScore";
import { getPaymentHealth } from "@/lib/api-integration/paymentEndpoints";
import { getAccountingHealth } from "@/lib/api-integration/accountingEndpoints";
import { useOutletStore } from "@/stores/outletStore";
import { SystemHealthStatusBadge } from "@/components/system-health/SystemHealthStatusBadge";

export function SystemHealthHubSummary() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const [score, setScore] = useState<number | null>(null);
  const [severity, setSeverity] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<number | null>(null);

  useEffect(() => {
    const outletId = typeof activeOutletId === "number" && activeOutletId > 0 ? activeOutletId : undefined;
    void Promise.all([
      getFailedJobsSummary().catch(() => null),
      listBugReports({ status: "open", limit: 1 }).catch(() => null),
      getPaymentHealth({ outletId }).catch(() => null),
      getAccountingHealth({ outletId }).catch(() => null),
    ]).then(([failedJobs, bugs, payment, accounting]) => {
      const result = computeSystemHealthScore({
        failedJobsScore: failedJobs ? failedJobsToScore(failedJobs) : null,
        bugReportsScore: bugs ? (bugs.meta.total > 0 ? 50 : 100) : null,
        paymentScore: payment ? paymentHealthToScore(payment.reliabilityScore, payment.healthSeverity) : null,
        accountingScore: accounting
          ? accountingHealthToScore(accounting.healthScore, accounting.healthSeverity)
          : null,
      });
      setScore(result.score);
      setSeverity(result.severity);
      setIncidents(
        (failedJobs?.criticalFailures ?? 0) +
          (bugs?.meta.total ?? 0) +
          (payment?.openIncidents ?? 0),
      );
    });
  }, [activeOutletId]);

  if (score === null) {
    return <p className="text-xs text-muted-foreground mt-2">Loading system health summary…</p>;
  }

  return (
    <dl className="text-xs mt-2 grid grid-cols-3 gap-2 items-center">
      <div>
        <dt className="text-muted-foreground">Score</dt>
        <dd className="font-medium flex items-center gap-1">
          {score}
          {severity ? <SystemHealthStatusBadge severity={severity} /> : null}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Incidents</dt>
        <dd className="font-medium">{incidents ?? 0}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Modules</dt>
        <dd className="font-medium">Aggregated</dd>
      </div>
    </dl>
  );
}
