import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/DataTable";
import { ApiHttpError } from "@/lib/api-integration/client";
import {
  approveAttendancePeriod,
  createAttendancePeriod,
  getAttendancePayrollPreparation,
  listAttendancePeriods,
  listAttendanceSummaries,
  lockAttendancePeriod,
  reviewAttendanceSummary,
  type AttendanceDailySummaryRow,
  type AttendancePayrollPrepMeta,
  type AttendancePayrollPrepRow,
  type AttendancePeriodLockRow,
  type AttendanceReviewType,
} from "@/lib/api-integration/hrEndpoints";
import { useAuthStore } from "@/stores/authStore";
import { Download } from "lucide-react";
import { toast } from "sonner";

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 13);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function formatWorked(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function periodBadgeVariant(
  status: AttendancePayrollPrepMeta["lockStatus"],
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "locked") return "destructive";
  if (status === "approved") return "default";
  if (status === "draft") return "secondary";
  return "outline";
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "present") return "default";
  if (status === "late" || status === "early_leave") return "secondary";
  if (status === "review_required" || status === "incomplete") return "outline";
  return "destructive";
}

function isException(row: AttendanceDailySummaryRow): boolean {
  return (
    row.isAbsent ||
    row.isIncomplete ||
    row.requiresReview ||
    row.attendanceStatus === "review_required" ||
    row.attendanceStatus === "absent" ||
    row.attendanceStatus === "incomplete"
  );
}

function exportPrepCsv(rows: AttendancePayrollPrepRow[]) {
  const header = "Employee No,Full Name,Attendance Days,Absent Days,Late Count,Late Minutes,Early Leave Count,Worked Minutes";
  const lines = rows.map(
    (r) =>
      `${r.employeeNo ?? ""},"${(r.fullName ?? "").replace(/"/g, '""')}",${r.attendanceDays},${r.absentDays},${r.lateCount},${r.lateMinutes},${r.earlyLeaveCount},${r.workedMinutes}`,
  );
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance-payroll-prep-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AttendanceReview() {
  const { user } = useAuthStore();
  const outlets = user?.assignedOutlets ?? [];
  const range = useMemo(() => defaultRange(), []);

  const [outletId, setOutletId] = useState<number | null>(outlets[0]?.id ?? null);
  const [fromDate, setFromDate] = useState(range.from);
  const [toDate, setToDate] = useState(range.to);
  const [summaries, setSummaries] = useState<AttendanceDailySummaryRow[]>([]);
  const [prepRows, setPrepRows] = useState<AttendancePayrollPrepRow[]>([]);
  const [prepMeta, setPrepMeta] = useState<AttendancePayrollPrepMeta | null>(null);
  const [periods, setPeriods] = useState<AttendancePeriodLockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [prepLoading, setPrepLoading] = useState(false);
  const [periodsLoading, setPeriodsLoading] = useState(false);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<AttendanceDailySummaryRow | null>(null);
  const [reviewType, setReviewType] = useState<AttendanceReviewType>("approved");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);

  const loadSummaries = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const data = await listAttendanceSummaries({ outletId, fromDate, toDate });
      setSummaries(data);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load summaries");
    } finally {
      setLoading(false);
    }
  }, [outletId, fromDate, toDate]);

  const loadPrep = useCallback(async () => {
    if (!outletId) return;
    setPrepLoading(true);
    try {
      const { meta, employees } = await getAttendancePayrollPreparation({
        outletId,
        periodStart: fromDate,
        periodEnd: toDate,
      });
      setPrepMeta(meta);
      setPrepRows(employees);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load payroll preparation");
    } finally {
      setPrepLoading(false);
    }
  }, [outletId, fromDate, toDate]);

  const loadPeriods = useCallback(async () => {
    if (!outletId) return;
    setPeriodsLoading(true);
    try {
      setPeriods(await listAttendancePeriods(outletId));
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load attendance periods");
    } finally {
      setPeriodsLoading(false);
    }
  }, [outletId]);

  const createPeriod = async () => {
    if (!outletId) return;
    try {
      await createAttendancePeriod({ outletId, periodStart: fromDate, periodEnd: toDate });
      toast.success("Attendance period created");
      await Promise.all([loadPeriods(), loadPrep()]);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to create period");
    }
  };

  const canReview = prepMeta?.lockStatus !== "locked" && prepMeta?.lockStatus !== "approved";

  useEffect(() => {
    if (outletId === null && outlets[0]) setOutletId(outlets[0].id);
  }, [outletId, outlets]);

  useEffect(() => {
    void loadSummaries();
  }, [loadSummaries]);

  useEffect(() => {
    void loadPrep();
  }, [loadPrep]);

  useEffect(() => {
    void loadPeriods();
  }, [loadPeriods]);

  const exceptions = useMemo(() => summaries.filter(isException), [summaries]);

  const openReview = (row: AttendanceDailySummaryRow) => {
    setReviewTarget(row);
    setReviewType("approved");
    setReviewNotes("");
    setReviewOpen(true);
  };

  const submitReview = async () => {
    if (!reviewTarget) return;
    setReviewSaving(true);
    try {
      await reviewAttendanceSummary(reviewTarget.id, { reviewType, notes: reviewNotes || undefined });
      toast.success("Review saved");
      setReviewOpen(false);
      await loadSummaries();
      await loadPrep();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Review failed");
    } finally {
      setReviewSaving(false);
    }
  };

  const summaryColumns: Column<AttendanceDailySummaryRow>[] = [
    {
      key: "employee",
      header: "Employee",
      sortable: true,
      render: (r) => r.employee?.fullName ?? `#${r.employeeId}`,
    },
    { key: "date", header: "Date", sortable: true, render: (r) => r.attendanceDate },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (r) => (
        <Badge variant={statusVariant(r.attendanceStatus)} className="capitalize">
          {r.attendanceStatus.replace("_", " ")}
        </Badge>
      ),
    },
    { key: "late", header: "Late (min)", render: (r) => (r.lateMinutes > 0 ? r.lateMinutes : "—") },
    {
      key: "early",
      header: "Early leave (min)",
      render: (r) => (r.earlyLeaveMinutes > 0 ? r.earlyLeaveMinutes : "—"),
    },
    { key: "worked", header: "Worked", render: (r) => formatWorked(r.workedMinutes) },
    {
      key: "actions",
      header: "",
      className: "text-right w-24",
      render: (r) =>
        canReview && (r.requiresReview || isException(r)) ? (
          <Button variant="outline" size="sm" onClick={() => openReview(r)}>
            Review
          </Button>
        ) : null,
    },
  ];

  const periodColumns: Column<AttendancePeriodLockRow>[] = [
    {
      key: "period",
      header: "Period",
      sortable: true,
      render: (r) => r.periodLabel ?? `${r.periodStart} → ${r.periodEnd}`,
    },
    { key: "employees", header: "Employees", render: (r) => r.employeeCount ?? "—" },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Badge variant={periodBadgeVariant(r.status)} className="capitalize">
          {r.status}
        </Badge>
      ),
    },
    {
      key: "approvedAt",
      header: "Approved At",
      render: (r) => (r.approvedAt ? new Date(r.approvedAt).toLocaleString() : "—"),
    },
    {
      key: "lockedAt",
      header: "Locked At",
      render: (r) => (r.lockedAt ? new Date(r.lockedAt).toLocaleString() : "—"),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          {r.status === "draft" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void approveAttendancePeriod(r.id)
                  .then(() => {
                    toast.success("Period approved");
                    return Promise.all([loadPeriods(), loadPrep()]);
                  })
                  .catch((e) => toast.error(e instanceof ApiHttpError ? e.message : "Approve failed"))
              }
            >
              Approve
            </Button>
          )}
          {r.status === "approved" && (
            <Button
              variant="default"
              size="sm"
              onClick={() =>
                void lockAttendancePeriod(r.id)
                  .then(() => {
                    toast.success("Period locked");
                    return Promise.all([loadPeriods(), loadPrep(), loadSummaries()]);
                  })
                  .catch((e) => toast.error(e instanceof ApiHttpError ? e.message : "Lock failed"))
              }
            >
              Lock
            </Button>
          )}
        </div>
      ),
    },
  ];

  const prepColumns: Column<AttendancePayrollPrepRow>[] = [
    { key: "name", header: "Employee", sortable: true, render: (r) => r.fullName ?? `#${r.employeeId}` },
    { key: "attendanceDays", header: "Attendance days", sortable: true },
    { key: "absentDays", header: "Absences", sortable: true },
    { key: "lateCount", header: "Late count", sortable: true },
    { key: "lateMinutes", header: "Late minutes", sortable: true },
    { key: "earlyLeaveCount", header: "Early leave", sortable: true },
    { key: "worked", header: "Worked hours", render: (r) => formatWorked(r.workedMinutes) },
    { key: "overtimeHours", header: "OT hours", sortable: true, render: (r) => r.overtimeHours ?? 0 },
    { key: "overtimeMinutes", header: "OT minutes", render: (r) => r.overtimeMinutes ?? 0 },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Attendance Review</h2>
        <p className="text-sm text-muted-foreground">
          Daily summaries, exceptions, and read-only payroll preparation metrics.
        </p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {outlets.length > 1 && (
            <div className="space-y-1">
              <Label className="text-xs">Outlet</Label>
              <Select value={outletId ? String(outletId) : ""} onValueChange={(v) => setOutletId(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {outlets.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => void Promise.all([loadSummaries(), loadPrep(), loadPeriods()])}
            >
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Daily Attendance</TabsTrigger>
          <TabsTrigger value="exceptions">Exceptions ({exceptions.length})</TabsTrigger>
          <TabsTrigger value="periods">Attendance Periods</TabsTrigger>
          <TabsTrigger value="prep">Payroll Preparation</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4">
          <DataTable
            data={summaries}
            columns={summaryColumns}
            rowKey={(r) => r.id}
            loading={loading}
            searchPlaceholder="Search employee or date..."
            searchKeys={["attendanceDate"]}
            emptyMessage="No summaries for this period. Run attendance:generate-summaries or wait for the daily job."
            defaultPageSize={25}
          />
        </TabsContent>

        <TabsContent value="exceptions" className="mt-4">
          <DataTable
            data={exceptions}
            columns={summaryColumns}
            rowKey={(r) => r.id}
            loading={loading}
            emptyMessage="No exceptions in this period"
            defaultPageSize={25}
          />
        </TabsContent>

        <TabsContent value="periods" className="mt-4 space-y-3">
          <div className="flex justify-between items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Approve attendance for HR sign-off, then lock before payroll processing.
            </p>
            <Button size="sm" onClick={() => void createPeriod()}>
              Create period ({fromDate} → {toDate})
            </Button>
          </div>
          <DataTable
            data={periods}
            columns={periodColumns}
            rowKey={(r) => r.id}
            loading={periodsLoading}
            emptyMessage="No attendance periods yet"
            defaultPageSize={10}
          />
        </TabsContent>

        <TabsContent value="prep" className="mt-4 space-y-3">
          <div className="flex justify-between items-center gap-2">
            {prepMeta?.lockStatus ? (
              <Badge variant={periodBadgeVariant(prepMeta.lockStatus)} className="capitalize">
                Period: {prepMeta.lockStatus}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">No attendance period for selected range</span>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={prepRows.length === 0}
              onClick={() => exportPrepCsv(prepRows)}
            >
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </div>
          <DataTable
            data={prepRows}
            columns={prepColumns}
            rowKey={(r) => r.employeeId}
            loading={prepLoading}
            emptyMessage="No preparation data for this period"
            defaultPageSize={25}
          />
          <p className="text-xs text-muted-foreground">
            Read-only metrics for future payroll runs. No deductions or payroll generation in this phase.
          </p>
        </TabsContent>
      </Tabs>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review attendance</DialogTitle>
          </DialogHeader>
          {reviewTarget && (
            <p className="text-sm text-muted-foreground">
              {reviewTarget.employee?.fullName} · {reviewTarget.attendanceDate}
            </p>
          )}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Review type</Label>
              <Select value={reviewType} onValueChange={(v) => setReviewType(v as AttendanceReviewType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="corrected">Corrected</SelectItem>
                  <SelectItem value="excused_absence">Excused absence</SelectItem>
                  <SelectItem value="ignored">Ignored</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitReview()} disabled={reviewSaving}>
              Save review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
