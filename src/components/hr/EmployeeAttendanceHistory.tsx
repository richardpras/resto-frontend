import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  getEmployeeAttendance,
  type AttendanceRecordApiRow,
} from "@/lib/api-integration/hrEndpoints";
import { ApiHttpError } from "@/lib/api-integration/client";

type Props = {
  employeeId: number;
  limit?: number;
};

function formatWorked(row: AttendanceRecordApiRow): string {
  if (row.workedMinutes == null) return "—";
  const h = Math.floor(row.workedMinutes / 60);
  const m = row.workedMinutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "present") return "default";
  if (status === "late" || status === "early_leave") return "secondary";
  if (status === "incomplete") return "outline";
  return "destructive";
}

export function EmployeeAttendanceHistory({ employeeId, limit = 30 }: Props) {
  const [rows, setRows] = useState<AttendanceRecordApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getEmployeeAttendance(employeeId, limit)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof ApiHttpError ? e.message : "Could not load attendance");
          setRows([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId, limit]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading attendance…</p>;
  }

  if (error) {
    return <p className="text-sm text-muted-foreground">{error}</p>;
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No attendance records yet.</p>;
  }

  return (
    <ul className="space-y-2 max-h-64 overflow-y-auto">
      {rows.map((row) => (
        <li key={row.id} className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm">
          <div>
            <p className="font-medium">{row.attendanceDate}</p>
            <p className="text-xs text-muted-foreground">
              {row.clockIn ?? "—"} → {row.clockOut ?? "—"}
              {row.shift ? ` · ${row.shift.name}` : ""}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {formatWorked(row)} · {row.source.replace("_", " ")}
            </p>
          </div>
          <Badge variant={statusVariant(row.status)} className="shrink-0 text-xs capitalize">
            {row.status.replace("_", " ")}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
