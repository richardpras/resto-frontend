import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { UnifiedAuditRecord } from "@/lib/api-integration/auditCenterEndpoints";
import { AuditRiskBadge } from "./AuditRiskBadge";

type AuditTimelineProps = {
  records: UnifiedAuditRecord[];
  loading?: boolean;
  emptyMessage?: string;
  onSelect?: (record: UnifiedAuditRecord) => void;
};

export function AuditTimeline({
  records,
  loading = false,
  emptyMessage = "No audit events found.",
  onSelect,
}: AuditTimelineProps) {
  if (loading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{emptyMessage}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Module</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Risk</TableHead>
          <TableHead className="w-[80px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => (
          <TableRow key={record.id}>
            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(record.timestamp), { addSuffix: true })}
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="capitalize">
                {record.module}
              </Badge>
            </TableCell>
            <TableCell className="font-mono text-xs max-w-[200px] truncate">{record.action}</TableCell>
            <TableCell className="text-xs">
              {record.entityType} #{record.entityId}
            </TableCell>
            <TableCell className="text-sm">{record.userName ?? "—"}</TableCell>
            <TableCell>
              <AuditRiskBadge level={record.metadata.riskLevel} />
            </TableCell>
            <TableCell>
              {onSelect ? (
                <Button variant="ghost" size="sm" onClick={() => onSelect(record)}>
                  Details
                </Button>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
