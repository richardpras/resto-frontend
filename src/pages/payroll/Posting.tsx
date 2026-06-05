import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/DataTable";
import { ApiHttpError } from "@/lib/api-integration/client";
import {
  getPayrollPostingPreview,
  getPayrollPostingStatus,
  listPayrollRunsV2,
  postPayrollToAccounting,
  reversePayrollPosting,
  type PayrollPostingPreview,
  type PayrollPostingPreviewLine,
  type PayrollPostingRow,
  type PayrollRunV2Row,
} from "@/lib/api-integration/hrEndpoints";
import { useAuthStore } from "@/stores/authStore";
import { BookOpen, Check, ExternalLink, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    value,
  );
}

function postingBadge(status?: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "posted") return "default";
  if (status === "reversed") return "destructive";
  return "outline";
}

export default function Posting() {
  const { user } = useAuthStore();
  const outlets = user?.assignedOutlets ?? [];
  const [outletId, setOutletId] = useState<number | null>(outlets[0]?.id ?? null);

  const [runs, setRuns] = useState<PayrollRunV2Row[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [preview, setPreview] = useState<PayrollPostingPreview | null>(null);
  const [posting, setPosting] = useState<PayrollPostingRow | null>(null);
  const [loading, setLoading] = useState(false);

  const closedRuns = useMemo(() => runs.filter((r) => r.status === "closed"), [runs]);

  const load = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const runList = await listPayrollRunsV2(outletId);
      setRuns(runList);
      const closed = runList.filter((r) => r.status === "closed");
      if (closed.length > 0 && !closed.some((r) => String(r.id) === selectedRunId)) {
        setSelectedRunId(String(closed[0].id));
      }
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load payroll runs");
    } finally {
      setLoading(false);
    }
  }, [outletId, selectedRunId]);

  const loadDetail = useCallback(async (runId: number) => {
    try {
      const [prev, status] = await Promise.all([
        getPayrollPostingPreview(runId),
        getPayrollPostingStatus(runId),
      ]);
      setPreview(prev);
      setPosting(status);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load posting preview");
      setPreview(null);
      setPosting(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selectedRunId) void loadDetail(Number(selectedRunId));
    else {
      setPreview(null);
      setPosting(null);
    }
  }, [selectedRunId, loadDetail]);

  const refresh = async () => {
    await load();
    if (selectedRunId) await loadDetail(Number(selectedRunId));
  };

  const doPost = async () => {
    if (!selectedRunId) return;
    try {
      const row = await postPayrollToAccounting(Number(selectedRunId));
      setPosting(row);
      toast.success("Payroll posted to accounting");
      await refresh();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Posting failed");
    }
  };

  const doReverse = async () => {
    if (!selectedRunId) return;
    try {
      await reversePayrollPosting(Number(selectedRunId), "Reversed from payroll posting UI");
      toast.success("Posting reversed");
      await refresh();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Reverse failed");
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
        key: "net",
        header: "Employees",
        render: (r) => r.itemCount ?? "—",
      },
      {
        key: "status",
        header: "Status",
        render: (r) => <Badge variant="default">{r.status}</Badge>,
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        render: (r) => (
          <Button
            size="sm"
            variant={String(r.id) === selectedRunId ? "default" : "outline"}
            onClick={() => setSelectedRunId(String(r.id))}
          >
            Select
          </Button>
        ),
      },
    ],
    [selectedRunId],
  );

  const lineColumns: Column<PayrollPostingPreviewLine>[] = useMemo(
    () => [
      { key: "code", header: "Account", render: (l) => `${l.accountCode} — ${l.accountName}` },
      { key: "debit", header: "Debit", render: (l) => (l.debit > 0 ? formatIDR(l.debit) : "—") },
      { key: "credit", header: "Credit", render: (l) => (l.credit > 0 ? formatIDR(l.credit) : "—") },
      { key: "memo", header: "Memo", render: (l) => l.memo },
    ],
    [],
  );

  const currentStatus = posting?.postingStatus ?? preview?.postingStatus ?? "draft";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Payroll Journal Posting</h2>
        <p className="text-sm text-muted-foreground">Post closed payroll runs to accounting</p>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Closed Payroll Runs</h3>
        <DataTable
          data={closedRuns}
          columns={runColumns}
          loading={loading}
          emptyMessage="No closed payroll runs available for posting"
        />
      </section>

      {preview && selectedRunId && (
        <>
          <section className="flex flex-wrap items-center gap-3">
            <Badge variant={postingBadge(currentStatus)}>{currentStatus}</Badge>
            {posting?.journal && (
              <Link
                to="/accounting"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Journal {posting.journal.journalNo}
              </Link>
            )}
            {currentStatus !== "posted" && currentStatus !== "reversed" && (
              <Button size="sm" onClick={() => void doPost()} disabled={!preview.balanced}>
                <Check className="h-3.5 w-3.5 mr-1" />
                Post to Accounting
              </Button>
            )}
            {currentStatus === "posted" && (
              <Button size="sm" variant="outline" onClick={() => void doReverse()}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reverse Posting
              </Button>
            )}
          </section>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Gross Payroll</CardTitle>
              </CardHeader>
              <CardContent className="font-semibold">{formatIDR(preview.totals.grossPayroll)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Net Payroll</CardTitle>
              </CardHeader>
              <CardContent className="font-semibold text-green-600">{formatIDR(preview.totals.netPayroll)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Total Debit</CardTitle>
              </CardHeader>
              <CardContent className="font-semibold">{formatIDR(preview.totals.debit)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  Balanced
                </CardTitle>
              </CardHeader>
              <CardContent className="font-semibold">{preview.balanced ? "Yes" : "No"}</CardContent>
            </Card>
          </div>

          <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Journal Preview</h3>
            <DataTable data={preview.lines} columns={lineColumns} emptyMessage="No journal lines" />
          </section>
        </>
      )}
    </div>
  );
}
