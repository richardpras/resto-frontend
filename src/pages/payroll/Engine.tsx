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
import { ApiHttpError } from "@/lib/api-integration/client";
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
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load payroll engine data");
    } finally {
      setLoading(false);
    }
  }, [outletId, selectedRunId]);

  const loadItems = useCallback(async (runId: number) => {
    try {
      const { items: rows, meta } = await listPayrollRunItemsV2(runId);
      setItems(rows);
      setItemsMeta(meta);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load payroll items");
    }
  }, []);

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
      return toast.error("Employee and basic salary required");
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
      toast.success("Salary profile created");
      setProfileOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to create profile");
    }
  };

  const submitRun = async () => {
    if (!newRunPeriodId) return toast.error("Select a locked preparation period");
    try {
      const created = await createPayrollRunV2(Number(newRunPeriodId));
      toast.success("Payroll run created");
      setRunOpen(false);
      setSelectedRunId(String(created.id));
      await load();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to create run");
    }
  };

  const runAction = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn();
      toast.success(label);
      await load();
      if (selectedRunId) await loadItems(Number(selectedRunId));
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : `${label} failed`);
    }
  };

  const profileColumns: Column<EmployeeSalaryProfileRow>[] = [
    {
      key: "employee",
      header: "Employee",
      render: (p) => p.employee?.fullName ?? `#${p.employeeId}`,
    },
    { key: "basic", header: "Basic", render: (p) => formatIdr(p.basicSalary) },
    { key: "allowance", header: "Allowance", render: (p) => formatIdr(p.defaultAllowance) },
    { key: "deduction", header: "Deduction", render: (p) => formatIdr(p.defaultDeduction) },
  ];

  const runColumns: Column<PayrollRunV2Row>[] = [
    {
      key: "period",
      header: "Period",
      render: (r) =>
        r.preparationPeriod
          ? `${r.preparationPeriod.periodStart} → ${r.preparationPeriod.periodEnd}`
          : `#${r.payrollPreparationPeriodId}`,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Badge variant={runStatusVariant(r.status)} className="capitalize">
          {r.status}
        </Badge>
      ),
    },
    { key: "items", header: "Employees", render: (r) => r.itemCount ?? 0 },
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
                void runAction("Calculated", async () => {
                  await calculatePayrollRunV2(r.id);
                })
              }
            >
              <Calculator className="h-3.5 w-3.5 mr-1" />
              Calculate
            </Button>
          )}
          {r.status === "calculated" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void runAction("Approved", async () => {
                  await approvePayrollRunV2(r.id);
                })
              }
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Approve
            </Button>
          )}
          {r.status === "approved" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void runAction("Finalized", async () => {
                  await finalizePayrollRunV2(r.id);
                })
              }
            >
              <Lock className="h-3.5 w-3.5 mr-1" />
              Finalize
            </Button>
          )}
        </div>
      ),
    },
  ];

  const itemColumns: Column<PayrollRunItemV2Row>[] = [
    {
      key: "employee",
      header: "Employee",
      render: (r) => r.employee?.fullName ?? `#${r.employeeId}`,
    },
    { key: "otHrs", header: "OT Hours", render: (r) => r.overtimeHours },
    { key: "otPay", header: "OT Pay", render: (r) => formatIdr(r.overtimePay) },
    {
      key: "unpaidLeave",
      header: "Unpaid Leave",
      render: (r) => (r.unpaidLeaveDays > 0 ? `${r.unpaidLeaveDays}d` : "—"),
    },
    {
      key: "leaveDed",
      header: "Leave Deduction",
      render: (r) => (r.unpaidLeaveDeduction > 0 ? formatIdr(r.unpaidLeaveDeduction) : "—"),
    },
    {
      key: "attDed",
      header: "Attendance Deduction",
      render: (r) => (r.attendanceDeduction > 0 ? formatIdr(r.attendanceDeduction) : "—"),
    },
    {
      key: "adjEarn",
      header: "Adj. Earning",
      render: (r) => (r.adjustmentEarning > 0 ? formatIdr(r.adjustmentEarning) : "—"),
    },
    {
      key: "reimb",
      header: "Reimbursement",
      render: (r) => ((r.reimbursementEarning ?? 0) > 0 ? formatIdr(r.reimbursementEarning ?? 0) : "—"),
    },
    {
      key: "adjDed",
      header: "Adj. Deduction",
      render: (r) => (r.adjustmentDeduction > 0 ? formatIdr(r.adjustmentDeduction) : "—"),
    },
    {
      key: "pkp",
      header: "PKP (annual)",
      render: (r) => ((r.annualPkp ?? 0) > 0 ? formatIdr(r.annualPkp ?? 0) : "—"),
    },
    {
      key: "pph21",
      header: "PPh21",
      render: (r) => ((r.pph21Amount ?? 0) > 0 ? formatIdr(r.pph21Amount ?? 0) : "—"),
    },
    { key: "gross", header: "Gross", render: (r) => formatIdr(r.grossSalary) },
    { key: "deductions", header: "Deductions", render: (r) => formatIdr(r.totalDeductions) },
    { key: "net", header: "Net", render: (r) => formatIdr(r.netSalary) },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Payroll Engine</h2>
        <p className="text-sm text-muted-foreground">
          Calculate gross and net salary from locked preparation snapshots. BPJS and PPh21 apply when configured. No accounting posting.
        </p>
      </div>

      <Card className="p-4">
        {outlets.length > 1 && (
          <div className="max-w-xs space-y-1">
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
      </Card>

      <Tabs defaultValue="runs">
        <TabsList>
          <TabsTrigger value="runs">Payroll Runs</TabsTrigger>
          <TabsTrigger value="profiles">Salary Profiles</TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedRunId}>
            Payroll Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setProfileOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add profile
            </Button>
          </div>
          <DataTable
            data={profiles}
            columns={profileColumns}
            rowKey={(p) => p.id}
            loading={loading}
            emptyMessage="No salary profiles"
          />
        </TabsContent>

        <TabsContent value="runs" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setRunOpen(true)} disabled={lockedPeriods.length === 0}>
              <Plus className="h-4 w-4 mr-1" />
              New run
            </Button>
          </div>
          <DataTable
            data={runs}
            columns={runColumns}
            rowKey={(r) => r.id}
            loading={loading}
            emptyMessage="No payroll runs"
            onRowClick={(r) => setSelectedRunId(String(r.id))}
          />
        </TabsContent>

        <TabsContent value="details" className="mt-4 space-y-3">
          <div className="space-y-1 min-w-[200px] max-w-sm">
            <Label className="text-xs">Payroll run</Label>
            <Select value={selectedRunId} onValueChange={setSelectedRunId}>
              <SelectTrigger>
                <SelectValue placeholder="Select run" />
              </SelectTrigger>
              <SelectContent>
                {runs.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    Run #{r.id} ({r.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {items.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total OT Pay</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">{formatIdr(detailSummary.totalOvertimePay)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Leave Deductions</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">
                  {formatIdr(detailSummary.totalUnpaidLeaveDeduction)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Deductions</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">
                  {formatIdr(detailSummary.totalAttendanceDeduction)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Bonus</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold text-green-600">
                  {formatIdr(detailSummary.totalBonus ?? 0)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Incentive</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold text-green-600">
                  {formatIdr(detailSummary.totalIncentive ?? 0)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Adjustment Deductions</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold text-destructive">
                  {formatIdr(detailSummary.totalAdjustmentDeduction ?? 0)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total PPh21</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold text-destructive">
                  {formatIdr(detailSummary.totalPph21 ?? 0)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Taxable Income</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">
                  {formatIdr(detailSummary.totalTaxableIncome ?? 0)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Reimbursements</CardTitle>
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
            emptyMessage="Calculate payroll to see line items"
            defaultPageSize={25}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Employee salary profile</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Employee</Label>
              <Select value={profileForm.employeeId} onValueChange={(v) => setProfileForm({ ...profileForm, employeeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
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
              <Label>Basic salary</Label>
              <Input
                type="number"
                value={profileForm.basicSalary}
                onChange={(e) => setProfileForm({ ...profileForm, basicSalary: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Default allowance</Label>
                <Input
                  type="number"
                  value={profileForm.defaultAllowance}
                  onChange={(e) => setProfileForm({ ...profileForm, defaultAllowance: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Default deduction</Label>
                <Input
                  type="number"
                  value={profileForm.defaultDeduction}
                  onChange={(e) => setProfileForm({ ...profileForm, defaultDeduction: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>OT calculation type</Label>
              <Select
                value={profileForm.overtimeRateType}
                onValueChange={(v) => setProfileForm({ ...profileForm, overtimeRateType: v as OvertimeRateType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed_hourly">Fixed hourly rate</SelectItem>
                  <SelectItem value="multiplier_hourly_salary">Multiplier × hourly salary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>
                {profileForm.overtimeRateType === "fixed_hourly" ? "OT rate (IDR/hour)" : "OT multiplier"}
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
              Deduct unpaid leave (basic ÷ 30 per day)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={profileForm.attendanceDeductionEnabled}
                onCheckedChange={(c) => setProfileForm({ ...profileForm, attendanceDeductionEnabled: !!c })}
              />
              Attendance deduction (per absent day)
            </label>
            {profileForm.attendanceDeductionEnabled && (
              <div className="space-y-1">
                <Label>Deduction per absent day</Label>
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
              Cancel
            </Button>
            <Button onClick={() => void submitProfile()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={runOpen} onOpenChange={setRunOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New payroll run</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label>Locked preparation period</Label>
            <Select value={newRunPeriodId} onValueChange={setNewRunPeriodId}>
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {lockedPeriods.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.periodLabel ?? `Period #${p.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitRun()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
