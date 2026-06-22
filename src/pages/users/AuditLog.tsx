import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dialogScroll, dialogSize } from "@/lib/ui/dialogSizes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/DataTable";
import {
  listUserManagementAuditLogs,
  type UserManagementAuditLogRow,
} from "@/lib/api-integration/userManagementEndpoints";
import { ApiHttpError } from "@/lib/api-integration/client";
import { toast } from "sonner";

const ACTION_OPTIONS = [
  "user.created",
  "role_permission_changed",
  "user.pin_set",
  "user.pin_cleared",
  "role.created",
  "permission.created",
] as const;

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function summarizeChange(row: UserManagementAuditLogRow): string {
  const meta = row.metadata ?? {};
  const before = row.before ?? {};
  const after = row.after ?? {};

  if (row.action === "role_permission_changed" && row.entityType === "user") {
    const granted = (meta.grantedRoleIds as number[] | undefined) ?? [];
    const revoked = (meta.revokedRoleIds as number[] | undefined) ?? [];
    const parts: string[] = [];
    if (granted.length > 0) parts.push(`+${granted.length} role`);
    if (revoked.length > 0) parts.push(`-${revoked.length} role`);
    if (parts.length > 0) return parts.join(", ");
    const beforeNames = (before.roleNames as string[] | undefined) ?? [];
    const afterNames = (after.roleNames as string[] | undefined) ?? [];
    return `${beforeNames.join(", ") || "—"} → ${afterNames.join(", ") || "—"}`;
  }

  if (row.action === "role_permission_changed" && row.entityType === "role") {
    const granted = (meta.grantedPermissionIds as number[] | undefined) ?? [];
    const revoked = (meta.revokedPermissionIds as number[] | undefined) ?? [];
    const parts: string[] = [];
    if (granted.length > 0) parts.push(`+${granted.length} perm`);
    if (revoked.length > 0) parts.push(`-${revoked.length} perm`);
    return parts.length > 0 ? parts.join(", ") : row.entityType;
  }

  if (row.action === "user.created") {
    return (after.name as string | undefined) ?? (after.email as string | undefined) ?? "—";
  }

  if (row.action === "role.created") {
    return (after.name as string | undefined) ?? "—";
  }

  if (row.action === "permission.created") {
    return (after.code as string | undefined) ?? "—";
  }

  if (row.action === "user.pin_set" || row.action === "user.pin_cleared") {
    return row.targetUserName ?? `User #${row.entityId}`;
  }

  return `${row.entityType} #${row.entityId}`;
}

function actionVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action === "user.pin_set" || action === "user.pin_cleared" || action === "role_permission_changed") {
    return "destructive";
  }
  if (action === "user.created" || action === "role.created" || action === "permission.created") {
    return "secondary";
  }
  return "outline";
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap break-all">
      {value == null ? "—" : JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function AuditLog() {
  const { t } = useTranslation("common");
  const range = useMemo(() => defaultRange(), []);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState(range.from);
  const [toDate, setToDate] = useState(range.to);
  const [detail, setDetail] = useState<UserManagementAuditLogRow | null>(null);

  const query = useQuery({
    queryKey: ["user-management-audit", page, search, actionFilter, fromDate, toDate],
    queryFn: () =>
      listUserManagementAuditLogs({
        page,
        limit: 25,
        search: search.trim() || undefined,
        action: actionFilter === "all" ? undefined : actionFilter,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
  });

  useEffect(() => {
    if (query.error instanceof ApiHttpError) {
      toast.error(query.error.message || t("usersManagement.audit.loadFailed"));
    }
  }, [query.error, t]);

  const actionLabel = useCallback(
    (action: string) =>
      t(`usersManagement.audit.actions.${action}`, { defaultValue: action }),
    [t],
  );

  const columns: Column<UserManagementAuditLogRow>[] = useMemo(
    () => [
      {
        key: "time",
        header: t("usersManagement.audit.columns.time"),
        render: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"),
      },
      {
        key: "action",
        header: t("usersManagement.audit.columns.action"),
        render: (row) => (
          <Badge variant={actionVariant(row.action)} className="font-normal">
            {actionLabel(row.action)}
          </Badge>
        ),
      },
      {
        key: "actor",
        header: t("usersManagement.audit.columns.actor"),
        render: (row) => row.actorUserName ?? (row.actorUserId ? `User #${row.actorUserId}` : "—"),
      },
      {
        key: "target",
        header: t("usersManagement.audit.columns.target"),
        render: (row) => {
          if (row.targetUserName) return row.targetUserName;
          if (row.targetUserId) return `User #${row.targetUserId}`;
          return `${row.entityType} #${row.entityId}`;
        },
      },
      {
        key: "summary",
        header: t("usersManagement.audit.columns.summary"),
        render: (row) => <span className="text-muted-foreground text-sm">{summarizeChange(row)}</span>,
      },
    ],
    [actionLabel, t],
  );

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1 min-w-[180px] flex-1">
            <Label className="text-xs">{t("usersManagement.audit.searchPlaceholder")}</Label>
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t("usersManagement.audit.searchPlaceholder")}
            />
          </div>
          <div className="space-y-1 min-w-[160px]">
            <Label className="text-xs">{t("usersManagement.audit.columns.action")}</Label>
            <Select
              value={actionFilter}
              onValueChange={(v) => {
                setActionFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("usersManagement.audit.allActions")}</SelectItem>
                {ACTION_OPTIONS.map((action) => (
                  <SelectItem key={action} value={action}>
                    {actionLabel(action)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("usersManagement.audit.fromDate")}</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("usersManagement.audit.toDate")}</Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </Card>

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => String(row.id)}
        loading={query.isLoading}
        searchable={false}
        emptyMessage={t("usersManagement.audit.empty")}
        defaultPageSize={25}
        onRowClick={setDetail}
      />

      {meta && meta.lastPage > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {meta.currentPage} / {meta.lastPage} ({meta.total} entries)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || query.isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.lastPage || query.isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className={`${dialogSize.lg} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>{t("usersManagement.audit.detailTitle")}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant={actionVariant(detail.action)}>{actionLabel(detail.action)}</Badge>
                <span className="text-sm text-muted-foreground">
                  {detail.createdAt ? new Date(detail.createdAt).toLocaleString() : "—"}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">{t("usersManagement.audit.columns.actor")}</p>
                  <p>{detail.actorUserName ?? (detail.actorUserId ? `User #${detail.actorUserId}` : "—")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("usersManagement.audit.columns.target")}</p>
                  <p>
                    {detail.targetUserName ??
                      (detail.targetUserId ? `User #${detail.targetUserId}` : `${detail.entityType} #${detail.entityId}`)}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium mb-1">{t("usersManagement.audit.before")}</p>
                <JsonBlock value={detail.before} />
              </div>
              <div>
                <p className="text-xs font-medium mb-1">{t("usersManagement.audit.after")}</p>
                <JsonBlock value={detail.after} />
              </div>
              {detail.metadata && Object.keys(detail.metadata).length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1">{t("usersManagement.audit.metadata")}</p>
                  <JsonBlock value={detail.metadata} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
