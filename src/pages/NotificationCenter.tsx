import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, AlertTriangle, Bell, CheckCircle2, Info, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  listUserNotifications,
  markAllUserNotificationsRead,
  markUserNotificationRead,
  type ListNotificationsResponse,
  type UserNotification,
  type UserNotificationSeverity,
  type UserNotificationSourceModule,
} from "@/lib/api-integration/notificationEndpoints";
import { useOutletStore } from "@/stores/outletStore";
import { useNotificationStore } from "@/stores/notificationStore";

const SOURCE_OPTIONS: { value: UserNotificationSourceModule | "all"; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "accounting", label: "Accounting" },
  { value: "payments", label: "Payments" },
  { value: "monitoring", label: "Monitoring" },
  { value: "inventory", label: "Inventory" },
  { value: "procurement", label: "Procurement" },
  { value: "payroll", label: "Payroll" },
  { value: "hr", label: "HR" },
  { value: "crm", label: "CRM" },
  { value: "system", label: "System" },
  { value: "menu_intelligence", label: "Menu Intelligence" },
];

function SeverityBadge({ severity }: { severity: UserNotificationSeverity }) {
  if (severity === "critical") {
    return <Badge variant="destructive">Critical</Badge>;
  }
  if (severity === "warning") {
    return <Badge className="bg-warning/15 text-warning border-warning/30">Warning</Badge>;
  }
  if (severity === "success") {
    return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Success</Badge>;
  }
  return <Badge variant="secondary">Info</Badge>;
}

function SeverityIcon({ severity }: { severity: UserNotificationSeverity }) {
  if (severity === "critical") return <AlertCircle className="h-4 w-4 text-destructive" />;
  if (severity === "warning") return <AlertTriangle className="h-4 w-4 text-warning" />;
  if (severity === "success") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  return <Info className="h-4 w-4 text-muted-foreground" />;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function NotificationCenter() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const refreshBell = useNotificationStore((s) => s.refresh);
  const [tab, setTab] = useState<"all" | "unread" | "critical">("all");
  const [source, setSource] = useState<UserNotificationSourceModule | "all">("all");
  const [severity, setSeverity] = useState<UserNotificationSeverity | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ListNotificationsResponse>({
    data: [],
    meta: { currentPage: 1, lastPage: 1, perPage: 20, total: 0 },
  });

  const queryParams = useMemo(() => {
    const params: Parameters<typeof listUserNotifications>[0] = {
      page: 1,
      limit: 50,
      outletId: typeof activeOutletId === "number" && activeOutletId >= 1 ? activeOutletId : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };
    if (tab === "unread") params.unread = true;
    if (tab === "critical") params.severity = "critical";
    if (source !== "all") params.source = source;
    if (severity !== "all" && tab !== "critical") params.severity = severity;
    return params;
  }, [activeOutletId, dateFrom, dateTo, severity, source, tab]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listUserNotifications(queryParams);
      setResponse(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMarkRead = async (notification: UserNotification) => {
    try {
      await markUserNotificationRead(notification.id);
      toast.success("Marked as read");
      await load();
      await refreshBell(activeOutletId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark as read");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllUserNotificationsRead(
        typeof activeOutletId === "number" && activeOutletId >= 1 ? activeOutletId : undefined,
      );
      toast.success("All notifications marked as read");
      await load();
      await refreshBell(activeOutletId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark all as read");
    }
  };

  const rows = response.data;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Notification Center</h1>
            <p className="text-sm text-muted-foreground">Staff alerts from accounting, payments, monitoring, and inventory.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => void handleMarkAllRead()}>
            Mark all read
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Inbox</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
              <TabsTrigger value="critical">Critical</TabsTrigger>
            </TabsList>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
                <SelectTrigger aria-label="Source module">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={severity}
                onValueChange={(v) => setSeverity(v as typeof severity)}
                disabled={tab === "critical"}
              >
                <SelectTrigger aria-label="Severity">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="Date from" />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="Date to" />
            </div>

            <TabsContent value={tab} className="mt-4">
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Severity</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                          {loading ? "Loading…" : "No notifications match your filters."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => (
                        <TableRow key={row.id} className={row.isRead ? "opacity-75" : undefined}>
                          <TableCell>
                            <SeverityIcon severity={row.severity} />
                          </TableCell>
                          <TableCell>
                            <SeverityBadge severity={row.severity} />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{row.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">{row.message}</p>
                            </div>
                          </TableCell>
                          <TableCell className="capitalize text-sm">{row.sourceModule}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatWhen(row.createdAt)}</TableCell>
                          <TableCell>
                            {row.isRead ? (
                              <Badge variant="outline">Read</Badge>
                            ) : (
                              <Badge>Unread</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {!row.isRead ? (
                              <Button type="button" size="sm" variant="ghost" onClick={() => void handleMarkRead(row)}>
                                Mark read
                              </Button>
                            ) : null}
                            {row.actionUrl ? (
                              <Button type="button" size="sm" variant="link" asChild>
                                <Link to={row.actionUrl}>Open</Link>
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Showing {rows.length} of {response.meta.total} notification(s)
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
