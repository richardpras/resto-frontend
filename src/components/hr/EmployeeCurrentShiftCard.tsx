import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getEmployeeShiftHistory, type ShiftAssignmentApiRow } from "@/lib/api-integration/hrEndpoints";
import { ApiHttpError } from "@/lib/api-integration/client";

type Props = {
  employeeId: number;
};

function formatRange(from: string, until: string | null, isActive: boolean): string {
  const end = until ?? (isActive ? "Present" : "—");
  return `${from} → ${end}`;
}

export function EmployeeCurrentShiftCard({ employeeId }: Props) {
  const [current, setCurrent] = useState<ShiftAssignmentApiRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getEmployeeShiftHistory(employeeId)
      .then((data) => {
        if (!cancelled) setCurrent(data.current);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof ApiHttpError ? e.message : "Could not load shift");
          setCurrent(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading current shift…</p>;
  }

  if (error) {
    return <p className="text-sm text-muted-foreground">{error}</p>;
  }

  if (!current?.shift) {
    return <p className="text-sm text-muted-foreground">No shift assigned for the current period.</p>;
  }

  return (
    <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-foreground">{current.shift.name}</span>
        <Badge variant="secondary">Current shift</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {current.shift.startTime} – {current.shift.endTime}
      </p>
      <p className="text-xs text-muted-foreground">
        Effective: {formatRange(current.effectiveFrom, current.effectiveUntil, current.isActive)}
      </p>
    </div>
  );
}
