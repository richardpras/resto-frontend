import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { dialogScroll, dialogSize } from "@/lib/ui/dialogSizes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  adminClearUserScreenPin,
  adminSetUserScreenPin,
  createUser,
  updateUser,
  assignUserRoles,
  type UserApiRow,
  type RoleApiRow,
} from "@/lib/api-integration/userManagementEndpoints";
import { ApiHttpError } from "@/lib/api-integration/client";
import { canAssignUserRoles, canUpdateUsers } from "@/domain/permissionGates";
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
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();
  const authUser = useAuthStore((s) => s.user);
  const canEditProfile = canUpdateUsers(authUser);
  const canAssign = canAssignUserRoles(authUser);
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
      toast.error(t("usersManagement.form.pinDigitsError"));
      return { valid: false };
    }
    if (a !== b) {
      toast.error(t("usersManagement.form.pinMismatch"));
      return { valid: false };
    }
    return { valid: true, pin: a };
  };

  const resolveEditPinAction = (): { action: PinEditAction; pin?: string; ok: boolean } => {
    if (!editing) return { action: "none", ok: true };
    if (!useScreenPin) {
      return { action: editing.pinSet ? "clear" : "none", ok: true };
    }
    const parsed = parsePinPair();
    if (!parsed.valid) return { action: "none", ok: false };
    if (parsed.pin !== undefined) return { action: "set", pin: parsed.pin, ok: true };
    if (editing.pinSet) return { action: "keep", ok: true };
    toast.error(t("usersManagement.form.pinRequiredWhenEnabled"));
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
      toast.success(t("usersManagement.form.userCreated"));
      await maybeRefreshSession(row.id);
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      toast.error(e instanceof ApiHttpError ? e.message : t("usersManagement.form.createFailed"));
    },
  });

  const updateMu = useMutation({
    mutationFn: async (pinPart: { action: PinEditAction; pin?: string }) => {
      if (!editing) return null;

      if (canEditProfile) {
        const profilePayload: { name: string; email: string; password?: string } = {
          name: name.trim(),
          email: email.trim(),
        };
        const nextPassword = password.trim();
        if (nextPassword !== "") {
          profilePayload.password = nextPassword;
        }
        await updateUser(editing.id, profilePayload);
      }

      if (canAssign) {
        await assignUserRoles(editing.id, selectedRoleIds);
        if (pinPart.action === "clear") {
          await adminClearUserScreenPin(editing.id);
        } else if (pinPart.action === "set" && pinPart.pin !== undefined) {
          await adminSetUserScreenPin(editing.id, pinPart.pin);
        }
      }

      return editing.id;
    },
    onSuccess: async (uid) => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("usersManagement.form.userUpdated"));
      if (uid !== null) await maybeRefreshSession(uid);
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      toast.error(e instanceof ApiHttpError ? e.message : t("usersManagement.form.updateFailed"));
    },
  });

  const submit = () => {
    if (!name.trim() || !email.trim()) {
      toast.error(t("usersManagement.form.nameEmailRequired"));
      return;
    }
    if (!editing && !password.trim()) {
      toast.error(t("usersManagement.form.passwordRequired"));
      return;
    }
    if (!editing && password.trim().length < 6) {
      toast.error(t("usersManagement.form.passwordMinLength"));
      return;
    }
    if (editing && password.trim() !== "" && password.trim().length < 6) {
      toast.error(t("usersManagement.form.passwordMinLength"));
      return;
    }
    if (canAssign && selectedRoleIds.length === 0) {
      toast.error(t("usersManagement.form.roleRequired"));
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
        toast.error(t("usersManagement.form.pinRequiredWhenEnabled"));
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
  const profileReadOnly = Boolean(editing) && !canEditProfile;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${dialogSize.xl} ${dialogScroll}`}>
        <DialogHeader>
          <DialogTitle>
            {editing ? t("usersManagement.form.editTitle") : t("usersManagement.form.addTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("usersManagement.users.columns.name")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("usersManagement.form.namePlaceholder")}
                disabled={profileReadOnly || pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("usersManagement.users.columns.email")}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("usersManagement.form.emailPlaceholder")}
                disabled={profileReadOnly || pending}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>
                {editing ? t("usersManagement.form.newPasswordOptional") : t("usersManagement.form.password")}
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={editing ? t("usersManagement.form.passwordLeaveBlank") : t("usersManagement.form.password")}
                disabled={profileReadOnly || pending}
              />
              {editing ? (
                <p className="text-xs text-muted-foreground">{t("usersManagement.form.passwordEditHint")}</p>
              ) : null}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              {t("usersManagement.form.screenPinSection")}
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
                disabled={!canAssign || pending}
              />
              <div className="space-y-0.5">
                <span className="text-sm font-medium">{t("usersManagement.form.useScreenPin")}</span>
                <p className="text-xs text-muted-foreground">{t("usersManagement.form.useScreenPinHint")}</p>
              </div>
            </label>
            {useScreenPin ? (
              <>
                <p className="text-xs text-muted-foreground mt-3 mb-2">
                  {editing
                    ? editing.pinSet
                      ? t("usersManagement.form.pinEditKeepHint")
                      : t("usersManagement.form.pinEditNewHint")
                    : t("usersManagement.form.pinCreateHint")}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t("usersManagement.form.pin")}</Label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={screenPin}
                      onChange={(e) => setScreenPin(sanitizePinInput(e.target.value))}
                      placeholder="····"
                      className="tracking-widest"
                      autoComplete="new-password"
                      disabled={!canAssign || pending}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("usersManagement.form.confirmPin")}</Label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={screenPinConfirm}
                      onChange={(e) => setScreenPinConfirm(sanitizePinInput(e.target.value))}
                      placeholder="····"
                      className="tracking-widest"
                      autoComplete="new-password"
                      disabled={!canAssign || pending}
                    />
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {canAssign ? (
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                {t("usersManagement.users.columns.roles")}
              </h3>
              <div className="rounded-lg border divide-y max-h-[240px] overflow-y-auto">
                {roles.map((r) => (
                  <label key={r.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent">
                    <Checkbox
                      checked={selectedRoleIds.includes(r.id)}
                      onCheckedChange={() => toggleRole(r.id)}
                      disabled={pending}
                    />
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
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {t("usersManagement.roles.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={pending}>
            {pending ? t("usersManagement.roles.saving") : t("usersManagement.roles.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
