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
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
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
  const { t } = useErpTranslation();
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
      toast.error(formatApiErrorMessage(e, t) || t("payroll.payslips.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [outletId, filterEmployeeId, filterStatus, filterPeriodFrom, filterPeriodTo, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const finalizedRuns = useMemo(() => runs.filter((r) => r.status === "finalized"), [runs]);

  const payslipCountForRun = (runId: number) => payslips.filter((p) => p.payrollRunId === runId).length;

  const generateForRun = async (runId: number) => {
    try {
      const created = await generatePayslips(runId);
      toast.success(t("payroll.payslips.generatedCount", { count: created.length }));
      await load();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.payslips.generateFailed"));
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
      toast.error(formatApiErrorMessage(e, t) || t("payroll.payslips.downloadFailed"));
    }
  };

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
      { key: "id", header: t("payroll.shared.runId"), render: (r) => r.id },
      {
        key: "status",
        header: t("payroll.shared.status"),
        render: (r) => (
          <Badge variant={statusVariant(r.status)}>
            {t(`payroll.shared.${r.status}`, { defaultValue: r.status })}
          </Badge>
        ),
      },
      {
        key: "payslips",
        header: t("payroll.payslips.title"),
        render: (r) => payslipCountForRun(r.id),
      },
      {
        key: "actions",
        header: t("payroll.shared.actions"),
        className: "text-right",
        render: (r) => (
          <Button size="sm" onClick={() => void generateForRun(r.id)}>
            <Play className="h-3.5 w-3.5 mr-1" />
            {t("payroll.payslips.generatePayslips")}
          </Button>
        ),
      },
    ],
    [t],
  );

  const slipColumns: Column<PayrollPayslipRow>[] = useMemo(
    () => [
      { key: "no", header: t("payroll.payslips.payslipNo"), sortable: true, render: (p) => p.payslipNo },
      {
        key: "employee",
        header: t("payroll.shared.employee"),
        render: (p) => p.employee?.fullName ?? t("payroll.shared.employeeFallback", { id: p.employeeId }),
      },
      {
        key: "period",
        header: t("payroll.shared.period"),
        render: (p) =>
          p.payrollPeriod ? `${p.payrollPeriod.periodStart} → ${p.payrollPeriod.periodEnd}` : "—",
      },
      { key: "net", header: t("payroll.shared.net"), render: (p) => formatIDR(p.netSalary) },
      {
        key: "status",
        header: t("payroll.shared.status"),
        render: (p) => (
          <Badge variant={statusVariant(p.status)}>
            {t(`payroll.shared.${p.status}`, { defaultValue: p.status })}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: t("payroll.shared.actions"),
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
                    toast.success(t("payroll.shared.published_status"));
                    await load();
                  } catch (e) {
                    toast.error(formatApiErrorMessage(e, t) || t("payroll.payslips.publishFailed"));
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
                    toast.success(t("payroll.payslips.pdfRegenerated"));
                    await load();
                  } catch (e) {
                    toast.error(formatApiErrorMessage(e, t) || t("payroll.payslips.regenerateFailed"));
                  }
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [t, load],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <h2 className="text-lg font-semibold">{t("payroll.payslips.title")}</h2>
        {outlets.length > 1 && (
          <Select value={outletId ? String(outletId) : ""} onValueChange={(v) => setOutletId(Number(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("payroll.shared.outlet")} />
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
          <TabsTrigger value="runs">{t("payroll.payslips.runsTab")}</TabsTrigger>
          <TabsTrigger value="list">{t("payroll.payslips.listTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="mt-4 space-y-3">
          <Card className="p-4 text-sm text-muted-foreground">
            <FileText className="h-4 w-4 inline mr-2" />
            {t("payroll.payslips.finalizedHint")}
          </Card>
          <DataTable
            data={finalizedRuns}
            columns={runColumns}
            rowKey={(r) => r.id}
            emptyMessage={loading ? t("payroll.shared.loading") : t("payroll.payslips.emptyRuns")}
            defaultPageSize={10}
          />
        </TabsContent>

        <TabsContent value="list" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("payroll.shared.employee")}</Label>
              <Select
                value={filterEmployeeId || "__all__"}
                onValueChange={(v) => setFilterEmployeeId(v === "__all__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("payroll.shared.all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("payroll.shared.all")}</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("payroll.shared.status")}</Label>
              <Select value={filterStatus || "__all__"} onValueChange={(v) => setFilterStatus(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("payroll.shared.all")}</SelectItem>
                  <SelectItem value="generated">{t("payroll.shared.generated")}</SelectItem>
                  <SelectItem value="published">{t("payroll.shared.published_status")}</SelectItem>
                  <SelectItem value="draft">{t("payroll.shared.draft")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("payroll.shared.periodFrom")}</Label>
              <Input type="date" value={filterPeriodFrom} onChange={(e) => setFilterPeriodFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("payroll.shared.periodTo")}</Label>
              <Input type="date" value={filterPeriodTo} onChange={(e) => setFilterPeriodTo(e.target.value)} />
            </div>
          </div>
          <DataTable
            data={payslips}
            columns={slipColumns}
            rowKey={(p) => p.id}
            emptyMessage={loading ? t("payroll.shared.loading") : t("payroll.payslips.emptyList")}
            defaultPageSize={15}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
