import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { UnifiedAuditRecord } from "@/lib/api-integration/auditCenterEndpoints";
import { AuditRiskBadge } from "./AuditRiskBadge";

type AuditHistoryDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: UnifiedAuditRecord | null;
  history: UnifiedAuditRecord[];
  loading?: boolean;
};

function JsonBlock({ label, data }: { label: string; data: Record<string, unknown> }) {
  const hasData = Object.keys(data).length > 0;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      {hasData ? (
        <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto max-h-48">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : (
        <p className="text-xs text-muted-foreground">No data</p>
      )}
    </div>
  );
}

export function AuditHistoryDrawer({
  open,
  onOpenChange,
  record,
  history,
  loading = false,
}: AuditHistoryDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Audit Details</SheetTitle>
          <SheetDescription>
            {record
              ? `${record.entityType} #${record.entityId} — ${record.action}`
              : "Select an audit event to view details."}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <Skeleton className="h-48 w-full mt-4" />
        ) : record ? (
          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="capitalize">
                {record.module}
              </Badge>
              <AuditRiskBadge level={record.metadata.riskLevel} />
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Timestamp</dt>
                <dd>{format(new Date(record.timestamp), "PPpp")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">User</dt>
                <dd>{record.userName ?? "System"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Outlet</dt>
                <dd>{record.outletId ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Action</dt>
                <dd className="font-mono text-xs">{record.action}</dd>
              </div>
            </dl>

            <JsonBlock label="Before" data={record.before} />
            <JsonBlock label="After" data={record.after} />

            {history.length > 1 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Entity timeline ({history.length} events)</p>
                <ul className="space-y-2 text-xs border-l-2 border-muted pl-3">
                  {history.map((item) => (
                    <li key={item.id}>
                      <span className="text-muted-foreground">
                        {format(new Date(item.timestamp), "MMM d HH:mm")}
                      </span>
                      {" — "}
                      <span className="font-mono">{item.action}</span>
                      {item.userName ? ` by ${item.userName}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
