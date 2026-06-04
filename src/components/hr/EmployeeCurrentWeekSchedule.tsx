import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getEmployeeSchedule, type EmployeeScheduleDay } from "@/lib/api-integration/hrEndpoints";
import { ApiHttpError } from "@/lib/api-integration/client";

type Props = {
  employeeId: number;
  weekStart?: string;
};

function mondayOfWeek(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + "T12:00:00") : new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

export function EmployeeCurrentWeekSchedule({ employeeId, weekStart }: Props) {
  const [days, setDays] = useState<EmployeeScheduleDay[]>([]);
  const [range, setRange] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getEmployeeSchedule(employeeId, weekStart ?? mondayOfWeek())
      .then((data) => {
        if (!cancelled) {
          setDays(data.days);
          setRange(`${data.weekStart} → ${data.weekEnd}`);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof ApiHttpError ? e.message : "Could not load schedule");
          setDays([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId, weekStart]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading schedule…</p>;
  }

  if (error) {
    return <p className="text-sm text-muted-foreground">{error}</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Week: {range}</p>
      <ul className="space-y-2">
        {days.map((day) => (
          <li key={day.date} className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm">
            <div>
              <p className="font-medium">{day.dayName}</p>
              {day.shift ? (
                <>
                  <p>{day.shift.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {day.shift.startTime} – {day.shift.endTime}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">Off</p>
              )}
            </div>
            {day.status === "published" && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                Published
              </Badge>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
