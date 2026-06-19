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
import { dialogScroll, dialogSize } from "@/lib/ui/dialogSizes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/DataTable";
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
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
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
  const { t } = useErpTranslation();
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
      toast.error(formatApiErrorMessage(e, t) || t("payroll.attendanceReview.loadSummariesFailed"));
    } finally {
      setLoading(false);
    }
  }, [outletId, fromDate, toDate, t]);

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
      toast.error(formatApiErrorMessage(e, t) || t("payroll.attendanceReview.loadPrepFailed"));
    } finally {
      setPrepLoading(false);
    }
  }, [outletId, fromDate, toDate, t]);

  const loadPeriods = useCallback(async () => {
    if (!outletId) return;
    setPeriodsLoading(true);
    try {
      setPeriods(await listAttendancePeriods(outletId));
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.attendanceReview.loadPeriodsFailed"));
    } finally {
      setPeriodsLoading(false);
    }
  }, [outletId, t]);

  const createPeriod = async () => {
    if (!outletId) return;
    try {
      await createAttendancePeriod({ outletId, periodStart: fromDate, periodEnd: toDate });
      toast.success(t("payroll.attendanceReview.periodCreated"));
      await Promise.all([loadPeriods(), loadPrep()]);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.attendanceReview.createPeriodFailed"));
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
      toast.success(t("payroll.attendanceReview.reviewSaved"));
      setReviewOpen(false);
      await loadSummaries();
      await loadPrep();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.attendanceReview.reviewFailed"));
    } finally {
      setReviewSaving(false);
    }
  };

  const summaryColumns: Column<AttendanceDailySummaryRow>[] = useMemo(
    () => [
      {
        key: "employee",
        header: t("payroll.shared.employee"),
        sortable: true,
        render: (r) => r.employee?.fullName ?? t("payroll.shared.employeeFallback", { id: r.employeeId }),
      },
      { key: "date", header: t("payroll.shared.date"), sortable: true, render: (r) => r.attendanceDate },
      {
        key: "status",
        header: t("payroll.shared.status"),
        sortable: true,
        render: (r) => (
          <Badge variant={statusVariant(r.attendanceStatus)} className="capitalize">
            {t(`payroll.attendance.statuses.${r.attendanceStatus}`, {
              defaultValue: r.attendanceStatus.replace("_", " "),
            })}
          </Badge>
        ),
      },
      { key: "late", header: t("payroll.shared.lateMin"), render: (r) => (r.lateMinutes > 0 ? r.lateMinutes : "—") },
      {
        key: "early",
        header: t("payroll.shared.earlyLeaveMin"),
        render: (r) => (r.earlyLeaveMinutes > 0 ? r.earlyLeaveMinutes : "—"),
      },
      { key: "worked", header: t("payroll.attendance.worked"), render: (r) => formatWorked(r.workedMinutes) },
      {
        key: "actions",
        header: "",
        className: "text-right w-24",
        render: (r) =>
          canReview && (r.requiresReview || isException(r)) ? (
            <Button variant="outline" size="sm" onClick={() => openReview(r)}>
              {t("payroll.shared.review")}
            </Button>
          ) : null,
      },
    ],
    [t, canReview],
  );

  const periodColumns: Column<AttendancePeriodLockRow>[] = useMemo(
    () => [
      {
        key: "period",
        header: t("payroll.shared.period"),
        sortable: true,
        render: (r) => r.periodLabel ?? `${r.periodStart} → ${r.periodEnd}`,
      },
      { key: "employees", header: t("payroll.shared.employeesCount"), render: (r) => r.employeeCount ?? "—" },
      {
        key: "status",
        header: t("payroll.shared.status"),
        render: (r) => (
          <Badge variant={periodBadgeVariant(r.status)} className="capitalize">
            {t(`payroll.shared.${r.status}`, { defaultValue: r.status })}
          </Badge>
        ),
      },
      {
        key: "approvedAt",
        header: t("payroll.shared.approvedAt"),
        render: (r) => (r.approvedAt ? new Date(r.approvedAt).toLocaleString() : "—"),
      },
      {
        key: "lockedAt",
        header: t("payroll.shared.lockedAt"),
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
                      toast.success(t("payroll.attendanceReview.periodApproved"));
                      return Promise.all([loadPeriods(), loadPrep()]);
                    })
                    .catch((e) => toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.approveFailed")))
                }
              >
                {t("payroll.shared.approve")}
              </Button>
            )}
            {r.status === "approved" && (
              <Button
                variant="default"
                size="sm"
                onClick={() =>
                  void lockAttendancePeriod(r.id)
                    .then(() => {
                      toast.success(t("payroll.attendanceReview.periodLocked"));
                      return Promise.all([loadPeriods(), loadPrep(), loadSummaries()]);
                    })
                    .catch((e) => toast.error(formatApiErrorMessage(e, t) || t("payroll.attendanceReview.lockFailed")))
                }
              >
                {t("payroll.shared.lock")}
              </Button>
            )}
          </div>
        ),
      },
    ],
    [t, loadPeriods, loadPrep, loadSummaries],
  );

  const prepColumns: Column<AttendancePayrollPrepRow>[] = useMemo(
    () => [
      {
        key: "name",
        header: t("payroll.shared.employee"),
        sortable: true,
        render: (r) => r.fullName ?? t("payroll.shared.employeeFallback", { id: r.employeeId }),
      },
      { key: "attendanceDays", header: t("payroll.shared.attendanceDays"), sortable: true },
      { key: "absentDays", header: t("payroll.shared.absences"), sortable: true },
      { key: "lateCount", header: t("payroll.shared.lateCount"), sortable: true },
      { key: "lateMinutes", header: t("payroll.shared.lateMin"), sortable: true },
      { key: "earlyLeaveCount", header: t("payroll.shared.earlyLeave"), sortable: true },
      { key: "worked", header: t("payroll.shared.workedHours"), render: (r) => formatWorked(r.workedMinutes) },
      { key: "overtimeHours", header: t("payroll.shared.otHours"), sortable: true, render: (r) => r.overtimeHours ?? 0 },
      { key: "overtimeMinutes", header: t("payroll.shared.otMinutes"), render: (r) => r.overtimeMinutes ?? 0 },
    ],
    [t],
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("payroll.attendanceReview.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("payroll.attendanceReview.subtitle")}</p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {outlets.length > 1 && (
            <div className="space-y-1">
              <Label className="text-xs">{t("payroll.shared.outlet")}</Label>
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
            <Label className="text-xs">{t("payroll.shared.from")}</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("payroll.shared.to")}</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => void Promise.all([loadSummaries(), loadPrep(), loadPeriods()])}
            >
              {t("payroll.shared.refresh")}
            </Button>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">{t("payroll.attendanceReview.dailyAttendance")}</TabsTrigger>
          <TabsTrigger value="exceptions">{t("payroll.attendanceReview.exceptions")} ({exceptions.length})</TabsTrigger>
          <TabsTrigger value="periods">{t("payroll.attendanceReview.attendancePeriods")}</TabsTrigger>
          <TabsTrigger value="prep">{t("payroll.attendanceReview.payrollPreparation")}</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4">
          <DataTable
            data={summaries}
            columns={summaryColumns}
            rowKey={(r) => r.id}
            loading={loading}
            searchPlaceholder={t("payroll.attendanceReview.searchSummary")}
            searchKeys={["attendanceDate"]}
            emptyMessage={t("payroll.attendanceReview.emptySummaries")}
            defaultPageSize={25}
          />
        </TabsContent>

        <TabsContent value="exceptions" className="mt-4">
          <DataTable
            data={exceptions}
            columns={summaryColumns}
            rowKey={(r) => r.id}
            loading={loading}
            emptyMessage={t("payroll.attendanceReview.emptyExceptions")}
            defaultPageSize={25}
          />
        </TabsContent>

        <TabsContent value="periods" className="mt-4 space-y-3">
          <div className="flex justify-between items-center gap-2">
            <p className="text-sm text-muted-foreground">{t("payroll.attendanceReview.periodsHint")}</p>
            <Button size="sm" onClick={() => void createPeriod()}>
              {t("payroll.attendanceReview.createPeriod", { from: fromDate, to: toDate })}
            </Button>
          </div>
          <DataTable
            data={periods}
            columns={periodColumns}
            rowKey={(r) => r.id}
            loading={periodsLoading}
            emptyMessage={t("payroll.attendanceReview.emptyPeriods")}
            defaultPageSize={10}
          />
        </TabsContent>

        <TabsContent value="prep" className="mt-4 space-y-3">
          <div className="flex justify-between items-center gap-2">
            {prepMeta?.lockStatus ? (
              <Badge variant={periodBadgeVariant(prepMeta.lockStatus)} className="capitalize">
                {t("payroll.shared.periodLabel", { status: t(`payroll.shared.${prepMeta.lockStatus}`, { defaultValue: prepMeta.lockStatus }) })}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">{t("payroll.attendanceReview.noPeriodForRange")}</span>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={prepRows.length === 0}
              onClick={() => exportPrepCsv(prepRows)}
            >
              <Download className="h-4 w-4 mr-1" />
              {t("payroll.shared.exportCsv")}
            </Button>
          </div>
          <DataTable
            data={prepRows}
            columns={prepColumns}
            rowKey={(r) => r.employeeId}
            loading={prepLoading}
            emptyMessage={t("payroll.attendanceReview.emptyPrep")}
            defaultPageSize={25}
          />
          <p className="text-xs text-muted-foreground">{t("payroll.attendanceReview.prepReadOnlyHint")}</p>
        </TabsContent>
      </Tabs>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className={`${dialogSize.xl} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>{t("payroll.attendanceReview.reviewAttendance")}</DialogTitle>
          </DialogHeader>
          {reviewTarget && (
            <p className="text-sm text-muted-foreground">
              {reviewTarget.employee?.fullName} · {reviewTarget.attendanceDate}
            </p>
          )}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t("payroll.shared.reviewType")}</Label>
              <Select value={reviewType} onValueChange={(v) => setReviewType(v as AttendanceReviewType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">{t("payroll.shared.approved")}</SelectItem>
                  <SelectItem value="corrected">{t("payroll.shared.corrected")}</SelectItem>
                  <SelectItem value="excused_absence">{t("payroll.shared.excusedAbsence")}</SelectItem>
                  <SelectItem value="ignored">{t("payroll.shared.ignored")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("payroll.shared.notes")}</Label>
              <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              {t("payroll.shared.cancel")}
            </Button>
            <Button onClick={() => void submitReview()} disabled={reviewSaving}>
              {t("payroll.shared.saveReview")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
