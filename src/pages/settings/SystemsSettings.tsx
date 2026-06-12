import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { StockEnforcementMode } from "@/domain/settingsDomainTypes";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { ApiHttpError, getApiAccessToken } from "@/lib/api-integration/client";
import { patchSystemSettings } from "@/lib/api-integration/settingsDomainEndpoints";
import { SoundAlertSettings } from "@/components/sound/SoundAlertSettings";
import CustomerAppUrlSettings from "./CustomerAppUrlSettings";

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
      await useSettingsStore.getState().ensureSectionsLoaded(["system"], { force: true, staleMs: 0 }).catch(() => {});
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
          <CardTitle>QR Ordering</CardTitle>
        </CardHeader>
        <CardContent>
          <Row
            k="enableCallCashier"
            label="Enable Call Cashier button"
            desc="Show the Call Cashier action on the customer QR order status page while awaiting confirmation."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory / POS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Stock Enforcement Mode</Label>
            <p className="text-xs text-muted-foreground">
              Deferred mode allows sales to continue even when inventory records are incomplete. Inventory
              consumption is processed during shift close or inventory posting.
            </p>
          </div>
          <RadioGroup
            value={system.stockEnforcementMode ?? (system.enforceStockOnSale ? "strict" : "deferred")}
            onValueChange={(value) => {
              const mode = value as StockEnforcementMode;
              const next = {
                ...system,
                stockEnforcementMode: mode,
                enforceStockOnSale: mode === "strict",
              };
              updateSystem(next);
              void persistSystem(next, `Stock enforcement mode set to ${mode}`);
            }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="strict" id="stock-mode-strict" />
              <Label htmlFor="stock-mode-strict" className="font-normal">
                Strict — block checkout when stock is insufficient
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="warning" id="stock-mode-warning" />
              <Label htmlFor="stock-mode-warning" className="font-normal">
                Warning — complete sale and record inventory incidents
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="deferred" id="stock-mode-deferred" />
              <Label htmlFor="stock-mode-deferred" className="font-normal">
                Deferred (recommended) — consume inventory on shift close / posting
              </Label>
            </div>
          </RadioGroup>
          <Row
            k="allowNegativeStock"
            label="Allow negative stock"
            desc="When enabled, inventory ledger may go below zero during consumption posting so kitchen operations can continue."
          />
        </CardContent>
      </Card>

      <SoundAlertSettings />

      <CustomerAppUrlSettings />

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
