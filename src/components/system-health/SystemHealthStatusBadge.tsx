import { Badge } from "@/components/ui/badge";
import type { SystemHealthSeverity } from "@/lib/system-health/systemHealthScore";

export function SystemHealthStatusBadge({ severity }: { severity: SystemHealthSeverity | string }) {
  const normalized = severity.toLowerCase();
  if (normalized === "critical") return <Badge variant="destructive">Critical</Badge>;
  if (normalized === "degraded" || normalized === "high") {
    return <Badge className="bg-warning/15 text-warning border-warning/30">Degraded</Badge>;
  }
  if (normalized === "warning") return <Badge variant="secondary">Warning</Badge>;
  return <Badge className="bg-success/15 text-success border-success/30">Healthy</Badge>;
}
