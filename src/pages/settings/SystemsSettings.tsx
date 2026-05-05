import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { ApiHttpError, getApiAccessToken } from "@/lib/api-integration/client";
import { patchSystemSettings } from "@/lib/api-integration/settingsDomainEndpoints";

export default function SystemSettings() {
  const system = useSettingsStore((s) => s.system);
  const updateSystem = useSettingsStore((s) => s.updateSystem);
  const { user, autoLock, idleMinutes, setAutoLock, setIdleMinutes, lock } = useAuthStore();
  const pinLock = user?.pinSet === true;

  const persistSystem = async (next: typeof system, label: string) => {
    if (!getApiAccessToken()) {
      toast.success(`${label}`);
      return;
    }
    try {
      await patchSystemSettings(next);
      toast.success(`${label}`);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Could not save system settings");
      await useSettingsStore.getState().refreshFromApi().catch(() => {});
    }
  };

  const Row = ({ k, label, desc }: { k: keyof typeof system; label: string; desc: string }) => (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="space-y-1">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch
        checked={system[k]}
        onCheckedChange={(v) => {
          const next = { ...system, [k]: v };
          updateSystem({ [k]: v } as never);
          void persistSystem(next, `${label} ${v ? "enabled" : "disabled"}`);
        }}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>System Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <Row
            k="enableSplitBill"
            label="Split Bill"
            desc="Allow splitting a single order across multiple payments."
          />
          <Row
            k="enableMultiPayment"
            label="Multi Payment"
            desc="Combine multiple payment methods on a single order."
          />
          <Row
            k="confirmBeforePayment"
            label="Order Confirmation Before Payment"
            desc="Require staff confirmation before opening payment screen."
          />
          <Row k="enableQROrdering" label="QR Ordering" desc="Allow customers to scan and order from their device." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>POS Auto-Lock</CardTitle>
        </CardHeader>
        <CardContent className={`space-y-4 ${!pinLock ? "opacity-60" : ""}`}>
          {!pinLock ? (
            <p className="text-xs text-muted-foreground rounded-lg border border-border bg-muted/40 p-3">
              Kunci layar tidak aktif untuk akun tanpa PIN (kunci otomatis dan manual dinonaktifkan). Atur PIN untuk user ini
              di Users &amp; Roles, lalu login ulang atau refresh sesi.
            </p>
          ) : null}
          <div className="flex items-center justify-between py-3 border-b">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Enable auto-lock</Label>
              <p className="text-xs text-muted-foreground">Automatically lock the screen after idle. Unlock with PIN.</p>
            </div>
            <Switch
              checked={pinLock && autoLock}
              disabled={!pinLock}
              onCheckedChange={(v) => {
                setAutoLock(v);
                toast.success(`Auto-lock ${v ? "on" : "off"}`);
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Idle timeout (minutes)</Label>
              <p className="text-xs text-muted-foreground">How long without activity before locking.</p>
            </div>
            <Input
              type="number"
              min={1}
              max={60}
              value={idleMinutes}
              onChange={(e) => setIdleMinutes(Number(e.target.value) || 1)}
              className="w-24 rounded-xl"
              disabled={!pinLock || !autoLock}
            />
          </div>
          {pinLock ? (
            <button type="button" onClick={() => lock()} className="text-xs text-primary hover:underline">
              Lock screen now →
            </button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
