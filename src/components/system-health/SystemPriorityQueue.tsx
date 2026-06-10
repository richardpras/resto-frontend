import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import type { SystemPriorityAction } from "@/lib/system-health/systemHealthPriorityQueue";

function levelBadge(level: SystemPriorityAction["level"]) {
  if (level === "critical") return <Badge variant="destructive">Critical</Badge>;
  if (level === "high") return <Badge className="bg-warning/15 text-warning border-warning/30">High</Badge>;
  return <Badge variant="secondary">Warning</Badge>;
}

export function SystemPriorityQueue({ actions }: { actions: SystemPriorityAction[] }) {
  if (actions.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No priority actions required.</p>;
  }

  return (
    <ul className="space-y-2">
      {actions.map((action) => (
        <li key={action.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
          <div className="shrink-0 pt-0.5">{levelBadge(action.level)}</div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{action.title}</p>
            <p className="text-muted-foreground">{action.message}</p>
            <Link to={action.actionUrl} className="text-xs text-primary hover:underline mt-1 inline-block">
              Take action →
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
