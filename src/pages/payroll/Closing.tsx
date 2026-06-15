import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  closePayrollRun,
  getPayrollClosingSummary,
  listPayrollRunsV2,
  markPayrollRunPaid,
  reopenPayrollRun,
  startPayrollPayment,
  type PayrollClosingSummary,
  type PayrollRunAuditRow,
  type PayrollRunV2Row,
} from "@/lib/api-integration/hrEndpoints";
import { useAuthStore } from "@/stores/authStore";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { Banknote, Check, Lock, RotateCcw, Unlock } from "lucide-react";
import { toast } from "sonner";

function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    value,
  );
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID");
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "closed") return "default";
  if (status === "paid" || status === "finalized") return "secondary";
  if (status === "processing_payment") return "outline";
  return "outline";
}

const AUDIT_LABEL_KEYS: Record<string, string> = {
  calculated: "auditCalculated",
  approved: "auditApproved",
  finalized: "auditFinalized",
  payment_started: "auditPaymentStarted",
  payment_completed: "auditPaymentCompleted",
  closed: "auditClosed",
  reopened: "auditReopened",
};

export default function Closing() {
  const { t } = useErpTranslation();
  const { user } = useAuthStore();
  const outlets = user?.assignedOutlets ?? [];
  const [outletId, setOutletId] = useState<number | null>(outlets[0]?.id ?? null);

  const [runs, setRuns] = useState<PayrollRunV2Row[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [summary, setSummary] = useState<PayrollClosingSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const [closeOpen, setCloseOpen] = useState(false);
  const [closeNotes, setCloseNotes] = useState("");
  const [paidAt, setPaidAt] = useState("");

  const closableRuns = useMemo(
    () => runs.filter((r) => ["finalized", "processing_payment", "paid", "closed"].includes(r.status)),
    [runs],
  );

  const auditLabel = useCallback(
    (action: string) => {
      const key = AUDIT_LABEL_KEYS[action];
      return key ? t(`payroll.shared.${key}`) : action;
    },
    [t],
  );

  const paymentStatusLabel = useCallback(
    (status?: string) => {
      if (!status) return t("payroll.shared.pending");
      return t(`payroll.shared.${status}`, { defaultValue: status });
    },
    [t],
  );

  const load = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const runList = await listPayrollRunsV2(outletId);
      setRuns(runList);
      const filtered = runList.filter((r) => ["finalized", "processing_payment", "paid", "closed"].includes(r.status));
      if (filtered.length > 0 && !filtered.some((r) => String(r.id) === selectedRunId)) {
        setSelectedRunId(String(filtered[0].id));
      }
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.loadRunsFailed"));
    } finally {
      setLoading(false);
    }
  }, [outletId, selectedRunId, t]);

  const loadSummary = useCallback(
    async (runId: number) => {
      try {
        const data = await getPayrollClosingSummary(runId);
        setSummary(data);
      } catch (e) {
        toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.loadClosingFailed"));
        setSummary(null);
      }
    },
    [t],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selectedRunId) {
      void loadSummary(Number(selectedRunId));
    } else {
      setSummary(null);
    }
  }, [selectedRunId, loadSummary]);

  const selectedRun = runs.find((r) => String(r.id) === selectedRunId);

  const refresh = async () => {
    await load();
    if (selectedRunId) await loadSummary(Number(selectedRunId));
  };

  const action = async (type: "start" | "paid" | "close" | "reopen") => {
    if (!selectedRunId) return;
    const id = Number(selectedRunId);
    try {
      if (type === "start") {
        await startPayrollPayment(id);
        toast.success(t("payroll.shared.paymentStarted"));
      } else if (type === "paid") {
        await markPayrollRunPaid(id, paidAt || undefined);
        toast.success(t("payroll.shared.markedPaid"));
        setPaidAt("");
      } else if (type === "close") {
        await closePayrollRun(id, closeNotes || undefined);
        toast.success(t("payroll.shared.runClosed"));
        setCloseOpen(false);
        setCloseNotes("");
      } else if (type === "reopen") {
        await reopenPayrollRun(id);
        toast.success(t("payroll.shared.runReopened"));
      }
      await refresh();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.actionFailed"));
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
            : `Run #${r.id}`,
      },
      {
        key: "employees",
        header: t("payroll.shared.employeesCount"),
        render: (r) => r.itemCount ?? "—",
      },
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
        key: "payment",
        header: t("payroll.shared.paymentStatus"),
        render: (r) => paymentStatusLabel(r.paymentStatus),
      },
      {
        key: "closed",
        header: t("payroll.shared.closed"),
        render: (r) => (r.isClosed || r.status === "closed" ? t("payroll.shared.yes") : t("payroll.shared.no")),
      },
      {
        key: "actions",
        header: t("payroll.shared.actions"),
        className: "text-right",
        render: (r) => (
          <Button
            size="sm"
            variant={String(r.id) === selectedRunId ? "default" : "outline"}
            onClick={() => setSelectedRunId(String(r.id))}
          >
            {t("payroll.shared.view")}
          </Button>
        ),
      },
    ],
    [t, selectedRunId, paymentStatusLabel],
  );

  const auditRows: PayrollRunAuditRow[] = summary?.auditTrail ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("payroll.closing.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("payroll.closing.subtitle")}</p>
        </div>
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

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">{t("payroll.closing.runsSection")}</h3>
        <DataTable
          data={closableRuns}
          columns={runColumns}
          rowKey={(r) => String(r.id)}
          loading={loading}
          emptyMessage={t("payroll.shared.noClosableRuns")}
        />
      </section>

      {selectedRun && summary && (
        <>
          <section className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground mr-2">
              {t("payroll.shared.actionsForRun", { id: selectedRun.id })}
            </span>
            {selectedRun.status === "finalized" && (
              <Button size="sm" onClick={() => void action("start")}>
                <Banknote className="h-3.5 w-3.5 mr-1" />
                {t("payroll.shared.startPayment")}
              </Button>
            )}
            {selectedRun.status === "processing_payment" && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="grid gap-1">
                  <Label className="text-xs">{t("payroll.shared.paidAtOptional")}</Label>
                  <Input type="date" className="h-8 w-40" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
                </div>
                <Button size="sm" onClick={() => void action("paid")}>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {t("payroll.shared.markPaid")}
                </Button>
              </div>
            )}
            {selectedRun.status === "paid" && (
              <Button size="sm" onClick={() => setCloseOpen(true)}>
                <Lock className="h-3.5 w-3.5 mr-1" />
                {t("payroll.shared.close")}
              </Button>
            )}
            {selectedRun.status === "closed" && (
              <Button size="sm" variant="outline" onClick={() => void action("reopen")}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                {t("payroll.shared.reopen")}
              </Button>
            )}
            {selectedRun.isClosed && (
              <Badge variant="default" className="gap-1">
                <Unlock className="h-3 w-3" />
                {t("payroll.shared.readOnly")}
              </Badge>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">{t("payroll.shared.closingSummary")}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">{t("payroll.shared.grossPayroll")}</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">{formatIDR(summary.totals.grossPayroll)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">{t("payroll.shared.netPayroll")}</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold text-green-600">
                  {formatIDR(summary.totals.netPayroll)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">{t("payroll.bpjs.title")}</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">{formatIDR(summary.totals.totalBPJS)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">{t("payroll.engine.pph21")}</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">{formatIDR(summary.totals.totalPPh21)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">{t("payroll.loans.tab")}</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">{formatIDR(summary.totals.totalLoans)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">{t("payroll.shared.cashAdvance")}</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">{formatIDR(summary.totals.totalCashAdvance)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">{t("payroll.engine.reimbursement")}</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">{formatIDR(summary.totals.totalReimbursement)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">{t("payroll.shared.adjustmentsNet")}</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">{formatIDR(summary.totals.totalAdjustments)}</CardContent>
              </Card>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("payroll.shared.employeesPaymentSummary", {
                count: summary.totals.employeeCount,
                payment: paymentStatusLabel(summary.totals.paymentStatus),
                closed:
                  summary.totals.closedStatus === "closed" ? t("payroll.shared.closed") : t("payroll.shared.open"),
              })}
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">{t("payroll.shared.auditHistory")}</h3>
            <div className="border rounded-lg divide-y">
              {auditRows.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">{t("payroll.shared.noAuditEntries")}</p>
              ) : (
                auditRows.map((a) => (
                  <div key={a.id} className="p-3 flex flex-wrap justify-between gap-2 text-sm">
                    <div>
                      <span className="font-medium">{auditLabel(a.action)}</span>
                      {a.performedBy && (
                        <span className="text-muted-foreground ml-2">
                          {t("payroll.shared.byUser", { name: a.performedBy.name })}
                        </span>
                      )}
                      {a.notes && <p className="text-muted-foreground text-xs mt-0.5">{a.notes}</p>}
                    </div>
                    <span className="text-muted-foreground text-xs">{formatDateTime(a.createdAt)}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("payroll.shared.closePayrollRun")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label>{t("payroll.shared.closingNotes")}</Label>
            <Textarea value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)}>
              {t("payroll.shared.cancel")}
            </Button>
            <Button onClick={() => void action("close")}>
              <Lock className="h-4 w-4 mr-1" />
              {t("payroll.shared.closePayroll")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
