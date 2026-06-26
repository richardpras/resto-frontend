import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { ScrollableTabsList } from "@/components/ui/ScrollableTabsList";
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
  getPayslipGenerationStatus,
  listPayrollRunsV2,
  listPayslips,
  publishPayslip,
  regeneratePayslip,
  type PayrollPayslipRow,
  type PayrollRunV2Row,
  type PayslipGenerationStatus,
} from "@/lib/api-integration/hrEndpoints";
import { listOrganizationEmployees, type OrganizationEmployeeRow } from "@/lib/api-integration/organizationEndpoints";
import { useAuthStore } from "@/stores/authStore";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { Download, FileText, Loader2, Play, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

const POLL_INTERVAL_MS = 3000;

function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    value,
  );
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "published" || status === "finalized") return "default";
  if (status === "generated") return "secondary";
  if (status === "processing") return "secondary";
  if (status === "failed") return "destructive";
  return "outline";
}

function isGenerationActive(phase?: PayslipGenerationStatus["phase"]): boolean {
  return phase === "queued" || phase === "processing";
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
  const [generationByRun, setGenerationByRun] = useState<Record<number, PayslipGenerationStatus>>({});

  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPeriodFrom, setFilterPeriodFrom] = useState("");
  const [filterPeriodTo, setFilterPeriodTo] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingRunIdRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    pollingRunIdRef.current = null;
  }, []);

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

  const pollGenerationStatus = useCallback(
    async (runId: number) => {
      try {
        const status = await getPayslipGenerationStatus(runId);
        setGenerationByRun((prev) => ({ ...prev, [runId]: status }));

        if (status.phase === "completed") {
          stopPolling();
          toast.success(t("payroll.payslips.generationComplete"));
          await load();
        } else if (status.phase === "failed") {
          stopPolling();
          toast.error(t("payroll.payslips.generationFailed"));
          await load();
        }
      } catch (e) {
        stopPolling();
        toast.error(formatApiErrorMessage(e, t) || t("payroll.payslips.loadFailed"));
      }
    },
    [load, stopPolling, t],
  );

  const startPolling = useCallback(
    (runId: number, initial?: PayslipGenerationStatus) => {
      stopPolling();
      pollingRunIdRef.current = runId;
      if (initial) {
        setGenerationByRun((prev) => ({ ...prev, [runId]: initial }));
      }
      void pollGenerationStatus(runId);
      pollRef.current = setInterval(() => {
        void pollGenerationStatus(runId);
      }, POLL_INTERVAL_MS);
    },
    [pollGenerationStatus, stopPolling],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const runsNeedingPayslips = useMemo(
    () => runs.filter((r) => ["finalized", "processing_payment", "paid", "closed"].includes(r.status)),
    [runs],
  );

  const payslipCountForRun = (runId: number) => payslips.filter((p) => p.payrollRunId === runId).length;

  const generateForRun = async (runId: number) => {
    try {
      const { rows, generation } = await generatePayslips(runId);
      toast.success(t("payroll.payslips.generationQueued", { count: rows.length }));
      await load();
      if (isGenerationActive(generation.phase)) {
        startPolling(runId, generation);
      }
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.payslips.generateFailed"));
    }
  };

  const queueRegenerate = async (payslip: PayrollPayslipRow) => {
    try {
      await regeneratePayslip(payslip.id);
      toast.success(t("payroll.payslips.pdfRegenerated"));
      await load();
      startPolling(payslip.payrollRunId);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.payslips.regenerateFailed"));
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

  const renderRunGenerationBadge = (runId: number) => {
    const gen = generationByRun[runId];
    if (!gen || gen.phase === "idle" || gen.phase === "completed") return null;

    const done = gen.generated + gen.published + gen.failed;
    const label =
      gen.phase === "queued"
        ? t("payroll.payslips.generationQueued", { count: gen.total })
        : t("payroll.payslips.generationProgress", { done, total: gen.total });

    return (
      <Badge variant={gen.phase === "failed" ? "destructive" : "secondary"} className="ml-2">
        {gen.phase === "processing" && <Loader2 className="h-3 w-3 mr-1 animate-spin inline" />}
        {label}
      </Badge>
    );
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
          <span className="inline-flex items-center flex-wrap gap-1">
            <Badge variant={statusVariant(r.status)}>
              {t(`payroll.shared.${r.status}`, { defaultValue: r.status })}
            </Badge>
            {renderRunGenerationBadge(r.id)}
          </span>
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
        render: (r) => {
          const gen = generationByRun[r.id];
          const busy = isGenerationActive(gen?.phase);
          const isClosed = r.status === "closed";
          if (isClosed) {
            return (
              <Badge variant="outline">{t("payroll.payslips.closedRunBadge")}</Badge>
            );
          }
          return (
            <Button size="sm" disabled={busy} onClick={() => void generateForRun(r.id)}>
              {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1" />}
              {t("payroll.payslips.generatePayslips")}
            </Button>
          );
        },
      },
    ],
    [t, generationByRun, payslips],
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
            {(p.pdfAvailable || p.status === "failed") && (
              <Button size="sm" variant="ghost" onClick={() => void queueRegenerate(p)}>
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
        <ScrollableTabsList>
          <TabsTrigger value="runs" className="shrink-0 px-4 min-h-10">{t("payroll.payslips.runsTab")}</TabsTrigger>
          <TabsTrigger value="list" className="shrink-0 px-4 min-h-10">{t("payroll.payslips.listTab")}</TabsTrigger>
        </ScrollableTabsList>

        <TabsContent value="runs" className="mt-4 space-y-3">
          <Card className="p-4 text-sm text-muted-foreground">
            <FileText className="h-4 w-4 inline mr-2" />
            {t("payroll.payslips.finalizedHint")}
          </Card>
          <DataTable
            data={runsNeedingPayslips}
            columns={runColumns}
            rowKey={(r) => r.id}
            emptyMessage={loading ? t("payroll.shared.loading") : t("payroll.payslips.emptyRuns")}
            defaultPageSize={10}
          />
        </TabsContent>

        <TabsContent value="list" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
                  <SelectItem value="draft">{t("payroll.shared.draft")}</SelectItem>
                  <SelectItem value="processing">{t("payroll.shared.processing")}</SelectItem>
                  <SelectItem value="generated">{t("payroll.shared.generated")}</SelectItem>
                  <SelectItem value="published">{t("payroll.shared.published_status")}</SelectItem>
                  <SelectItem value="failed">{t("payroll.shared.failed")}</SelectItem>
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
