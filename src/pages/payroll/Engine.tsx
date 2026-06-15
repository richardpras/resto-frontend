import { useCallback, useEffect, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/DataTable";
import {
  approvePayrollRunV2,
  calculatePayrollRunV2,
  createPayrollRunV2,
  createSalaryProfile,
  finalizePayrollRunV2,
  listLockedPayrollPreparationPeriods,
  listPayrollRunItemsV2,
  listPayrollRunsV2,
  listSalaryProfiles,
  type PayrollRunItemV2Row,
  type PayrollRunItemsV2Meta,
  type PayrollRunV2Row,
  type EmployeeSalaryProfileRow,
  type OvertimeRateType,
} from "@/lib/api-integration/hrEndpoints";
import { listOrganizationEmployees, type OrganizationEmployeeRow } from "@/lib/api-integration/organizationEndpoints";
import { useAuthStore } from "@/stores/authStore";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { Calculator, Check, Lock, Plus } from "lucide-react";
import { toast } from "sonner";

function formatIdr(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function runStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "finalized") return "default";
  if (status === "approved" || status === "calculated") return "secondary";
  return "outline";
}

export default function Engine() {
  const { t } = useErpTranslation();
  const { user } = useAuthStore();
  const outlets = user?.assignedOutlets ?? [];
  const [outletId, setOutletId] = useState<number | null>(outlets[0]?.id ?? null);

  const [profiles, setProfiles] = useState<EmployeeSalaryProfileRow[]>([]);
  const [runs, setRuns] = useState<PayrollRunV2Row[]>([]);
  const [lockedPeriods, setLockedPeriods] = useState<{ id: number; periodLabel?: string }[]>([]);
  const [employees, setEmployees] = useState<OrganizationEmployeeRow[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [items, setItems] = useState<PayrollRunItemV2Row[]>([]);
  const [itemsMeta, setItemsMeta] = useState<PayrollRunItemsV2Meta | null>(null);
  const [loading, setLoading] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    employeeId: "",
    basicSalary: "",
    defaultAllowance: "0",
    defaultDeduction: "0",
    overtimeRateType: "fixed_hourly" as OvertimeRateType,
    overtimeRateValue: "0",
    unpaidLeaveDeductionEnabled: true,
    attendanceDeductionEnabled: false,
    attendanceDeductionPerDay: "",
  });
  const [newRunPeriodId, setNewRunPeriodId] = useState("");

  const load = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const [prof, runList, locked, emps] = await Promise.all([
        listSalaryProfiles({ outletId }),
        listPayrollRunsV2(outletId),
        listLockedPayrollPreparationPeriods(outletId),
        listOrganizationEmployees(outletId),
      ]);
      setProfiles(prof);
      setRuns(runList);
      setLockedPeriods(locked);
      setEmployees(emps);
      if (runList.length > 0 && !runList.some((r) => String(r.id) === selectedRunId)) {
        setSelectedRunId(String(runList[0].id));
      }
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.engine.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [outletId, selectedRunId, t]);

  const loadItems = useCallback(async (runId: number) => {
    try {
      const { items: rows, meta } = await listPayrollRunItemsV2(runId);
      setItems(rows);
      setItemsMeta(meta);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.engine.loadItemsFailed"));
    }
  }, [t]);

  useEffect(() => {
    if (outletId === null && outlets[0]) setOutletId(outlets[0].id);
  }, [outletId, outlets]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selectedRunId) void loadItems(Number(selectedRunId));
    else {
      setItems([]);
      setItemsMeta(null);
    }
  }, [selectedRunId, loadItems]);

  const detailSummary = useMemo(() => {
    if (itemsMeta) return itemsMeta;
    return {
      totalOvertimePay: items.reduce((s, r) => s + r.overtimePay, 0),
      totalUnpaidLeaveDeduction: items.reduce((s, r) => s + r.unpaidLeaveDeduction, 0),
      totalAttendanceDeduction: items.reduce((s, r) => s + r.attendanceDeduction, 0),
      totalAdjustmentEarning: items.reduce((s, r) => s + (r.adjustmentEarning ?? 0), 0),
      totalAdjustmentDeduction: items.reduce((s, r) => s + (r.adjustmentDeduction ?? 0), 0),
      totalBonus: 0,
      totalIncentive: 0,
      totalGrossSalary: items.reduce((s, r) => s + r.grossSalary, 0),
      totalNetSalary: items.reduce((s, r) => s + r.netSalary, 0),
    };
  }, [items, itemsMeta]);

  const submitProfile = async () => {
    if (!profileForm.employeeId || !profileForm.basicSalary) {
      return toast.error(t("payroll.engine.employeeBasicRequired"));
    }
    try {
      await createSalaryProfile({
        employeeId: Number(profileForm.employeeId),
        basicSalary: Number(profileForm.basicSalary),
        defaultAllowance: Number(profileForm.defaultAllowance) || 0,
        defaultDeduction: Number(profileForm.defaultDeduction) || 0,
        overtimeRateType: profileForm.overtimeRateType,
        overtimeRateValue: Number(profileForm.overtimeRateValue) || 0,
        unpaidLeaveDeductionEnabled: profileForm.unpaidLeaveDeductionEnabled,
        attendanceDeductionEnabled: profileForm.attendanceDeductionEnabled,
        attendanceDeductionPerDay: profileForm.attendanceDeductionEnabled
          ? Number(profileForm.attendanceDeductionPerDay) || 0
          : undefined,
      });
      toast.success(t("payroll.engine.profileCreated"));
      setProfileOpen(false);
      await load();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.engine.createProfileFailed"));
    }
  };

  const submitRun = async () => {
    if (!newRunPeriodId) return toast.error(t("payroll.engine.selectLockedPeriod"));
    try {
      const created = await createPayrollRunV2(Number(newRunPeriodId));
      toast.success(t("payroll.engine.runCreated"));
      setRunOpen(false);
      setSelectedRunId(String(created.id));
      await load();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.engine.createRunFailed"));
    }
  };

  const runAction = useCallback(
    async (label: string, fn: () => Promise<void>) => {
      try {
        await fn();
        toast.success(label);
        await load();
        if (selectedRunId) await loadItems(Number(selectedRunId));
      } catch (e) {
        toast.error(formatApiErrorMessage(e, t) || t("payroll.engine.actionFailed", { label }));
      }
    },
    [load, loadItems, selectedRunId, t],
  );

  const profileColumns: Column<EmployeeSalaryProfileRow>[] = useMemo(
    () => [
      {
        key: "employee",
        header: t("payroll.shared.employee"),
        render: (p) => p.employee?.fullName ?? t("payroll.shared.employeeFallback", { id: p.employeeId }),
      },
      { key: "basic", header: t("payroll.engine.basic"), render: (p) => formatIdr(p.basicSalary) },
      { key: "allowance", header: t("payroll.shared.allowance"), render: (p) => formatIdr(p.defaultAllowance) },
      { key: "deduction", header: t("payroll.shared.deduction"), render: (p) => formatIdr(p.defaultDeduction) },
    ],
    [t],
  );

  const runColumns: Column<PayrollRunV2Row>[] = useMemo(
    () => [
      {
        key: "period",
        header: t("payroll.shared.period"),
        render: (r) =>
          r.preparationPeriod
            ? `${r.preparationPeriod.periodStart} → ${r.preparationPeriod.periodEnd}`
            : `#${r.payrollPreparationPeriodId}`,
      },
      {
        key: "status",
        header: t("payroll.shared.status"),
        render: (r) => (
          <Badge variant={runStatusVariant(r.status)} className="capitalize">
            {t(`payroll.shared.${r.status}`, { defaultValue: r.status })}
          </Badge>
        ),
      },
      { key: "items", header: t("payroll.shared.employeesCount"), render: (r) => r.itemCount ?? 0 },
      {
        key: "actions",
        header: "",
        className: "text-right",
        render: (r) => (
          <div className="flex justify-end gap-1 flex-wrap">
            {(r.status === "draft" || r.status === "calculated") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  void runAction(t("payroll.shared.calculated"), async () => {
                    await calculatePayrollRunV2(r.id);
                  })
                }
              >
                <Calculator className="h-3.5 w-3.5 mr-1" />
                {t("payroll.run.calculate")}
              </Button>
            )}
            {r.status === "calculated" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  void runAction(t("payroll.shared.approved"), async () => {
                    await approvePayrollRunV2(r.id);
                  })
                }
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                {t("payroll.shared.approve")}
              </Button>
            )}
            {r.status === "approved" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  void runAction(t("payroll.shared.finalized"), async () => {
                    await finalizePayrollRunV2(r.id);
                  })
                }
              >
                <Lock className="h-3.5 w-3.5 mr-1" />
                {t("payroll.shared.finalize")}
              </Button>
            )}
          </div>
        ),
      },
    ],
    [runAction, t],
  );

  const itemColumns: Column<PayrollRunItemV2Row>[] = useMemo(
    () => [
      {
        key: "employee",
        header: t("payroll.shared.employee"),
        render: (r) => r.employee?.fullName ?? t("payroll.shared.employeeFallback", { id: r.employeeId }),
      },
      { key: "otHrs", header: t("payroll.shared.otHours"), render: (r) => r.overtimeHours },
      { key: "otPay", header: t("payroll.engine.otPay"), render: (r) => formatIdr(r.overtimePay) },
      {
        key: "unpaidLeave",
        header: t("payroll.engine.unpaidLeave"),
        render: (r) => (r.unpaidLeaveDays > 0 ? `${r.unpaidLeaveDays}d` : "—"),
      },
      {
        key: "leaveDed",
        header: t("payroll.engine.leaveDeduction"),
        render: (r) => (r.unpaidLeaveDeduction > 0 ? formatIdr(r.unpaidLeaveDeduction) : "—"),
      },
      {
        key: "attDed",
        header: t("payroll.engine.attendanceDeduction"),
        render: (r) => (r.attendanceDeduction > 0 ? formatIdr(r.attendanceDeduction) : "—"),
      },
      {
        key: "adjEarn",
        header: t("payroll.engine.adjEarning"),
        render: (r) => (r.adjustmentEarning > 0 ? formatIdr(r.adjustmentEarning) : "—"),
      },
      {
        key: "reimb",
        header: t("payroll.engine.reimbursement"),
        render: (r) => ((r.reimbursementEarning ?? 0) > 0 ? formatIdr(r.reimbursementEarning ?? 0) : "—"),
      },
      {
        key: "adjDed",
        header: t("payroll.engine.adjDeduction"),
        render: (r) => (r.adjustmentDeduction > 0 ? formatIdr(r.adjustmentDeduction) : "—"),
      },
      {
        key: "pkp",
        header: t("payroll.engine.pkpAnnual"),
        render: (r) => ((r.annualPkp ?? 0) > 0 ? formatIdr(r.annualPkp ?? 0) : "—"),
      },
      {
        key: "pph21",
        header: t("payroll.engine.pph21"),
        render: (r) => ((r.pph21Amount ?? 0) > 0 ? formatIdr(r.pph21Amount ?? 0) : "—"),
      },
      { key: "gross", header: t("payroll.shared.gross"), render: (r) => formatIdr(r.grossSalary) },
      { key: "deductions", header: t("payroll.shared.deductions"), render: (r) => formatIdr(r.totalDeductions) },
      { key: "net", header: t("payroll.shared.net"), render: (r) => formatIdr(r.netSalary) },
    ],
    [t],
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("payroll.engine.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("payroll.engine.subtitle")}</p>
      </div>

      <Card className="p-4">
        {outlets.length > 1 && (
          <div className="max-w-xs space-y-1">
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
      </Card>

      <Tabs defaultValue="runs">
        <TabsList>
          <TabsTrigger value="runs">{t("payroll.engine.runs")}</TabsTrigger>
          <TabsTrigger value="profiles">{t("payroll.engine.profiles")}</TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedRunId}>
            {t("payroll.engine.details")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setProfileOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t("payroll.shared.addProfile")}
            </Button>
          </div>
          <DataTable
            data={profiles}
            columns={profileColumns}
            rowKey={(p) => p.id}
            loading={loading}
            emptyMessage={t("payroll.engine.emptyProfiles")}
          />
        </TabsContent>

        <TabsContent value="runs" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setRunOpen(true)} disabled={lockedPeriods.length === 0}>
              <Plus className="h-4 w-4 mr-1" />
              {t("payroll.shared.newRun")}
            </Button>
          </div>
          <DataTable
            data={runs}
            columns={runColumns}
            rowKey={(r) => r.id}
            loading={loading}
            emptyMessage={t("payroll.engine.emptyRuns")}
            onRowClick={(r) => setSelectedRunId(String(r.id))}
          />
        </TabsContent>

        <TabsContent value="details" className="mt-4 space-y-3">
          <div className="space-y-1 min-w-[200px] max-w-sm">
            <Label className="text-xs">{t("payroll.engine.payrollRun")}</Label>
            <Select value={selectedRunId} onValueChange={setSelectedRunId}>
              <SelectTrigger>
                <SelectValue placeholder={t("payroll.shared.selectRun")} />
              </SelectTrigger>
              <SelectContent>
                {runs.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {t("payroll.engine.runLabel", {
                      id: r.id,
                      status: t(`payroll.shared.${r.status}`, { defaultValue: r.status }),
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {items.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("payroll.engine.totalOtPay")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">{formatIdr(detailSummary.totalOvertimePay)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("payroll.engine.leaveDeductions")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">
                  {formatIdr(detailSummary.totalUnpaidLeaveDeduction)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("payroll.engine.attendanceDeductions")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">
                  {formatIdr(detailSummary.totalAttendanceDeduction)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("payroll.engine.totalBonus")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold text-green-600">
                  {formatIdr(detailSummary.totalBonus ?? 0)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("payroll.engine.totalIncentive")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold text-green-600">
                  {formatIdr(detailSummary.totalIncentive ?? 0)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("payroll.engine.adjustmentDeductions")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold text-destructive">
                  {formatIdr(detailSummary.totalAdjustmentDeduction ?? 0)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("payroll.engine.totalPph21")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold text-destructive">
                  {formatIdr(detailSummary.totalPph21 ?? 0)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("payroll.engine.totalTaxableIncome")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">
                  {formatIdr(detailSummary.totalTaxableIncome ?? 0)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("payroll.engine.totalReimbursements")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold text-green-600">
                  {formatIdr(detailSummary.totalReimbursements ?? 0)}
                </CardContent>
              </Card>
            </div>
          )}
          <DataTable
            data={items}
            columns={itemColumns}
            rowKey={(r) => r.id}
            emptyMessage={t("payroll.engine.emptyItems")}
            defaultPageSize={25}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("payroll.engine.employeeSalaryProfile")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>{t("payroll.shared.employee")}</Label>
              <Select value={profileForm.employeeId} onValueChange={(v) => setProfileForm({ ...profileForm, employeeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("payroll.shared.select")} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("payroll.shared.basicSalary")}</Label>
              <Input
                type="number"
                value={profileForm.basicSalary}
                onChange={(e) => setProfileForm({ ...profileForm, basicSalary: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("payroll.engine.defaultAllowance")}</Label>
                <Input
                  type="number"
                  value={profileForm.defaultAllowance}
                  onChange={(e) => setProfileForm({ ...profileForm, defaultAllowance: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("payroll.engine.defaultDeduction")}</Label>
                <Input
                  type="number"
                  value={profileForm.defaultDeduction}
                  onChange={(e) => setProfileForm({ ...profileForm, defaultDeduction: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("payroll.engine.otCalculationType")}</Label>
              <Select
                value={profileForm.overtimeRateType}
                onValueChange={(v) => setProfileForm({ ...profileForm, overtimeRateType: v as OvertimeRateType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed_hourly">{t("payroll.engine.fixedHourly")}</SelectItem>
                  <SelectItem value="multiplier_hourly_salary">{t("payroll.engine.multiplierHourly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>
                {profileForm.overtimeRateType === "fixed_hourly"
                  ? t("payroll.engine.otRateIdr")
                  : t("payroll.engine.otMultiplier")}
              </Label>
              <Input
                type="number"
                min={0}
                step={profileForm.overtimeRateType === "multiplier_hourly_salary" ? 0.1 : 1}
                value={profileForm.overtimeRateValue}
                onChange={(e) => setProfileForm({ ...profileForm, overtimeRateValue: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={profileForm.unpaidLeaveDeductionEnabled}
                onCheckedChange={(c) => setProfileForm({ ...profileForm, unpaidLeaveDeductionEnabled: !!c })}
              />
              {t("payroll.engine.deductUnpaidLeave")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={profileForm.attendanceDeductionEnabled}
                onCheckedChange={(c) => setProfileForm({ ...profileForm, attendanceDeductionEnabled: !!c })}
              />
              {t("payroll.engine.attendanceDeductionCheckbox")}
            </label>
            {profileForm.attendanceDeductionEnabled && (
              <div className="space-y-1">
                <Label>{t("payroll.engine.deductionPerAbsent")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={profileForm.attendanceDeductionPerDay}
                  onChange={(e) => setProfileForm({ ...profileForm, attendanceDeductionPerDay: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileOpen(false)}>
              {t("payroll.shared.cancel")}
            </Button>
            <Button onClick={() => void submitProfile()}>{t("payroll.shared.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={runOpen} onOpenChange={setRunOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("payroll.engine.newPayrollRun")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label>{t("payroll.engine.lockedPrepPeriod")}</Label>
            <Select value={newRunPeriodId} onValueChange={setNewRunPeriodId}>
              <SelectTrigger>
                <SelectValue placeholder={t("payroll.shared.selectPeriod")} />
              </SelectTrigger>
              <SelectContent>
                {lockedPeriods.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.periodLabel ?? t("payroll.engine.periodFallback", { id: p.id })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunOpen(false)}>
              {t("payroll.shared.cancel")}
            </Button>
            <Button onClick={() => void submitRun()}>{t("payroll.shared.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
