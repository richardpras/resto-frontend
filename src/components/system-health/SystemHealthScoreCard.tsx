import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SystemHealthStatusBadge } from "@/components/system-health/SystemHealthStatusBadge";
import type { SystemHealthSeverity } from "@/lib/system-health/systemHealthScore";

type Props = {
  score: number;
  severity: SystemHealthSeverity;
  partial?: boolean;
  loading?: boolean;
  subtitle?: string;
};

export function SystemHealthScoreCard({ score, severity, partial, loading, subtitle }: Props) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Platform Score</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Platform Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-end gap-3">
          <span className="text-4xl font-bold tabular-nums">{score}</span>
          <SystemHealthStatusBadge severity={severity} />
        </div>
        {partial ? (
          <p className="text-xs text-muted-foreground">Partial score — some modules unavailable</p>
        ) : null}
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </CardContent>
    </Card>
  );
}
