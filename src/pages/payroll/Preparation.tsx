import { useCallback, useEffect, useState } from "react";
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
  approvePayrollPreparationPeriod,
  createPayrollPreparationPeriod,
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
import { Lock, Play, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

function periodStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "locked") return "default";
  if (status === "approved") return "secondary";
  return "outline";
}

export default function Preparation() {
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
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load periods");
    } finally {
      setLoading(false);
    }
  }, [outletId, selectedPeriodId]);

  const loadSnapshotsAndSummary = useCallback(async (periodId: number) => {
    try {
      const [snaps, sum] = await Promise.all([
        listPayrollPreparationSnapshots(periodId),
        getPayrollPreparationSummary(periodId),
      ]);
      setSnapshots(snaps);
      setSummary(sum);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load snapshot data");
    }
  }, []);

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
      return toast.error("Fill period dates");
    }
    try {
      const created = await createPayrollPreparationPeriod({
        outletId,
        periodStart: periodForm.periodStart,
        periodEnd: periodForm.periodEnd,
      });
      toast.success("Preparation period created");
      setPeriodOpen(false);
      setSelectedPeriodId(String(created.id));
      await loadPeriods();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to create period");
    }
  };

  const runAction = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn();
      toast.success(label);
      await loadPeriods();
      if (selectedPeriodId) await loadSnapshotsAndSummary(Number(selectedPeriodId));
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : `${label} failed`);
    }
  };

  const periodColumns: Column<PayrollPreparationPeriodRow>[] = [
    {
      key: "period",
      header: "Period",
      sortable: true,
      render: (p) => p.periodLabel ?? `${p.periodStart} → ${p.periodEnd}`,
    },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <Badge variant={periodStatusVariant(p.status)} className="capitalize">
          {p.status}
        </Badge>
      ),
    },
    { key: "employees", header: "Employees", render: (p) => p.employeeCount ?? 0 },
    {
      key: "generated",
      header: "Generated At",
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
                void runAction("Snapshot generated", async () => {
                  await generatePayrollPreparationSnapshot(p.id);
                })
              }
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              Generate
            </Button>
          )}
          {p.status === "draft" && p.generatedAt && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void runAction("Period approved", async () => {
                  await approvePayrollPreparationPeriod(p.id);
                })
              }
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
              Approve
            </Button>
          )}
          {p.status === "approved" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void runAction("Period locked", async () => {
                  await lockPayrollPreparationPeriod(p.id);
                })
              }
            >
              <Lock className="h-3.5 w-3.5 mr-1" />
              Lock
            </Button>
          )}
        </div>
      ),
    },
  ];

  const snapshotColumns: Column<PayrollPreparationSnapshotRow>[] = [
    {
      key: "employee",
      header: "Employee",
      sortable: true,
      render: (r) => r.employee?.fullName ?? `#${r.employeeId}`,
    },
    {
      key: "attendance",
      header: "Attendance",
      render: (r) => `${r.attendedDays} present / ${r.absentDays} absent / ${r.scheduledDays} scheduled`,
    },
    {
      key: "leave",
      header: "Leave",
      render: (r) => `${r.leaveDays}d (${r.paidLeaveDays} paid, ${r.unpaidLeaveDays} unpaid)`,
    },
    {
      key: "overtime",
      header: "Overtime",
      render: (r) => `${r.overtimeHours}h`,
    },
    {
      key: "review",
      header: "Review",
      render: (r) => (r.reviewRequired ? <Badge variant="destructive">Required</Badge> : "—"),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Payroll Preparation</h2>
        <p className="text-sm text-muted-foreground">
          Consolidate approved attendance, leave, and overtime into payroll-ready snapshots.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {outlets.length > 1 && (
            <div className="space-y-1 min-w-[180px]">
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
          <div className="space-y-1 min-w-[200px]">
            <Label className="text-xs">View period</Label>
            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.periodLabel ?? `${p.periodStart} → ${p.periodEnd}`} ({p.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="periods">
        <TabsList>
          <TabsTrigger value="periods">Periods</TabsTrigger>
          <TabsTrigger value="snapshot" disabled={!selectedPeriodId}>
            Snapshot
          </TabsTrigger>
          <TabsTrigger value="summary" disabled={!selectedPeriodId}>
            Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="periods" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setPeriodOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New period
            </Button>
          </div>
          <DataTable
            data={periods}
            columns={periodColumns}
            rowKey={(p) => p.id}
            loading={loading}
            emptyMessage="No preparation periods"
            defaultPageSize={15}
          />
        </TabsContent>

        <TabsContent value="snapshot" className="mt-4">
          {selectedPeriod && (
            <p className="text-sm text-muted-foreground mb-3">
              {selectedPeriod.periodLabel ?? `${selectedPeriod.periodStart} → ${selectedPeriod.periodEnd}`} ·{" "}
              <span className="capitalize">{selectedPeriod.status}</span>
              {selectedPeriod.generatedAt && ` · Generated ${new Date(selectedPeriod.generatedAt).toLocaleString()}`}
            </p>
          )}
          <DataTable
            data={snapshots}
            columns={snapshotColumns}
            rowKey={(r) => r.id}
            emptyMessage="Generate a snapshot to view employee rows"
            defaultPageSize={25}
          />
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          {summary ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Employees</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{summary.employeeCount}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Days</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{summary.attendanceDays}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Leave Days</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{summary.leaveDays}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Overtime Hours</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{summary.overtimeHours}</CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select a period and generate a snapshot.</p>
          )}
          {summary && summary.reviewRequiredCount > 0 && (
            <p className="text-sm text-destructive mt-3">
              {summary.reviewRequiredCount} employee(s) require review before payroll processing.
            </p>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={periodOpen} onOpenChange={setPeriodOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New preparation period</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start</Label>
              <Input
                type="date"
                value={periodForm.periodStart}
                onChange={(e) => setPeriodForm({ ...periodForm, periodStart: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>End</Label>
              <Input
                type="date"
                value={periodForm.periodEnd}
                onChange={(e) => setPeriodForm({ ...periodForm, periodEnd: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPeriodOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitPeriod()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
