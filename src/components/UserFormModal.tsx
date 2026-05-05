import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  adminClearUserScreenPin,
  adminSetUserScreenPin,
  createUser,
  assignUserRoles,
  type UserApiRow,
  type RoleApiRow,
} from "@/lib/api-integration/userManagementEndpoints";
import { ApiHttpError } from "@/lib/api-integration/client";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: UserApiRow | null;
  roles: RoleApiRow[];
}

function sanitizePinInput(v: string): string {
  return v.replace(/\D/g, "").slice(0, 4);
}

type PinEditAction = "none" | "clear" | "keep" | "set";

export function UserFormModal({ open, onOpenChange, editing, roles }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [useScreenPin, setUseScreenPin] = useState(false);
  const [screenPin, setScreenPin] = useState("");
  const [screenPinConfirm, setScreenPinConfirm] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setEmail(editing?.email ?? "");
      setPassword("");
      setUseScreenPin(Boolean(editing?.pinSet));
      setScreenPin("");
      setScreenPinConfirm("");
      setSelectedRoleIds((editing?.roles ?? []).map((r) => r.id));
    }
  }, [open, editing]);

  const toggleRole = (id: number) => {
    setSelectedRoleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const parsePinPair = (): { valid: boolean; pin?: string } => {
    const a = screenPin.trim();
    const b = screenPinConfirm.trim();
    if (a === "" && b === "") return { valid: true };
    if (a.length !== 4 || !/^[0-9]{4}$/.test(a) || b.length !== 4 || !/^[0-9]{4}$/.test(b)) {
      toast.error("PIN must be exactly 4 digits in both fields, or leave both blank.");
      return { valid: false };
    }
    if (a !== b) {
      toast.error("PIN and confirmation do not match.");
      return { valid: false };
    }
    return { valid: true, pin: a };
  };

  /** How to update PIN on the server for edit mode (after roles are saved). */
  const resolveEditPinAction = (): { action: PinEditAction; pin?: string; ok: boolean } => {
    if (!editing) return { action: "none", ok: true };
    if (!useScreenPin) {
      return { action: editing.pinSet ? "clear" : "none", ok: true };
    }
    const parsed = parsePinPair();
    if (!parsed.valid) return { action: "none", ok: false };
    if (parsed.pin !== undefined) return { action: "set", pin: parsed.pin, ok: true };
    if (editing.pinSet) return { action: "keep", ok: true };
    toast.error("User belum punya PIN. Isi PIN dan konfirmasi, atau matikan opsi kunci layar.");
    return { action: "none", ok: false };
  };

  const maybeRefreshSession = async (userId: number) => {
    const me = useAuthStore.getState().user;
    if (me && String(userId) === me.id) {
      await useAuthStore.getState().restoreSessionFromApi();
    }
  };

  const createMu = useMutation({
    mutationFn: async (payload: { pin?: string }) => {
      const body: Parameters<typeof createUser>[0] = {
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
      };
      if (payload.pin !== undefined) body.pin = payload.pin;
      const user = await createUser(body);
      if (selectedRoleIds.length > 0) {
        await assignUserRoles(user.id, selectedRoleIds);
      }
      return user;
    },
    onSuccess: async (row) => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created");
      await maybeRefreshSession(row.id);
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to create user");
    },
  });

  const updateMu = useMutation({
    mutationFn: async (pinPart: { action: PinEditAction; pin?: string }) => {
      if (!editing) return null;
      await assignUserRoles(editing.id, selectedRoleIds);
      if (pinPart.action === "clear") {
        await adminClearUserScreenPin(editing.id);
      } else if (pinPart.action === "set" && pinPart.pin !== undefined) {
        await adminSetUserScreenPin(editing.id, pinPart.pin);
      }
      return editing.id;
    },
    onSuccess: async (uid) => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated");
      if (uid !== null) await maybeRefreshSession(uid);
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to save user");
    },
  });

  const submit = () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    if (!editing && !password.trim()) {
      toast.error("Password is required for new users");
      return;
    }
    if (selectedRoleIds.length === 0) {
      toast.error("Select at least one role");
      return;
    }

    if (!editing) {
      if (!useScreenPin) {
        createMu.mutate({});
        return;
      }
      const parsed = parsePinPair();
      if (!parsed.valid) return;
      if (parsed.pin === undefined) {
        toast.error("Aktifkan PIN hanya jika sudah mengisi PIN 4 digit.");
        return;
      }
      createMu.mutate({ pin: parsed.pin });
      return;
    }

    const pinRes = resolveEditPinAction();
    if (!pinRes.ok) return;
    updateMu.mutate({ action: pinRes.action, pin: pinRes.pin });
  };

  const pending = createMu.isPending || updateMu.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit user roles" : "Add User"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" disabled={!!editing} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@email.com" disabled={!!editing} />
            </div>
            {!editing && (
              <div className="space-y-1.5 col-span-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Screen PIN (POS unlock)
            </h3>
            <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/50">
              <Checkbox
                checked={useScreenPin}
                onCheckedChange={(v) => {
                  const on = v === true;
                  setUseScreenPin(on);
                  if (!on) {
                    setScreenPin("");
                    setScreenPinConfirm("");
                  }
                }}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <span className="text-sm font-medium">Gunakan PIN untuk kunci layar POS</span>
                <p className="text-xs text-muted-foreground">
                  Jika mati, pengguna ini tidak memakai PIN — kunci otomatis dan tombol Kunci tidak aktif saat login sebagai user ini.
                </p>
              </div>
            </label>
            {useScreenPin ? (
              <>
                <p className="text-xs text-muted-foreground mt-3 mb-2">
                  {editing
                    ? editing.pinSet
                      ? "Kosongkan kedua field untuk mempertahankan PIN saat ini; isi untuk mengganti."
                      : "Wajib isi PIN baru 4 digit untuk akun ini."
                    : "Centang opsi di atas lalu isi PIN (wajib 4 digit saat opsi menyala). Tanpa centang, akun tanpa PIN."}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>PIN</Label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={screenPin}
                      onChange={(e) => setScreenPin(sanitizePinInput(e.target.value))}
                      placeholder="····"
                      className="tracking-widest"
                      autoComplete="new-password"
                      disabled={pending}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Confirm PIN</Label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={screenPinConfirm}
                      onChange={(e) => setScreenPinConfirm(sanitizePinInput(e.target.value))}
                      placeholder="····"
                      className="tracking-widest"
                      autoComplete="new-password"
                      disabled={pending}
                    />
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Roles</h3>
            <div className="rounded-lg border divide-y max-h-[240px] overflow-y-auto">
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent">
                  <Checkbox checked={selectedRoleIds.includes(r.id)} onCheckedChange={() => toggleRole(r.id)} />
                  <div>
                    <span className="text-sm font-medium">{r.name}</span>
                    {r.description ? (
                      <p className="text-xs text-muted-foreground">{r.description}</p>
                    ) : null}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
