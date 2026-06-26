import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getFailedJobsSummary,
  getFailedJobsTrends,
  listFailedJobs,
  type FailedJobRow,
  type FailedJobSnapshot,
  type FailedJobSummary,
} from "@/lib/api-integration/failedJobsEndpoints";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import type { TFunction } from "i18next";

function severityBadge(severity: string, t: TFunction) {
  if (severity === "critical") {
    return <Badge variant="destructive">{t("accounting.health.severityLabels.critical")}</Badge>;
  }
  if (severity === "warning" || severity === "high") {
    return <Badge className="bg-warning/15 text-warning border-warning/30">{t("accounting.health.severityLabels.warning")}</Badge>;
  }
  return <Badge variant="secondary">{t("system.failedJobs.severityInfo")}</Badge>;
}

export default function FailedJobsDashboard() {
  const { t } = useErpTranslation();
  const [summary, setSummary] = useState<FailedJobSummary | null>(null);
  const [rows, setRows] = useState<FailedJobRow[]>([]);
  const [trends, setTrends] = useState<FailedJobSnapshot[]>([]);
  const [groupedModule, setGroupedModule] = useState<Array<{ module: string; count: number; criticalCount: number }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, listRes, trendsRes] = await Promise.all([
        getFailedJobsSummary(),
        listFailedJobs({ limit: 50 }),
        getFailedJobsTrends(),
      ]);
      setSummary(summaryRes);
      setRows(listRes.data);
      setGroupedModule(listRes.grouped.byModule ?? []);
      setTrends(trendsRes);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("system.failedJobs.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("reportsHub.cards.system-reliability.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("reportsHub.cards.system-reliability.description")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("ops:shared.refresh")}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/notifications">{t("common:nav.notificationCenter")}</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {loading || !summary ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t("system.failedJobs.metrics.failedJobs")}</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{summary.failedJobs}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t("system.failedJobs.metrics.criticalFailures")}</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{summary.criticalFailures}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t("system.failedJobs.metrics.repeatFailures")}</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{summary.repeatFailures}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t("system.failedJobs.metrics.health")}</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <p className="text-3xl font-bold">{summary.healthScore}</p>
                {severityBadge(summary.healthStatus, t)}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("system.failedJobs.listTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("system.failedJobs.empty")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("system.failedJobs.table.job")}</TableHead>
                    <TableHead>{t("system.failedJobs.table.module")}</TableHead>
                    <TableHead>{t("system.failedJobs.table.queue")}</TableHead>
                    <TableHead>{t("system.failedJobs.table.severity")}</TableHead>
                    <TableHead>{t("system.failedJobs.table.age")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.uuid}>
                      <TableCell>
                        <div className="font-medium">{row.jobClass}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-xs">{row.exceptionPreview}</div>
                      </TableCell>
                      <TableCell>{row.module}</TableCell>
                      <TableCell>{row.queue}</TableCell>
                      <TableCell>{severityBadge(row.jobSeverity, t)}</TableCell>
                      <TableCell>{row.ageMinutes}m</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{t("system.failedJobs.byModule")}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {groupedModule.length === 0 ? (
                <p className="text-muted-foreground">{t("system.failedJobs.noGroupedData")}</p>
              ) : (
                groupedModule.map((group) => (
                  <div key={group.module} className="flex justify-between gap-2">
                    <span className="capitalize">{group.module}</span>
                    <span className="text-muted-foreground">
                      {t("system.failedJobs.criticalCount", { count: group.count, critical: group.criticalCount })}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{t("system.failedJobs.trendTitle")}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm max-h-64 overflow-auto">
              {trends.length === 0 ? (
                <p className="text-muted-foreground">{t("system.failedJobs.noSnapshots")}</p>
              ) : (
                trends.map((point) => (
                  <div key={point.snapshotDate} className="flex justify-between gap-2">
                    <span>{point.snapshotDate}</span>
                    <span className="text-muted-foreground">
                      {t("system.failedJobs.trendRow", { total: point.totalFailures, critical: point.criticalFailures })}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
