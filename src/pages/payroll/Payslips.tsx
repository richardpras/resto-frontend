import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  downloadPayslipPdf,
  generatePayslips,
  listPayrollRunsV2,
  listPayslips,
  publishPayslip,
  regeneratePayslip,
  type PayrollPayslipRow,
  type PayrollRunV2Row,
} from "@/lib/api-integration/hrEndpoints";
import { listOrganizationEmployees, type OrganizationEmployeeRow } from "@/lib/api-integration/organizationEndpoints";
import { useAuthStore } from "@/stores/authStore";
import { Download, FileText, Play, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    value,
  );
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "published" || status === "finalized") return "default";
  if (status === "generated") return "secondary";
  return "outline";
}

export default function Payslips() {
  const { user } = useAuthStore();
  const outlets = user?.assignedOutlets ?? [];
  const [outletId, setOutletId] = useState<number | null>(outlets[0]?.id ?? null);

  const [runs, setRuns] = useState<PayrollRunV2Row[]>([]);
  const [payslips, setPayslips] = useState<PayrollPayslipRow[]>([]);
  const [employees, setEmployees] = useState<OrganizationEmployeeRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPeriodFrom, setFilterPeriodFrom] = useState("");
  const [filterPeriodTo, setFilterPeriodTo] = useState("");

  const load = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const [runList, slipList, emps] = await Promise.all([
        listPayrollRunsV2(outletId),
        listPayslips({
          outletId,
          employeeId: filterEmployeeId ? Number(filterEmployeeId) : undefined,
          status: filterStatus || undefined,
          periodFrom: filterPeriodFrom || undefined,
          periodTo: filterPeriodTo || undefined,
        }),
        listOrganizationEmployees(outletId),
      ]);
      setRuns(runList);
      setPayslips(slipList);
      setEmployees(emps);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load payslips");
    } finally {
      setLoading(false);
    }
  }, [outletId, filterEmployeeId, filterStatus, filterPeriodFrom, filterPeriodTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const finalizedRuns = useMemo(() => runs.filter((r) => r.status === "finalized"), [runs]);

  const payslipCountForRun = (runId: number) => payslips.filter((p) => p.payrollRunId === runId).length;

  const generateForRun = async (runId: number) => {
    try {
      const created = await generatePayslips(runId);
      toast.success(`Generated ${created.length} payslip(s)`);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Generate failed");
    }
  };

  const download = async (id: number, payslipNo: string) => {
    try {
      const blob = await downloadPayslipPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${payslipNo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Download failed");
    }
  };

  const runColumns: Column<PayrollRunV2Row>[] = [
    {
      key: "period",
      header: "Period",
      render: (r) =>
        r.preparationPeriod
          ? `${r.preparationPeriod.periodStart} → ${r.preparationPeriod.periodEnd}`
          : `#${r.payrollPreparationPeriodId}`,
    },
    { key: "id", header: "Run ID", render: (r) => r.id },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
    },
    {
      key: "payslips",
      header: "Payslips",
      render: (r) => payslipCountForRun(r.id),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (r) => (
        <Button size="sm" onClick={() => void generateForRun(r.id)}>
          <Play className="h-3.5 w-3.5 mr-1" />
          Generate Payslips
        </Button>
      ),
    },
  ];

  const slipColumns: Column<PayrollPayslipRow>[] = [
    { key: "no", header: "Payslip No", sortable: true, render: (p) => p.payslipNo },
    {
      key: "employee",
      header: "Employee",
      render: (p) => p.employee?.fullName ?? `#${p.employeeId}`,
    },
    {
      key: "period",
      header: "Period",
      render: (p) =>
        p.payrollPeriod ? `${p.payrollPeriod.periodStart} → ${p.payrollPeriod.periodEnd}` : "—",
    },
    { key: "net", header: "Net", render: (p) => formatIDR(p.netSalary) },
    {
      key: "status",
      header: "Status",
      render: (p) => <Badge variant={statusVariant(p.status)}>{p.status}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (p) => (
        <div className="flex justify-end gap-1 flex-wrap">
          {p.pdfAvailable && (
            <Button size="sm" variant="outline" onClick={() => void download(p.id, p.payslipNo)}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}
          {p.status === "generated" && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await publishPayslip(p.id);
                  toast.success("Published");
                  await load();
                } catch (e) {
                  toast.error(e instanceof ApiHttpError ? e.message : "Publish failed");
                }
              }}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          )}
          {p.pdfAvailable && (
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  await regeneratePayslip(p.id);
                  toast.success("PDF regenerated");
                  await load();
                } catch (e) {
                  toast.error(e instanceof ApiHttpError ? e.message : "Regenerate failed");
                }
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <h2 className="text-lg font-semibold">Payslips</h2>
        {outlets.length > 1 && (
          <Select value={outletId ? String(outletId) : ""} onValueChange={(v) => setOutletId(Number(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Outlet" />
            </SelectTrigger>
            <SelectContent>
              {outlets.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs defaultValue="runs">
        <TabsList>
          <TabsTrigger value="runs">Payroll Runs</TabsTrigger>
          <TabsTrigger value="list">Payslip List</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="mt-4 space-y-3">
          <Card className="p-4 text-sm text-muted-foreground">
            <FileText className="h-4 w-4 inline mr-2" />
            Only <strong>finalized</strong> payroll runs can generate payslips. Amounts are snapshotted at
            generation time.
          </Card>
          <DataTable
            data={finalizedRuns}
            columns={runColumns}
            rowKey={(r) => r.id}
            emptyMessage={loading ? "Loading…" : "No finalized payroll runs"}
            defaultPageSize={10}
          />
        </TabsContent>

        <TabsContent value="list" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Employee</Label>
              <Select
                value={filterEmployeeId || "__all__"}
                onValueChange={(v) => setFilterEmployeeId(v === "__all__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={filterStatus || "__all__"} onValueChange={(v) => setFilterStatus(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Period from</Label>
              <Input type="date" value={filterPeriodFrom} onChange={(e) => setFilterPeriodFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Period to</Label>
              <Input type="date" value={filterPeriodTo} onChange={(e) => setFilterPeriodTo(e.target.value)} />
            </div>
          </div>
          <DataTable
            data={payslips}
            columns={slipColumns}
            rowKey={(p) => p.id}
            emptyMessage={loading ? "Loading…" : "No payslips"}
            defaultPageSize={15}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
