import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiHttpError } from "@/lib/api-integration/client";
import { type EssDashboard } from "@/lib/api-integration/essEndpoints";
import { useEmployeeAuthStore } from "@/stores/employeeAuthStore";
import { Calendar, ClipboardList, Palmtree, Receipt } from "lucide-react";
import { toast } from "sonner";

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export default function EmployeeDashboard() {
  const fetchDashboard = useEmployeeAuthStore((s) => s.fetchDashboard);
  const [data, setData] = useState<EssDashboard | null>(null);

  useEffect(() => {
    void fetchDashboard()
      .then(setData)
      .catch((e) => toast.error(e instanceof ApiHttpError ? e.message : "Failed to load dashboard"));
  }, [fetchDashboard]);

  if (!data) {
    return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Welcome, {data.employee.fullName}</h2>
        <p className="text-sm text-muted-foreground">Your employee self service overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">My Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {data.todaySchedule?.shift ? (
              <p className="text-sm">
                Today: <span className="font-medium">{data.todaySchedule.shift.name}</span>
                {data.todaySchedule.shift.startTime && (
                  <span className="text-muted-foreground">
                    {" "}
                    ({data.todaySchedule.shift.startTime} – {data.todaySchedule.shift.endTime})
                  </span>
                )}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No published shift for today</p>
            )}
            {data.upcomingShifts.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">{data.upcomingShifts.length} upcoming shift(s)</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">My Attendance</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>
              Present: <span className="font-medium">{data.attendanceSummary.presentDays}</span> days this month
            </p>
            <p className="text-muted-foreground">
              Absent: {data.attendanceSummary.absentDays} · Late: {data.attendanceSummary.lateCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <Palmtree className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">My Leave Balance</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {data.leaveBalanceSummary.length === 0 ? (
              <p className="text-muted-foreground">No leave balances configured</p>
            ) : (
              data.leaveBalanceSummary.map((b) => (
                <p key={b.leaveTypeId}>
                  {b.leaveTypeName ?? "Leave"}: <span className="font-medium">{b.remainingDays}</span> remaining
                </p>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Latest Payslip</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {data.latestPayslip ? (
              <div>
                <p className="font-medium">{data.latestPayslip.payslipNo}</p>
                <p className="text-green-600">{formatIDR(data.latestPayslip.netSalary)}</p>
                <p className="text-muted-foreground text-xs mt-1">{data.latestPayslip.status}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">No payslips yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
