import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  approvePayrollPreparationPeriod,
  createPayrollPreparationPeriod,
  deletePayrollPreparationPeriod,
  generatePayrollPreparationSnapshot,
  getPayrollPreparationSummary,
  listPayrollPreparationPeriods,
  listPayrollPreparationSnapshots,
  lockPayrollPreparationPeriod,
  type PayrollPreparationPeriodRow,
  type PayrollPreparationSnapshotRow,
  type PayrollPreparationSummaryRow,
} from "@/lib/api-integration/hrEndpoints";
import { useAuthStore } from "@/stores/authStore";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { Lock, Play, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

function periodStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "locked") return "default";
  if (status === "approved") return "secondary";
  return "outline";
}

export default function Preparation() {
  const { t } = useErpTranslation();
  const { user } = useAuthStore();
  const outlets = user?.assignedOutlets ?? [];
  const [outletId, setOutletId] = useState<number | null>(outlets[0]?.id ?? null);

  const [periods, setPeriods] = useState<PayrollPreparationPeriodRow[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [snapshots, setSnapshots] = useState<PayrollPreparationSnapshotRow[]>([]);
  const [summary, setSummary] = useState<PayrollPreparationSummaryRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [periodForm, setPeriodForm] = useState({ periodStart: "", periodEnd: "" });

  const selectedPeriod = periods.find((p) => String(p.id) === selectedPeriodId);

  const loadPeriods = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const rows = await listPayrollPreparationPeriods(outletId);
      setPeriods(rows);
      if (rows.length > 0 && !rows.some((p) => String(p.id) === selectedPeriodId)) {
        setSelectedPeriodId(String(rows[0].id));
      }
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.preparation.loadPeriodsFailed"));
    } finally {
      setLoading(false);
    }
  }, [outletId, selectedPeriodId, t]);

  const loadSnapshotsAndSummary = useCallback(async (periodId: number) => {
    try {
      const [snaps, sum] = await Promise.all([
        listPayrollPreparationSnapshots(periodId),
        getPayrollPreparationSummary(periodId),
      ]);
      setSnapshots(snaps);
      setSummary(sum);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.preparation.loadSnapshotFailed"));
    }
  }, [t]);

  useEffect(() => {
    if (outletId === null && outlets[0]) setOutletId(outlets[0].id);
  }, [outletId, outlets]);

  useEffect(() => {
    void loadPeriods();
  }, [loadPeriods]);

  useEffect(() => {
    if (selectedPeriodId) void loadSnapshotsAndSummary(Number(selectedPeriodId));
    else {
      setSnapshots([]);
      setSummary(null);
    }
  }, [selectedPeriodId, loadSnapshotsAndSummary]);

  const submitPeriod = async () => {
    if (!outletId || !periodForm.periodStart || !periodForm.periodEnd) {
      return toast.error(t("payroll.preparation.fillPeriodDates"));
    }
    try {
      const created = await createPayrollPreparationPeriod({
        outletId,
        periodStart: periodForm.periodStart,
        periodEnd: periodForm.periodEnd,
      });
      toast.success(t("payroll.preparation.periodCreatedWithAttendance"));
      setPeriodOpen(false);
      setSelectedPeriodId(String(created.id));
      await loadPeriods();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.preparation.createPeriodFailed"));
    }
  };

  const runAction = useCallback(
    async (successKey: string, fn: () => Promise<void>) => {
      try {
        await fn();
        toast.success(t(successKey));
        await loadPeriods();
        if (selectedPeriodId) await loadSnapshotsAndSummary(Number(selectedPeriodId));
      } catch (e) {
        toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.actionFailed"));
      }
    },
    [t, loadPeriods, loadSnapshotsAndSummary, selectedPeriodId],
  );

  const periodColumns: Column<PayrollPreparationPeriodRow>[] = useMemo(
    () => [
      {
        key: "period",
        header: t("payroll.shared.period"),
        sortable: true,
        render: (p) => p.periodLabel ?? `${p.periodStart} → ${p.periodEnd}`,
      },
      {
        key: "status",
        header: t("payroll.shared.status"),
        render: (p) => (
          <Badge variant={periodStatusVariant(p.status)} className="capitalize">
            {t(`payroll.shared.${p.status}`, { defaultValue: p.status })}
          </Badge>
        ),
      },
      {
        key: "attendanceStatus",
        header: t("payroll.preparation.attendanceStatus"),
        render: (p) =>
          p.attendancePeriodStatus ? (
            <Badge variant={periodStatusVariant(p.attendancePeriodStatus)} className="capitalize">
              {t(`payroll.shared.${p.attendancePeriodStatus}`, { defaultValue: p.attendancePeriodStatus })}
            </Badge>
          ) : (
            "—"
          ),
      },
      { key: "employees", header: t("payroll.shared.employeesCount"), render: (p) => p.employeeCount ?? 0 },
      {
        key: "generated",
        header: t("payroll.shared.generatedAt"),
        render: (p) => (p.generatedAt ? new Date(p.generatedAt).toLocaleString() : "—"),
      },
      {
        key: "actions",
        header: "",
        className: "text-right",
        render: (p) => (
          <div className="flex justify-end gap-1">
            {p.status !== "locked" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  void runAction("payroll.preparation.snapshotGenerated", async () => {
                    await generatePayrollPreparationSnapshot(p.id);
                  })
                }
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                {t("payroll.shared.generate")}
              </Button>
            )}
            {p.status === "draft" && p.generatedAt && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  void runAction("payroll.preparation.periodApproved", async () => {
                    await approvePayrollPreparationPeriod(p.id);
                  })
                }
              >
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                {t("payroll.shared.approve")}
              </Button>
            )}
            {p.status === "approved" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  void runAction("payroll.preparation.periodLocked", async () => {
                    await lockPayrollPreparationPeriod(p.id);
                  })
                }
              >
                <Lock className="h-3.5 w-3.5 mr-1" />
                {t("payroll.shared.lock")}
              </Button>
            )}
            {p.status === "draft" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  const label = p.periodLabel ?? `${p.periodStart} → ${p.periodEnd}`;
                  if (!window.confirm(t("payroll.preparation.periodDeleteConfirm", { period: label }))) {
                    return;
                  }
                  void runAction("payroll.preparation.periodDeleted", async () => {
                    await deletePayrollPreparationPeriod(p.id);
                    if (String(p.id) === selectedPeriodId) {
                      setSelectedPeriodId("");
                    }
                  });
                }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                {t("payroll.shared.delete")}
              </Button>
            )}
          </div>
        ),
      },
    ],
    [t, runAction, selectedPeriodId],
  );

  const snapshotColumns: Column<PayrollPreparationSnapshotRow>[] = useMemo(
    () => [
      {
        key: "employee",
        header: t("payroll.shared.employee"),
        sortable: true,
        render: (r) => r.employee?.fullName ?? t("payroll.shared.employeeFallback", { id: r.employeeId }),
      },
      {
        key: "attendance",
        header: t("payroll.attendance.title"),
        render: (r) =>
          t("payroll.preparation.attendancePresent", {
            present: r.attendedDays,
            absent: r.absentDays,
            scheduled: r.scheduledDays,
          }),
      },
      {
        key: "leave",
        header: t("payroll.tabs.leave"),
        render: (r) =>
          t("payroll.preparation.leaveSummary", {
            days: r.leaveDays,
            paid: r.paidLeaveDays,
            unpaid: r.unpaidLeaveDays,
          }),
      },
      {
        key: "overtime",
        header: t("payroll.tabs.overtime"),
        render: (r) => t("payroll.preparation.overtimeSummary", { hours: r.overtimeHours }),
      },
      {
        key: "review",
        header: t("payroll.shared.review"),
        render: (r) =>
          r.reviewRequired ? <Badge variant="destructive">{t("payroll.shared.required")}</Badge> : "—",
      },
    ],
    [t],
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("payroll.preparation.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("payroll.preparation.subtitle")}</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {outlets.length > 1 && (
            <div className="space-y-1 min-w-[180px]">
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
          <div className="space-y-1 min-w-[200px]">
            <Label className="text-xs">{t("payroll.preparation.viewPeriod")}</Label>
            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
              <SelectTrigger>
                <SelectValue placeholder={t("payroll.shared.selectPeriod")} />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.periodLabel ?? `${p.periodStart} → ${p.periodEnd}`} ({t(`payroll.shared.${p.status}`, { defaultValue: p.status })})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="periods">
        <TabsList>
          <TabsTrigger value="periods">{t("payroll.preparation.periods")}</TabsTrigger>
          <TabsTrigger value="snapshot" disabled={!selectedPeriodId}>
            {t("payroll.preparation.snapshot")}
          </TabsTrigger>
          <TabsTrigger value="summary" disabled={!selectedPeriodId}>
            {t("payroll.preparation.summary")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="periods" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setPeriodOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t("payroll.shared.newPeriod")}
            </Button>
          </div>
          <DataTable
            data={periods}
            columns={periodColumns}
            rowKey={(p) => p.id}
            loading={loading}
            emptyMessage={t("payroll.preparation.emptyPeriods")}
            defaultPageSize={15}
          />
        </TabsContent>

        <TabsContent value="snapshot" className="mt-4">
          {selectedPeriod && (
            <p className="text-sm text-muted-foreground mb-3">
              {selectedPeriod.periodLabel ?? `${selectedPeriod.periodStart} → ${selectedPeriod.periodEnd}`} ·{" "}
              <span className="capitalize">{t(`payroll.shared.${selectedPeriod.status}`, { defaultValue: selectedPeriod.status })}</span>
              {selectedPeriod.generatedAt &&
                ` · ${t("payroll.preparation.generatedAt", { date: new Date(selectedPeriod.generatedAt).toLocaleString() })}`}
            </p>
          )}
          <DataTable
            data={snapshots}
            columns={snapshotColumns}
            rowKey={(r) => r.id}
            emptyMessage={t("payroll.preparation.emptySnapshot")}
            defaultPageSize={25}
          />
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          {summary ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("payroll.shared.employeesCount")}</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{summary.employeeCount}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("payroll.preparation.attendanceDaysCard")}</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{summary.attendanceDays}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("payroll.preparation.leaveDaysCard")}</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{summary.leaveDays}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("payroll.preparation.overtimeHoursCard")}</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{summary.overtimeHours}</CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("payroll.preparation.selectPeriodSnapshot")}</p>
          )}
          {summary && summary.reviewRequiredCount > 0 && (
            <p className="text-sm text-destructive mt-3">
              {t("payroll.preparation.reviewRequiredCount", { count: summary.reviewRequiredCount })}
            </p>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={periodOpen} onOpenChange={setPeriodOpen}>
        <DialogContent className={`${dialogSize.lg} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>{t("payroll.preparation.newPeriod")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("payroll.shared.startDate")}</Label>
              <Input
                type="date"
                value={periodForm.periodStart}
                onChange={(e) => setPeriodForm({ ...periodForm, periodStart: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("payroll.shared.endDate")}</Label>
              <Input
                type="date"
                value={periodForm.periodEnd}
                onChange={(e) => setPeriodForm({ ...periodForm, periodEnd: e.target.value })}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t("payroll.preparation.periodCreatesAttendance")}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPeriodOpen(false)}>
              {t("payroll.shared.cancel")}
            </Button>
            <Button onClick={() => void submitPeriod()}>{t("payroll.shared.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
