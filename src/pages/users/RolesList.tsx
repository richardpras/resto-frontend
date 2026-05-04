import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Shield } from "lucide-react";
import { useUserStore, Role } from "@/stores/userStore";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { groupPermissionsByCodePrefix } from "@/lib/userManagement/groupPermissionsByCodePrefix";
import { ApiHttpError } from "@/lib/api-integration/client";

export default function RolesList() {
  const { roles, users, permissionsCatalog, createRoleViaApi, assignRolePermissionsByIds } = useUserStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [permsOpen, setPermsOpen] = useState<Role | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const permissionGroups = useMemo(
    () => groupPermissionsByCodePrefix(permissionsCatalog.map((p) => ({ id: p.id, code: p.code, name: p.name }))),
    [permissionsCatalog],
  );

  const userCount = useMemo(() => {
    const m: Record<string, number> = {};
    users.forEach((u) => {
      u.roleIds.forEach((rid) => {
        m[rid] = (m[rid] ?? 0) + 1;
      });
    });
    return m;
  }, [users]);

  const openCreate = () => {
    setName("");
    setDesc("");
    setOpen(true);
  };

  const saveCreate = async () => {
    if (!name.trim()) {
      toast.error("Role name required");
      return;
    }
    setSaving(true);
    try {
      await createRoleViaApi({ name: name.trim(), description: desc.trim() });
      toast.success("Role created");
      setOpen(false);
    } catch (e) {
      const msg = e instanceof ApiHttpError ? e.message : "Failed to create role";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openPerms = (r: Role) => {
    setPermsOpen(r);
    setSelectedPermIds(r.permissions.map((p) => p.id));
  };

  const togglePermId = (id: number) => {
    setSelectedPermIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleGroup = (ids: number[], allSelected: boolean) => {
    setSelectedPermIds((prev) => {
      if (allSelected) {
        return prev.filter((x) => !ids.includes(x));
      }
      return Array.from(new Set([...prev, ...ids]));
    });
  };

  const savePerms = async () => {
    if (!permsOpen) return;
    if (selectedPermIds.length === 0) {
      toast.error("Select at least one permission (API requires a non-empty set).");
      return;
    }
    setSaving(true);
    try {
      await assignRolePermissionsByIds(permsOpen.id, selectedPermIds);
      toast.success("Permissions updated");
      setPermsOpen(null);
    } catch (e) {
      const msg = e instanceof ApiHttpError ? e.message : "Failed to update permissions";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Role</Button>
      </div>

      <Card className="rounded-2xl overflow-hidden">
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
            {roles.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No roles loaded</TableCell></TableRow>
            )}
            {roles.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {r.name}
                    {r.isSystem && <Badge variant="outline" className="text-[10px]">system</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{r.description}</TableCell>
                <TableCell>{userCount[r.id] ?? 0}</TableCell>
                <TableCell><Badge variant="secondary">{r.permissions.length} perms</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => openPerms(r)}>
                    <Shield className="h-4 w-4" /> Permissions
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
            <Button onClick={saveCreate} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!permsOpen} onOpenChange={(o) => !o && setPermsOpen(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permissions — {permsOpen?.name}</DialogTitle>
          </DialogHeader>
          {permissionGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No permissions in catalog. Ensure you are signed in and have loaded the Users page once.</p>
          ) : (
            <div className="space-y-4">
              {permissionGroups.map((g) => {
                const ids = g.items.map((i) => i.id);
                const onCount = ids.filter((id) => selectedPermIds.includes(id)).length;
                const allOn = onCount === ids.length;
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
                        <label key={item.id} className="flex items-center gap-2 rounded-lg border p-2 cursor-pointer hover:bg-accent">
                          <Checkbox
                            checked={selectedPermIds.includes(item.id)}
                            onCheckedChange={() => togglePermId(item.id)}
                          />
                          <span className="text-sm">
                            <span className="font-mono text-xs text-muted-foreground">{item.code}</span>
                            {" "}
                            {item.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermsOpen(null)}>Cancel</Button>
            <Button onClick={savePerms} disabled={saving || permissionGroups.length === 0}>
              {saving ? "Saving…" : "Save Permissions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
