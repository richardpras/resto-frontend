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
import { ApiHttpError } from "@/lib/api-integration/client";
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

function paymentStatusLabel(status?: string): string {
  if (!status) return "pending";
  return status;
}

const AUDIT_LABELS: Record<string, string> = {
  calculated: "Calculated",
  approved: "Approved",
  finalized: "Finalized",
  payment_started: "Payment Started",
  payment_completed: "Paid",
  closed: "Closed",
  reopened: "Reopened",
};

export default function Closing() {
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
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load payroll runs");
    } finally {
      setLoading(false);
    }
  }, [outletId, selectedRunId]);

  const loadSummary = useCallback(async (runId: number) => {
    try {
      const data = await getPayrollClosingSummary(runId);
      setSummary(data);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load closing summary");
      setSummary(null);
    }
  }, []);

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
        toast.success("Payment processing started");
      } else if (type === "paid") {
        await markPayrollRunPaid(id, paidAt || undefined);
        toast.success("Payroll marked as paid");
        setPaidAt("");
      } else if (type === "close") {
        await closePayrollRun(id, closeNotes || undefined);
        toast.success("Payroll run closed");
        setCloseOpen(false);
        setCloseNotes("");
      } else if (type === "reopen") {
        await reopenPayrollRun(id);
        toast.success("Payroll run reopened");
      }
      await refresh();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Action failed");
    }
  };

  const runColumns: Column<PayrollRunV2Row>[] = useMemo(
    () => [
      {
        key: "period",
        header: "Period",
        render: (r) =>
          r.preparationPeriod
            ? `${r.preparationPeriod.periodStart} → ${r.preparationPeriod.periodEnd}`
            : `Run #${r.id}`,
      },
      {
        key: "employees",
        header: "Employees",
        render: (r) => r.itemCount ?? "—",
      },
      {
        key: "status",
        header: "Status",
        render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
      },
      {
        key: "payment",
        header: "Payment Status",
        render: (r) => paymentStatusLabel(r.paymentStatus),
      },
      {
        key: "closed",
        header: "Closed",
        render: (r) => (r.isClosed || r.status === "closed" ? "Yes" : "No"),
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        render: (r) => (
          <Button size="sm" variant={String(r.id) === selectedRunId ? "default" : "outline"} onClick={() => setSelectedRunId(String(r.id))}>
            View
          </Button>
        ),
      },
    ],
    [selectedRunId],
  );

  const auditRows: PayrollRunAuditRow[] = summary?.auditTrail ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Payroll Closing</h2>
          <p className="text-sm text-muted-foreground">Payment lifecycle, closing control, and audit trail</p>
        </div>
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

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Payroll Runs</h3>
        <DataTable
          data={closableRuns}
          columns={runColumns}
          loading={loading}
          emptyMessage="No finalized payroll runs available for closing"
        />
      </section>

      {selectedRun && summary && (
        <>
          <section className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground mr-2">Actions for run #{selectedRun.id}:</span>
            {selectedRun.status === "finalized" && (
              <Button size="sm" onClick={() => void action("start")}>
                <Banknote className="h-3.5 w-3.5 mr-1" />
                Start Payment
              </Button>
            )}
            {selectedRun.status === "processing_payment" && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="grid gap-1">
                  <Label className="text-xs">Paid At (optional)</Label>
                  <Input type="date" className="h-8 w-40" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
                </div>
                <Button size="sm" onClick={() => void action("paid")}>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Mark Paid
                </Button>
              </div>
            )}
            {selectedRun.status === "paid" && (
              <Button size="sm" onClick={() => setCloseOpen(true)}>
                <Lock className="h-3.5 w-3.5 mr-1" />
                Close
              </Button>
            )}
            {selectedRun.status === "closed" && (
              <Button size="sm" variant="outline" onClick={() => void action("reopen")}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reopen
              </Button>
            )}
            {selectedRun.isClosed && (
              <Badge variant="default" className="gap-1">
                <Unlock className="h-3 w-3" />
                Read-only
              </Badge>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Closing Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">Gross Payroll</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">{formatIDR(summary.totals.grossPayroll)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">Net Payroll</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold text-green-600">
                  {formatIDR(summary.totals.netPayroll)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">BPJS</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">{formatIDR(summary.totals.totalBPJS)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">PPh21</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">{formatIDR(summary.totals.totalPPh21)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">Loans</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">{formatIDR(summary.totals.totalLoans)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">Cash Advance</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">{formatIDR(summary.totals.totalCashAdvance)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">Reimbursements</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">{formatIDR(summary.totals.totalReimbursement)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">Adjustments (net)</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">{formatIDR(summary.totals.totalAdjustments)}</CardContent>
              </Card>
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.totals.employeeCount} employees · Payment: {summary.totals.paymentStatus ?? "pending"} ·{" "}
              {summary.totals.closedStatus === "closed" ? "Closed" : "Open"}
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Audit History</h3>
            <div className="border rounded-lg divide-y">
              {auditRows.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No audit entries yet</p>
              ) : (
                auditRows.map((a) => (
                  <div key={a.id} className="p-3 flex flex-wrap justify-between gap-2 text-sm">
                    <div>
                      <span className="font-medium">{AUDIT_LABELS[a.action] ?? a.action}</span>
                      {a.performedBy && (
                        <span className="text-muted-foreground ml-2">by {a.performedBy.name}</span>
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
            <DialogTitle>Close Payroll Run</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label>Closing notes (optional)</Label>
            <Textarea value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void action("close")}>
              <Lock className="h-4 w-4 mr-1" />
              Close Payroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
