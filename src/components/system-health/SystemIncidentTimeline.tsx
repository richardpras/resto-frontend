import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import type { SystemIncidentItem } from "@/lib/system-health/systemHealthIncidents";

function severityBadge(severity: SystemIncidentItem["severity"]) {
  if (severity === "critical") return <Badge variant="destructive">Critical</Badge>;
  if (severity === "high") return <Badge className="bg-warning/15 text-warning border-warning/30">High</Badge>;
  if (severity === "warning") return <Badge variant="secondary">Warning</Badge>;
  return <Badge variant="outline">Info</Badge>;
}

export function SystemIncidentTimeline({ incidents }: { incidents: SystemIncidentItem[] }) {
  if (incidents.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No active incidents detected.</p>;
  }

  return (
    <ul className="space-y-3">
      {incidents.map((item) => (
        <li key={item.id} className="rounded-lg border p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {severityBadge(item.severity)}
            <Badge variant="outline">{item.module}</Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(item.timestamp).toLocaleString()}
            </span>
          </div>
          <p className="font-medium">{item.title}</p>
          <p className="text-muted-foreground mt-1">{item.message}</p>
          {item.actionUrl ? (
            <Link to={item.actionUrl} className="text-xs text-primary hover:underline mt-2 inline-block">
              View details →
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
