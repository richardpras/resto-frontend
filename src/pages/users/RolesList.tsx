import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Shield, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  listRoles,
  listPermissions,
  listUsers,
  createRole,
  assignRolePermissions,
  type RoleApiRow,
  type PermissionApiRow,
} from "@/lib/api-integration/userManagementEndpoints";
import { groupPermissionsByCodePrefix } from "@/lib/userManagement/groupPermissionsByCodePrefix";
import { ApiHttpError } from "@/lib/api-integration/client";
import { toast } from "sonner";

export default function RolesList() {
  const queryClient = useQueryClient();
  const qr = useQuery({ queryKey: ["roles"], queryFn: listRoles });
  const qp = useQuery({ queryKey: ["permissions"], queryFn: listPermissions });
  const qu = useQuery({ queryKey: ["users"], queryFn: listUsers });

  const roles = qr.data ?? [];
  const permissionsCatalog = qp.data ?? [];
  const users = qu.data ?? [];

  const userCountByRoleId = useMemo(() => {
    const m: Record<number, number> = {};
    for (const u of users) {
      for (const r of u.roles ?? []) {
        m[r.id] = (m[r.id] ?? 0) + 1;
      }
    }
    return m;
  }, [users]);

  const permGroups = useMemo(
    () => groupPermissionsByCodePrefix(permissionsCatalog.map((p) => ({ id: p.id, code: p.code, name: p.name }))),
    [permissionsCatalog],
  );

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [permsOpen, setPermsOpen] = useState<RoleApiRow | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<number[]>([]);

  const fetchErr = qr.error ?? qp.error ?? qu.error;
  useEffect(() => {
    if (fetchErr instanceof ApiHttpError) toast.error(fetchErr.message);
  }, [fetchErr]);

  useEffect(() => {
    if (permsOpen) {
      const ids = (permsOpen.permissions ?? []).map((p) => p.id);
      setSelectedPermIds(ids);
    }
  }, [permsOpen]);

  const createMu = useMutation({
    mutationFn: () => createRole({ name: name.trim(), description: desc.trim() || null }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Role created");
      setOpen(false);
      setName("");
      setDesc("");
    },
    onError: (e: unknown) => toast.error(e instanceof ApiHttpError ? e.message : "Failed to create role"),
  });

  const assignMu = useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: number; permissionIds: number[] }) =>
      assignRolePermissions(roleId, permissionIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Permissions updated");
      setPermsOpen(null);
    },
    onError: (e: unknown) => toast.error(e instanceof ApiHttpError ? e.message : "Failed to update permissions"),
  });

  const loading = qr.isLoading || qp.isLoading || qu.isLoading;

  const togglePerm = (id: number) => {
    setSelectedPermIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleGroup = (ids: number[], allOn: boolean) => {
    setSelectedPermIds((prev) => {
      if (allOn) return prev.filter((x) => !ids.includes(x));
      return Array.from(new Set([...prev, ...ids]));
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setName(""); setDesc(""); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Add Role
        </Button>
      </div>

      <Card className="rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading roles…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.description ?? "—"}</TableCell>
                  <TableCell>{userCountByRoleId[r.id] ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{(r.permissions ?? []).length} perms</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setPermsOpen(r)}>
                      <Shield className="h-4 w-4" /> Permissions
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Role</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Role Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Supervisor" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Short description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!name.trim()) { toast.error("Role name required"); return; }
                createMu.mutate();
              }}
              disabled={createMu.isPending}
            >
              {createMu.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!permsOpen} onOpenChange={(o) => !o && setPermsOpen(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permissions — {permsOpen?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {permGroups.map((g) => {
              const ids = g.items.map((i) => i.id);
              const onCount = ids.filter((id) => selectedPermIds.includes(id)).length;
              const allOn = ids.length > 0 && onCount === ids.length;
              return (
                <div key={g.prefix} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">{g.label}</p>
                      <p className="text-xs text-muted-foreground">{onCount}/{ids.length} enabled</p>
                    </div>
                    <Button size="sm" variant="outline" type="button" onClick={() => toggleGroup(ids, allOn)}>
                      {allOn ? "Disable all" : "Enable all"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {g.items.map((item) => (
                      <label key={item.id} className="flex items-start gap-2 rounded-lg border p-2 cursor-pointer hover:bg-accent">
                        <Checkbox
                          checked={selectedPermIds.includes(item.id)}
                          onCheckedChange={() => togglePerm(item.id)}
                          className="mt-0.5"
                        />
                        <span className="text-sm">
                          <span className="font-mono text-xs text-muted-foreground">{item.code}</span>
                          <br />
                          {item.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermsOpen(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!permsOpen) return;
                assignMu.mutate({ roleId: permsOpen.id, permissionIds: selectedPermIds });
              }}
              disabled={assignMu.isPending}
            >
              {assignMu.isPending ? "Saving…" : "Save Permissions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
