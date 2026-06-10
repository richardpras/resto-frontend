import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  getPaymentHealth,
  getPaymentHealthTrends,
  getPaymentReliabilityReport,
  listPaymentIncidents,
  type PaymentHealthReport,
  type PaymentHealthSeverity,
  type PaymentHealthTrends,
  type PaymentIncidentRow,
  type PaymentReliabilityRow,
} from "@/lib/api-integration/paymentEndpoints";
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

function severityBadgeVariant(severity?: PaymentHealthSeverity): "default" | "secondary" | "destructive" | "outline" {
  if (severity === "critical") return "destructive";
  if (severity === "high" || severity === "warning") return "secondary";
  return "outline";
}

function severityLabel(severity?: PaymentHealthSeverity): string {
  if (!severity) return "Unknown";
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

export default function PaymentHealth() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const [health, setHealth] = useState<PaymentHealthReport | null>(null);
  const [trends, setTrends] = useState<PaymentHealthTrends | null>(null);
  const [reliability, setReliability] = useState<PaymentReliabilityRow[]>([]);
  const [incidents, setIncidents] = useState<PaymentIncidentRow[]>([]);
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
      const startDate = start.toISOString().slice(0, 10);
      const endDate = end.toISOString().slice(0, 10);
      const [h, t, r, i] = await Promise.all([
        getPaymentHealth(scope),
        getPaymentHealthTrends({ ...scope, startDate, endDate }),
        getPaymentReliabilityReport(scope),
        listPaymentIncidents(scope),
      ]);
      setHealth(h);
      setTrends(t);
      setReliability(r);
      setIncidents(i);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load payment health");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const trendChartData = useMemo(() => {
    if (!trends) return [];
    return trends.paymentSuccessTrend.map((row, index) => ({
      date: row.date,
      paymentSuccess: row.rate,
      webhookSuccess: trends.webhookTrend[index]?.rate ?? 0,
      stale: trends.incidentTrend[index]?.count ?? 0,
    }));
  }, [trends]);

  const openIncidents = incidents.filter((i) => i.status === "open");

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Payment Health</h1>
          {health?.healthSeverity ? (
            <Badge variant={severityBadgeVariant(health.healthSeverity)}>{severityLabel(health.healthSeverity)}</Badge>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings?tab=integration">Integration Settings</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Health Score" value={health?.reliabilityScore ?? "—"} />
        <MetricCard label="Payment Success" value={health?.paymentSuccessRate != null ? `${health.paymentSuccessRate}%` : "—"} />
        <MetricCard label="Webhook Success" value={health?.webhookSuccessRate != null ? `${health.webhookSuccessRate}%` : "—"} />
        <MetricCard label="Open Incidents" value={health?.openIncidents ?? openIncidents.length} />
        <MetricCard label="Stale Payments" value={health?.stalePayments ?? 0} />
        <MetricCard label="Failed Webhooks" value={health?.failedWebhooks ?? 0} />
        <MetricCard label="Avg Processing" value={health?.averageProcessingTimeMs != null ? `${health.averageProcessingTimeMs}ms` : "—"} />
        <MetricCard label="Provider" value={health?.provider ?? "—"} />
      </div>

      {openIncidents.length > 0 ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="font-medium">Open Incidents</p>
            </div>
            <ul className="space-y-2">
              {openIncidents.map((incident) => (
                <li key={incident.id} className="rounded border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={severityBadgeVariant(incident.severity as PaymentHealthSeverity)}>{incident.severity}</Badge>
                    <span className="font-medium">{incident.title}</span>
                    <span className="text-muted-foreground capitalize">{incident.provider}</span>
                  </div>
                  <p className="text-muted-foreground mt-1">{incident.description}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {health?.providerRanking && health.providerRanking.length > 0 ? (
        <Card>
          <CardContent className="p-4">
            <p className="font-medium mb-3">Provider Ranking</p>
            <div className="flex flex-wrap gap-2">
              {health.providerRanking.map((row, index) => (
                <Badge key={row.provider} variant="outline" className="capitalize">
                  #{index + 1} {row.provider} ({row.reliabilityScore}%)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="font-medium mb-3">Payment & Webhook Success Trend (30d)</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="paymentSuccess" stroke="hsl(var(--primary))" name="Payment %" dot={false} />
                  <Line type="monotone" dataKey="webhookSuccess" stroke="hsl(var(--muted-foreground))" name="Webhook %" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="font-medium mb-3">Stale Payments / Incidents Trend</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="stale" stroke="hsl(var(--destructive))" name="Incidents" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <p className="p-4 font-medium border-b">Provider Reliability</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Uptime %</TableHead>
                <TableHead>Incidents</TableHead>
                <TableHead>Avg Resolution (min)</TableHead>
                <TableHead>Payment Success %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reliability.map((row) => (
                <TableRow key={row.provider}>
                  <TableCell className="capitalize font-medium">{row.provider}</TableCell>
                  <TableCell>{row.uptimePercent}</TableCell>
                  <TableCell>{row.incidents}</TableCell>
                  <TableCell>{row.avgResolutionMinutes}</TableCell>
                  <TableCell>{row.paymentSuccessRate}</TableCell>
                </TableRow>
              ))}
              {reliability.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground text-center">
                    No reliability snapshots yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <p className="p-4 font-medium border-b">Incident Timeline</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opened</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No incidents recorded.
                  </TableCell>
                </TableRow>
              ) : (
                incidents.slice(0, 20).map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell className="text-xs">{incident.openedAt ? new Date(incident.openedAt).toLocaleString() : "—"}</TableCell>
                    <TableCell className="capitalize">{incident.provider}</TableCell>
                    <TableCell>
                      <Badge variant={severityBadgeVariant(incident.severity as PaymentHealthSeverity)}>{incident.severity}</Badge>
                    </TableCell>
                    <TableCell>{incident.title}</TableCell>
                    <TableCell className="capitalize">{incident.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {health && (health.missing.length > 0 || health.warnings.length > 0) ? (
        <Card>
          <CardContent className="p-4 space-y-2 text-sm">
            <p className="font-medium">Configuration</p>
            {health.missing.length > 0 ? (
              <div className="text-destructive">
                <p className="font-medium">Missing:</p>
                <ul className="list-disc pl-5">{health.missing.map((m) => <li key={m}>{m}</li>)}</ul>
              </div>
            ) : null}
            {health.warnings.length > 0 ? (
              <div className="text-muted-foreground">
                <p className="font-medium">Warnings:</p>
                <ul className="list-disc pl-5">{health.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
