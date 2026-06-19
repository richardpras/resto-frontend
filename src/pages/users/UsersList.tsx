import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil } from "lucide-react";
import { ShadcnTableSkeletonBody } from "@/components/skeletons/table/ShadcnTableSkeletonBody";
import { SkeletonBusyRegion } from "@/components/skeletons/SkeletonBusyRegion";
import { listUsers, listRoles } from "@/lib/api-integration/userManagementEndpoints";
import type { UserApiRow } from "@/lib/api-integration/userManagementEndpoints";
import { UserFormModal } from "@/components/UserFormModal";
import { ApiHttpError } from "@/lib/api-integration/client";
import { toast } from "sonner";

export default function UsersList() {
  const { t } = useTranslation("common");
  const qc = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const qr = useQuery({ queryKey: ["roles"], queryFn: listRoles });

  const users = qc.data ?? [];
  const roles = qr.data ?? [];

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserApiRow | null>(null);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (q && !`${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (roleFilter !== "all") {
        const rid = Number(roleFilter);
        const has = (u.roles ?? []).some((r) => r.id === rid);
        if (!has) return false;
      }
      return true;
    });
  }, [users, q, roleFilter]);

  const loading = qc.isLoading || qr.isLoading;
  const fetchErr = qc.error ?? qr.error;

  useEffect(() => {
    if (fetchErr instanceof ApiHttpError) toast.error(fetchErr.message);
  }, [fetchErr]);

  const roleBadges = (u: UserApiRow) => {
    const rs = u.roles ?? [];
    if (rs.length === 0) return <span className="text-muted-foreground text-sm">—</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {rs.map((r) => (
          <Badge key={r.id} variant="secondary">{r.name}</Badge>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 rounded-2xl">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("usersManagement.users.searchPlaceholder")} className="pl-9" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("usersManagement.users.allRoles")}</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => { setEditing(null); setOpen(true); }}
            disabled={roles.length === 0}
          >
            <Plus className="h-4 w-4" /> {t("usersManagement.users.addUser")}
          </Button>
        </div>
      </Card>

      <Card className="rounded-2xl overflow-hidden">
        <SkeletonBusyRegion busy={loading} label={t("usersManagement.users.loading")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("usersManagement.users.columns.name")}</TableHead>
                <TableHead>{t("usersManagement.users.columns.email")}</TableHead>
                <TableHead>{t("usersManagement.users.columns.pin")}</TableHead>
                <TableHead>{t("usersManagement.users.columns.roles")}</TableHead>
                <TableHead className="text-right">{t("usersManagement.users.columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            {loading ? (
              <ShadcnTableSkeletonBody columns={5} rows={8} />
            ) : (
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">{t("usersManagement.users.noUsers")}</TableCell></TableRow>
                )}
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      {u.pinSet ? (
                        <Badge variant="outline" className="font-normal">{t("usersManagement.users.pinSet")}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>{roleBadges(u)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(u); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        </SkeletonBusyRegion>
      </Card>

      <UserFormModal
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        roles={roles}
      />
    </div>
  );
}
