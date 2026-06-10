import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditDashboardCards } from "@/components/audit/AuditDashboardCards";
import { AuditFilters } from "@/components/audit/AuditFilters";
import { AuditHistoryDrawer } from "@/components/audit/AuditHistoryDrawer";
import { AuditSearch } from "@/components/audit/AuditSearch";
import { AuditTimeline } from "@/components/audit/AuditTimeline";
import {
  getAuditCenterSummary,
  getAuditEntityHistory,
  listAuditTimeline,
  searchAuditCenter,
  type AuditCenterSummary,
  type ListAuditCenterParams,
  type UnifiedAuditRecord,
} from "@/lib/api-integration/auditCenterEndpoints";
import { ApiHttpError } from "@/lib/api-integration/client";
import { useAuthStore } from "@/stores/authStore";
import { useOutletStore } from "@/stores/outletStore";

const DEFAULT_FILTERS: ListAuditCenterParams = { limit: 25, page: 1 };

export default function AuditCenterPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const canAccess = hasPermission("settings.manage");

  const [filters, setFilters] = useState<ListAuditCenterParams>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<ListAuditCenterParams>(DEFAULT_FILTERS);
  const [records, setRecords] = useState<UnifiedAuditRecord[]>([]);
  const [summary, setSummary] = useState<AuditCenterSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [selected, setSelected] = useState<UnifiedAuditRecord | null>(null);
  const [history, setHistory] = useState<UnifiedAuditRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(async () => {
    if (!canAccess) {
      setLoading(false);
      return;
    }

    const scopedFilters: ListAuditCenterParams = {
      ...appliedFilters,
      outletId: typeof activeOutletId === "number" && activeOutletId > 0 ? activeOutletId : undefined,
    };

    setLoading(true);
    setError(null);
    try {
      const [timelineRes, summaryRes] = await Promise.all([
        searchQuery
          ? searchAuditCenter(searchQuery, scopedFilters)
          : listAuditTimeline(scopedFilters),
        getAuditCenterSummary(scopedFilters.outletId),
      ]);
      setRecords(timelineRes.data);
      setSummary(summaryRes);
    } catch (e) {
      if (e instanceof ApiHttpError && (e.status === 401 || e.status === 403)) {
        setError("You need settings.manage permission to view the Audit Center.");
      } else {
        setError(e instanceof Error ? e.message : "Failed to load audit center");
        toast.error("Failed to load audit center");
      }
    } finally {
      setLoading(false);
    }
  }, [canAccess, appliedFilters, activeOutletId, searchQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSelect = async (record: UnifiedAuditRecord) => {
    setSelected(record);
    setDrawerOpen(true);
    setHistoryLoading(true);
    try {
      const entityHistory = await getAuditEntityHistory({
        entityType: record.entityType,
        entityId: record.entityId,
        outletId: record.outletId ?? undefined,
      });
      setHistory(entityHistory);
    } catch {
      setHistory([record]);
    } finally {
      setHistoryLoading(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Audit Center</h1>
        <Card>
          <CardContent className="py-8 text-center space-y-2">
            <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Restricted — settings.manage permission is required to access the Audit Center.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (typeof activeOutletId !== "number" || activeOutletId < 1) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Audit Center</h1>
        <p className="text-sm text-muted-foreground mt-2">Select an outlet to load audit activity.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Centralized compliance timeline — operational, financial, and forensic change history.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/notifications">Notification Center</Link>
          </Button>
        </div>
      </div>

      <AuditDashboardCards summary={summary} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Actors</CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.topActors?.length ? (
              <ul className="text-sm space-y-1">
                {summary.topActors.map((actor) => (
                  <li key={actor.userId} className="flex justify-between">
                    <span>{actor.userName}</span>
                    <span className="text-muted-foreground tabular-nums">{actor.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No activity today.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Modules</CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.topModules?.length ? (
              <ul className="text-sm space-y-1">
                {summary.topModules.map((mod) => (
                  <li key={mod.module} className="flex justify-between capitalize">
                    <span>{mod.module}</span>
                    <span className="text-muted-foreground tabular-nums">{mod.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No module activity today.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <AuditSearch
        loading={loading}
        onSearch={(q) => {
          setSearchQuery(q);
          setAppliedFilters({ ...appliedFilters, page: 1 });
        }}
      />

      <AuditFilters
        filters={filters}
        onChange={setFilters}
        onApply={() => {
          setSearchQuery(null);
          setAppliedFilters({ ...filters, page: 1 });
        }}
        onReset={() => {
          setFilters(DEFAULT_FILTERS);
          setAppliedFilters(DEFAULT_FILTERS);
          setSearchQuery(null);
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive py-4">{error}</p>
          ) : (
            <AuditTimeline records={records} loading={loading} onSelect={(r) => void handleSelect(r)} />
          )}
        </CardContent>
      </Card>

      <AuditHistoryDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        record={selected}
        history={history}
        loading={historyLoading}
      />

    </div>
  );
}
