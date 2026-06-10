import { useEffect, useState } from "react";
import { getFailedJobsSummary, type FailedJobSummary } from "@/lib/api-integration/failedJobsEndpoints";

export function FailedJobsHubSummary() {
  const [summary, setSummary] = useState<FailedJobSummary | null>(null);

  useEffect(() => {
    void getFailedJobsSummary()
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  if (!summary) {
    return <p className="text-xs text-muted-foreground mt-2">Loading system reliability summary…</p>;
  }

  return (
    <dl className="text-xs mt-2 grid grid-cols-3 gap-2">
      <div>
        <dt className="text-muted-foreground">Failed jobs</dt>
        <dd className="font-medium">{summary.failedJobs}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Critical</dt>
        <dd className="font-medium">{summary.criticalFailures}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Health score</dt>
        <dd className="font-medium">{summary.healthScore}</dd>
      </div>
    </dl>
  );
}
