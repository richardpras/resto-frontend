import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  addBugReportComment,
  fetchBugReportAttachmentBlob,
  getBugReport,
  listBugReports,
  updateBugReport,
  type BugReportRow,
  type BugReportSeverity,
  type BugReportStatus,
} from "@/lib/api-integration/bugReportEndpoints";
import { ApiHttpError } from "@/lib/api-integration/client";
import { useAuthStore } from "@/stores/authStore";
import { useOutletStore } from "@/stores/outletStore";

const STATUSES: BugReportStatus[] = ["open", "triaged", "investigating", "fixed", "closed", "wont_fix"];
const SEVERITIES: BugReportSeverity[] = ["low", "medium", "high", "critical"];

function severityBadge(severity: string) {
  if (severity === "critical") return <Badge variant="destructive">Critical</Badge>;
  if (severity === "high") return <Badge className="bg-warning/15 text-warning border-warning/30">High</Badge>;
  if (severity === "medium") return <Badge variant="secondary">Medium</Badge>;
  return <Badge variant="outline">Low</Badge>;
}

function statusBadge(status: string) {
  if (status === "closed" || status === "wont_fix") return <Badge variant="outline">{status}</Badge>;
  if (status === "fixed") return <Badge className="bg-success/15 text-success border-success/30">Fixed</Badge>;
  return <Badge>{status}</Badge>;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function DiagnosticsPanel({ diagnostics }: { diagnostics: Record<string, unknown> | null }) {
  if (!diagnostics) return <p className="text-sm text-muted-foreground">No diagnostics captured.</p>;

  const records = Array.isArray(diagnostics.records) ? diagnostics.records : [];
  const apiErrors = records.filter((r) => typeof r === "object" && r !== null && (r as { type?: string }).type === "api_error");
  const consoleErrors = records.filter(
    (r) => typeof r === "object" && r !== null && (r as { type?: string }).type === "console_error",
  );
  const other = records.filter(
    (r) =>
      typeof r === "object" &&
      r !== null &&
      !["api_error", "console_error"].includes((r as { type?: string }).type ?? ""),
  );

  return (
    <div className="space-y-4 text-sm">
      <pre className="bg-muted/50 rounded-lg p-3 overflow-auto max-h-40 text-xs">
        {JSON.stringify(
          {
            route: diagnostics.route,
            viewport: diagnostics.viewport,
            timezone: diagnostics.timezone,
            appVersion: diagnostics.appVersion,
          },
          null,
          2,
        )}
      </pre>

      {apiErrors.length > 0 && (
        <div>
          <h4 className="font-medium mb-1">API Errors ({apiErrors.length})</h4>
          <pre className="bg-muted/50 rounded-lg p-3 overflow-auto max-h-32 text-xs">{JSON.stringify(apiErrors, null, 2)}</pre>
        </div>
      )}

      {consoleErrors.length > 0 && (
        <div>
          <h4 className="font-medium mb-1">Console Errors ({consoleErrors.length})</h4>
          <pre className="bg-muted/50 rounded-lg p-3 overflow-auto max-h-32 text-xs">{JSON.stringify(consoleErrors, null, 2)}</pre>
        </div>
      )}

      {other.length > 0 && (
        <div>
          <h4 className="font-medium mb-1">Other Events ({other.length})</h4>
          <pre className="bg-muted/50 rounded-lg p-3 overflow-auto max-h-32 text-xs">{JSON.stringify(other, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function BugReportDetail({
  report,
  onUpdated,
}: {
  report: BugReportRow;
  onUpdated: (row: BugReportRow) => void;
}) {
  const [status, setStatus] = useState<BugReportStatus>(report.status);
  const [severity, setSeverity] = useState<BugReportSeverity>(report.severity);
  const [assigneeId, setAssigneeId] = useState(report.assignedToUserId ? String(report.assignedToUserId) : "");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [screenshotSrc, setScreenshotSrc] = useState<string | null>(null);

  const screenshot = report.attachments?.[0];

  useEffect(() => {
    let objectUrl: string | null = null;
    if (!screenshot?.downloadUrl) {
      setScreenshotSrc(null);
      return;
    }
    void fetchBugReportAttachmentBlob(screenshot.downloadUrl).then((url) => {
      objectUrl = url;
      setScreenshotSrc(url);
    });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [screenshot?.downloadUrl, report.id]);

  const saveMeta = async () => {
    setSaving(true);
    try {
      const updated = await updateBugReport(report.id, {
        status,
        severity,
        assignedToUserId: assigneeId.trim() ? Number(assigneeId) : null,
      });
      onUpdated(updated);
      toast.success("Bug report updated");
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const submitComment = async () => {
    if (!comment.trim()) return;
    setSaving(true);
    try {
      await addBugReportComment(report.id, comment.trim());
      const refreshed = await getBugReport(report.id);
      onUpdated(refreshed);
      setComment("");
      toast.success("Comment added");
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to add comment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap gap-2">
        {severityBadge(report.severity)}
        {statusBadge(report.status)}
      </div>

      {screenshotSrc ? (
        <div className="rounded-lg border overflow-hidden">
          <img src={screenshotSrc} alt="Bug screenshot" className="w-full max-h-64 object-contain bg-muted/30" />
        </div>
      ) : null}

      <div>
        <h3 className="font-semibold text-lg">{report.title}</h3>
        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{report.message}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">Reporter</span>
          <p>{report.reporterName ?? `#${report.reporterUserId}`}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Route</span>
          <p className="font-mono text-xs break-all">{report.currentRoute ?? "—"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Browser</span>
          <p>{report.browser ?? "—"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Viewport</span>
          <p>{report.viewport ?? "—"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">App version</span>
          <p>{report.appVersion ?? "—"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Created</span>
          <p>{formatDate(report.createdAt)}</p>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">Diagnostics</h4>
        <DiagnosticsPanel diagnostics={report.diagnosticsJson} />
      </div>

      <div className="space-y-3 border-t pt-4">
        <h4 className="font-medium">Manage</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as BugReportStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Severity</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as BugReportSeverity)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Assign to user ID</Label>
            <Input value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} placeholder="User ID" />
          </div>
        </div>
        <Button size="sm" onClick={() => void saveMeta()} disabled={saving}>Save changes</Button>
      </div>

      <div className="space-y-3 border-t pt-4">
        <h4 className="font-medium">Comments</h4>
        {(report.comments ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          <ul className="space-y-2">
            {(report.comments ?? []).map((c) => (
              <li key={c.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{c.userName ?? `User #${c.userId}`}</p>
                <p className="text-muted-foreground text-xs">{formatDate(c.createdAt)}</p>
                <p className="mt-1 whitespace-pre-wrap">{c.comment}</p>
              </li>
            ))}
          </ul>
        )}
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" rows={3} />
        <Button size="sm" variant="outline" onClick={() => void submitComment()} disabled={saving || !comment.trim()}>
          Add comment
        </Button>
      </div>
    </div>
  );
}

export default function BugReportsPage() {
  const { id: routeId } = useParams();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const canAccess = hasPermission("settings.manage");

  const [rows, setRows] = useState<BugReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<BugReportRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await listBugReports({
        outletId: typeof activeOutletId === "number" && activeOutletId > 0 ? activeOutletId : undefined,
        status: statusFilter !== "all" ? (statusFilter as BugReportStatus) : undefined,
        severity: severityFilter !== "all" ? (severityFilter as BugReportSeverity) : undefined,
        search: search.trim() || undefined,
        limit: 50,
      });
      setRows(res.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load bug reports");
    } finally {
      setLoading(false);
    }
  }, [canAccess, activeOutletId, statusFilter, severityFilter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (id: number) => {
    setDrawerOpen(true);
    setDetailLoading(true);
    try {
      const report = await getBugReport(id);
      setSelected(report);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load detail");
      setDrawerOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (routeId && canAccess) {
      const id = Number(routeId);
      if (id > 0) void openDetail(id);
    }
  }, [routeId, canAccess]);

  if (!canAccess) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center space-y-4">
        <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground" />
        <h1 className="text-xl font-semibold">Bug Reports</h1>
        <p className="text-muted-foreground">You need settings.manage permission to view bug reports.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bug Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            In-app bug submissions with screenshots and diagnostic logs.
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Input
            placeholder="Search title, message, route…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="secondary" size="sm" onClick={() => void load()}>Apply</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bug reports found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Assigned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => void openDetail(row.id)}
                  >
                    <TableCell>{severityBadge(row.severity)}</TableCell>
                    <TableCell>{statusBadge(row.status)}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{row.title}</TableCell>
                    <TableCell>{row.reporterName ?? `#${row.reporterUserId}`}</TableCell>
                    <TableCell className="font-mono text-xs max-w-[160px] truncate">{row.currentRoute ?? "—"}</TableCell>
                    <TableCell className="text-xs">{formatDate(row.createdAt)}</TableCell>
                    <TableCell>{row.assigneeName ?? (row.assignedToUserId ? `#${row.assignedToUserId}` : "—")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Bug Report #{selected?.id ?? "…"}</SheetTitle>
          </SheetHeader>
          {detailLoading || !selected ? (
            <Skeleton className="h-64 w-full mt-4" />
          ) : (
            <BugReportDetail
              report={selected}
              onUpdated={(row) => {
                setSelected(row);
                setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...row } : r)));
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
