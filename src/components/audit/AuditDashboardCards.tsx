import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuditCenterSummary } from "@/lib/api-integration/auditCenterEndpoints";

type AuditDashboardCardsProps = {
  summary: AuditCenterSummary | null;
  loading?: boolean;
};

export function AuditDashboardCards({ summary, loading = false }: AuditDashboardCardsProps) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Today&apos;s Events</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{summary.todayEvents}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Active Users</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{summary.activeUsers}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Financial Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{summary.financialChanges}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Critical Events</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-destructive">{summary.criticalEvents}</p>
        </CardContent>
      </Card>
    </div>
  );
}
