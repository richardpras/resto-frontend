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
import { useErpTranslation } from "@/i18n/useErpTranslation";

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

export default function PaymentHealth() {
  const { t } = useErpTranslation();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const [health, setHealth] = useState<PaymentHealthReport | null>(null);
  const [trends, setTrends] = useState<PaymentHealthTrends | null>(null);
  const [reliability, setReliability] = useState<PaymentReliabilityRow[]>([]);
  const [incidents, setIncidents] = useState<PaymentIncidentRow[]>([]);
  const [loading, setLoading] = useState(false);

  const severityLabel = (severity?: PaymentHealthSeverity): string => {
    if (!severity) return t("accounting.health.severityLabels.unknown");
    return t(`accounting.health.severityLabels.${severity}`, {
      defaultValue: severity.charAt(0).toUpperCase() + severity.slice(1),
    });
  };

  const incidentStatusLabel = (status: string): string =>
    t(`settings.paymentHealth.incidentStatus.${status}`, {
      defaultValue: status.charAt(0).toUpperCase() + status.slice(1),
    });

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
      const [h, trendData, r, i] = await Promise.all([
        getPaymentHealth(scope),
        getPaymentHealthTrends({ ...scope, startDate, endDate }),
        getPaymentReliabilityReport(scope),
        listPaymentIncidents(scope),
      ]);
      setHealth(h);
      setTrends(trendData);
      setReliability(r);
      setIncidents(i);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("settings.paymentHealth.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [scope, t]);

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
          <h1 className="text-2xl font-bold">{t("settings.paymentHealth.title")}</h1>
          {health?.healthSeverity ? (
            <Badge variant={severityBadgeVariant(health.healthSeverity)}>{severityLabel(health.healthSeverity)}</Badge>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings?tab=integration">{t("settings.paymentHealth.integrationSettings")}</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            {t("ops:shared.refresh")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <MetricCard label={t("settings.paymentHealth.healthScore")} value={health?.reliabilityScore ?? "—"} />
        <MetricCard
          label={t("settings.paymentHealth.paymentSuccess")}
          value={health?.paymentSuccessRate != null ? `${health.paymentSuccessRate}%` : "—"}
        />
        <MetricCard
          label={t("settings.paymentHealth.webhookSuccess")}
          value={health?.webhookSuccessRate != null ? `${health.webhookSuccessRate}%` : "—"}
        />
        <MetricCard label={t("settings.paymentHealth.openIncidents")} value={health?.openIncidents ?? openIncidents.length} />
        <MetricCard label={t("settings.paymentHealth.stalePayments")} value={health?.stalePayments ?? 0} />
        <MetricCard label={t("settings.paymentHealth.failedWebhooks")} value={health?.failedWebhooks ?? 0} />
        <MetricCard
          label={t("settings.paymentHealth.avgProcessing")}
          value={health?.averageProcessingTimeMs != null ? `${health.averageProcessingTimeMs}ms` : "—"}
        />
        <MetricCard label={t("settings.paymentHealth.provider")} value={health?.provider ?? "—"} />
      </div>

      {openIncidents.length > 0 ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="font-medium">{t("settings.paymentHealth.openIncidents")}</p>
            </div>
            <ul className="space-y-2">
              {openIncidents.map((incident) => (
                <li key={incident.id} className="rounded border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={severityBadgeVariant(incident.severity as PaymentHealthSeverity)}>
                      {severityLabel(incident.severity as PaymentHealthSeverity)}
                    </Badge>
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
            <p className="font-medium mb-3">{t("settings.paymentHealth.providerRanking")}</p>
            <div className="flex flex-wrap gap-2">
              {health.providerRanking.map((row, index) => (
                <Badge key={row.provider} variant="outline" className="capitalize">
                  {t("settings.paymentHealth.providerRankingEntry", {
                    rank: index + 1,
                    provider: row.provider,
                    score: row.reliabilityScore,
                  })}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="font-medium mb-3">{t("settings.paymentHealth.paymentWebhookTrend")}</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="paymentSuccess"
                    stroke="hsl(var(--primary))"
                    name={t("settings.paymentHealth.chartPayment")}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="webhookSuccess"
                    stroke="hsl(var(--muted-foreground))"
                    name={t("settings.paymentHealth.chartWebhook")}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="font-medium mb-3">{t("settings.paymentHealth.staleIncidentsTrend")}</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="stale"
                    stroke="hsl(var(--destructive))"
                    name={t("settings.paymentHealth.chartIncidents")}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <p className="p-4 font-medium border-b">{t("settings.paymentHealth.providerReliability")}</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("settings.paymentHealth.table.provider")}</TableHead>
                <TableHead>{t("settings.paymentHealth.table.uptime")}</TableHead>
                <TableHead>{t("settings.paymentHealth.table.incidents")}</TableHead>
                <TableHead>{t("settings.paymentHealth.table.avgResolution")}</TableHead>
                <TableHead>{t("settings.paymentHealth.table.paymentSuccess")}</TableHead>
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
                    {t("settings.paymentHealth.noReliabilitySnapshots")}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <p className="p-4 font-medium border-b">{t("settings.paymentHealth.incidentTimeline")}</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("settings.paymentHealth.incidentTable.opened")}</TableHead>
                <TableHead>{t("settings.paymentHealth.incidentTable.provider")}</TableHead>
                <TableHead>{t("settings.paymentHealth.incidentTable.severity")}</TableHead>
                <TableHead>{t("settings.paymentHealth.incidentTable.title")}</TableHead>
                <TableHead>{t("settings.paymentHealth.incidentTable.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {t("settings.paymentHealth.noIncidents")}
                  </TableCell>
                </TableRow>
              ) : (
                incidents.slice(0, 20).map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell className="text-xs">
                      {incident.openedAt ? new Date(incident.openedAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="capitalize">{incident.provider}</TableCell>
                    <TableCell>
                      <Badge variant={severityBadgeVariant(incident.severity as PaymentHealthSeverity)}>
                        {severityLabel(incident.severity as PaymentHealthSeverity)}
                      </Badge>
                    </TableCell>
                    <TableCell>{incident.title}</TableCell>
                    <TableCell className="capitalize">{incidentStatusLabel(incident.status)}</TableCell>
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
            <p className="font-medium">{t("settings.paymentHealth.configuration")}</p>
            {health.missing.length > 0 ? (
              <div className="text-destructive">
                <p className="font-medium">{t("settings.paymentHealth.missing")}</p>
                <ul className="list-disc pl-5">{health.missing.map((m) => <li key={m}>{m}</li>)}</ul>
              </div>
            ) : null}
            {health.warnings.length > 0 ? (
              <div className="text-muted-foreground">
                <p className="font-medium">{t("settings.paymentHealth.warnings")}</p>
                <ul className="list-disc pl-5">{health.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
