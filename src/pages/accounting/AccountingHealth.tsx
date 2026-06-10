import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Activity, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  getAccountingHealth,
  getAccountingHealthTrends,
  getAccountingSettings,
  listAccountingPostingFailures,
  retryAccountingPostingFailure,
  updateAccountingSettings,
  type AccountingHealth,
  type AccountingHealthTrends,
  type AccountingPostingFailureRow,
  type AccountingSettings,
  type HealthSeverity,
} from "@/lib/api-integration/accountingEndpoints";
import { useOutletStore } from "@/stores/outletStore";

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function severityBadgeVariant(severity?: HealthSeverity): "default" | "secondary" | "destructive" | "outline" {
  if (severity === "critical") return "destructive";
  if (severity === "high" || severity === "warning") return "secondary";
  return "outline";
}

function severityLabel(severity?: HealthSeverity): string {
  if (!severity) return "unknown";
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

const AGING_BUCKET_ORDER = ["0-1h", "1-4h", "4-24h", "1-3d", "3d+"];

export default function AccountingHealth() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const [health, setHealth] = useState<AccountingHealth | null>(null);
  const [trends, setTrends] = useState<AccountingHealthTrends | null>(null);
  const [settings, setSettings] = useState<AccountingSettings | null>(null);
  const [failures, setFailures] = useState<AccountingPostingFailureRow[]>([]);
  const [loading, setLoading] = useState(false);

  const scope = useMemo(
    () => (typeof activeOutletId === "number" && activeOutletId >= 1 ? { outletId: activeOutletId } : undefined),
    [activeOutletId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      const [h, s, f, t] = await Promise.all([
        getAccountingHealth(scope),
        getAccountingSettings(scope),
        listAccountingPostingFailures("pending"),
        getAccountingHealthTrends({
          ...scope,
          startDate: start.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
        }),
      ]);
      setHealth(h);
      setSettings(s);
      setFailures(f);
      setTrends(t);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load accounting health");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleModeChange = async (mode: "realtime" | "shift_close") => {
    try {
      const updated = await updateAccountingSettings({ revenuePostingMode: mode, ...(scope ?? {}) });
      setSettings(updated);
      toast.success("Revenue posting mode updated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update settings");
    }
  };

  const handleRetry = async (id: string) => {
    try {
      await retryAccountingPostingFailure(id);
      toast.success("Posting retry succeeded");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Retry failed");
    }
  };

  const trendChartData = useMemo(() => {
    if (!trends) return [];
    return trends.postingFailures.map((row, index) => ({
      date: row.date,
      failures: row.count,
      severity: trends.severityTrend[index]?.severity ?? "healthy",
    }));
  }, [trends]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Accounting Health</h2>
          {health?.healthSeverity && (
            <Badge variant={severityBadgeVariant(health.healthSeverity)}>
              {severityLabel(health.healthSeverity)}
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {health && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Health Score" value={health.healthScore} />
            <MetricCard label="Failed Postings" value={health.failedPostings} />
            <MetricCard label="Severity" value={severityLabel(health.healthSeverity)} />
            <MetricCard label="Gift Card Variance" value={health.giftCardVariance ?? 0} />
            <MetricCard label="Inventory Δ" value={health.inventoryValuationDifference ?? 0} />
            <MetricCard label="Payroll Variance" value={health.payrollVariance ?? 0} />
            <MetricCard label="Procurement Variance" value={health.procurementVariance ?? 0} />
            <MetricCard label="Missing Mappings" value={health.missingMappings} />
          </div>

          {(health.priorityQueue?.length ?? 0) > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Priority Action Queue
                </p>
                <div className="space-y-2">
                  {health.priorityQueue?.map((item) => (
                    <div
                      key={`${item.title}-${item.priority}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.message}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={severityBadgeVariant(item.priority)}>{severityLabel(item.priority)}</Badge>
                        <Button type="button" variant="link" size="sm" className="h-auto p-0" asChild>
                          <Link to={item.actionUrl}>Open</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium">Failure Aging Distribution</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AGING_BUCKET_ORDER.map((bucket) => (
                    <div key={bucket} className="rounded-lg border p-2 text-center">
                      <p className="text-xs text-muted-foreground">{bucket}</p>
                      <p className="text-lg font-semibold">{health.failureAgingBuckets?.[bucket] ?? 0}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium">Top Failure Sources</p>
                {(health.topFailureSources?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending failures.</p>
                ) : (
                  <ul className="space-y-2">
                    {health.topFailureSources?.map((row) => (
                      <li key={row.sourceType} className="flex items-center justify-between text-sm border rounded px-2 py-1">
                        <span className="font-mono text-xs">{row.sourceType}</span>
                        <Badge variant="outline">{row.count}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-3">Posting Failures Trend (30 days)</p>
              <div className="h-48">
                {trendChartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No snapshot data yet. Daily snapshots run via accounting:health-snapshot.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="failures" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium">Revenue Posting Mode</p>
          <Select
            value={settings?.revenuePostingMode ?? "realtime"}
            onValueChange={(v) => void handleModeChange(v as "realtime" | "shift_close")}
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="realtime">Realtime (order payment)</SelectItem>
              <SelectItem value="shift_close">Shift Close (batch)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Only one revenue posting path is active. Realtime posts on payment; Shift Close posts during shift close.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <p className="p-3 text-sm font-medium border-b">Posting Failures</p>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Source</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {failures.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No pending failures.
                  </TableCell>
                </TableRow>
              )}
              {failures.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">
                    {row.sourceType} #{row.sourceId}
                  </TableCell>
                  <TableCell className="text-sm max-w-xs truncate" title={row.errorMessage}>
                    {row.errorCode}: {row.errorMessage}
                  </TableCell>
                  <TableCell className="text-sm">
                    {row.agingBucket ?? "—"}
                    {row.ageHours !== undefined ? ` (${row.ageHours}h)` : ""}
                  </TableCell>
                  <TableCell className="text-sm">{row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {row.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => void handleRetry(row.id)}>
                        Retry
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
