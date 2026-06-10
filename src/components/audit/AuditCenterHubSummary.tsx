import { useEffect, useState } from "react";
import { getAuditCenterSummary, type AuditCenterSummary } from "@/lib/api-integration/auditCenterEndpoints";

export function AuditCenterHubSummary() {
  const [summary, setSummary] = useState<AuditCenterSummary | null>(null);

  useEffect(() => {
    void getAuditCenterSummary()
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  if (!summary) {
    return <p className="text-xs text-muted-foreground mt-2">Loading audit summary…</p>;
  }

  return (
    <dl className="text-xs mt-2 grid grid-cols-3 gap-2">
      <div>
        <dt className="text-muted-foreground">Today</dt>
        <dd className="font-medium">{summary.todayEvents}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Critical</dt>
        <dd className="font-medium">{summary.criticalEvents}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Active users</dt>
        <dd className="font-medium">{summary.activeUsers}</dd>
      </div>
    </dl>
  );
}
