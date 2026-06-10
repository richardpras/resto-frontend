import { Badge } from "@/components/ui/badge";
import type { AuditRiskLevel } from "@/lib/api-integration/auditCenterEndpoints";

export function AuditRiskBadge({ level }: { level?: AuditRiskLevel | string }) {
  if (level === "critical") {
    return <Badge variant="destructive">Critical</Badge>;
  }
  if (level === "warning") {
    return <Badge className="bg-warning/15 text-warning border-warning/30">Warning</Badge>;
  }
  return <Badge variant="secondary">Info</Badge>;
}
