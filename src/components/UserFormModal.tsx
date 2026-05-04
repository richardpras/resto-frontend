import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { AppUser, useUserStore } from "@/stores/userStore";
import { toast } from "sonner";
import { ApiHttpError } from "@/lib/api-integration/client";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: AppUser | null;
}

export function UserFormModal({ open, onOpenChange, editing }: Props) {
  const { roles, outlets, createUserWithRoles, assignUserRolesForUser } = useUserStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [active, setActive] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setEmail(editing?.email ?? "");
      setPassword("");
      setRoleIds(editing?.roleIds?.length ? [...editing.roleIds] : roles[0]?.id ? [roles[0].id] : []);
      setActive((editing?.status ?? "active") === "active");
    }
  }, [open, editing, roles]);

  const toggleRole = (id: string) =>
    setRoleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    if (roleIds.length === 0) {
      toast.error("Select at least one role");
      return;
    }
    if (!editing && !password.trim()) {
      toast.error("Password is required for new users");
      return;
    }
    setPending(true);
    try {
      if (editing) {
        await assignUserRolesForUser(editing.id, roleIds);
        toast.success("Roles updated");
      } else {
        await createUserWithRoles({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          roleIds,
        });
        toast.success("User created");
      }
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof ApiHttpError ? e.message : "Request failed";
      toast.error(msg);
    } finally {
      setPending(false);
    }
  };

  const isEdit = !!editing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Add User"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Basic Info</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  disabled={isEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@email.com"
                  disabled={isEdit}
                />
              </div>
              {!isEdit && (
                <div className="space-y-1.5 col-span-2">
                  <Label>Password</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" />
                </div>
              )}
              <div className="col-span-2 flex items-center justify-between rounded-lg border p-3 opacity-60">
                <div>
                  <Label className="text-sm">Status</Label>
                  <p className="text-xs text-muted-foreground">Not persisted by API yet</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{active ? "Active" : "Inactive"}</span>
                  <Switch checked={active} onCheckedChange={setActive} disabled />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Roles</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border p-3">
              {roles.length === 0 && <p className="text-sm text-muted-foreground">No roles available</p>}
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 cursor-pointer py-1">
                  <Checkbox checked={roleIds.includes(r.id)} onCheckedChange={() => toggleRole(r.id)} />
                  <span className="text-sm">{r.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Outlet Access</h3>
            <p className="text-sm text-muted-foreground rounded-lg border p-3">
              Outlet assignment is not available from the API yet.
            </p>
            {outlets.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2 opacity-50 pointer-events-none">
                {outlets.map((o) => (
                  <div key={o.id} className="flex items-center gap-2 rounded-lg border p-3">
                    <Checkbox disabled />
                    <span className="text-sm">{o.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
