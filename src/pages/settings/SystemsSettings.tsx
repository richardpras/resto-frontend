import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("common");
  const system = useSettingsStore((s) => s.system);
  const updateSystem = useSettingsStore((s) => s.updateSystem);
  const { user, autoLock, idleMinutes, setAutoLock, setIdleMinutes, lock } = useAuthStore();
  const pinLock = user?.pinSet === true;

  const persistSystem = async (next: typeof system, message: string) => {
    if (!getApiAccessToken()) {
      toast.success(message);
      return;
    }
    try {
      await patchSystemSettings(next);
      toast.success(message);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("settings.system.saveFailed"));
      await useSettingsStore.getState().ensureSectionsLoaded(["system"], { force: true, staleMs: 0 }).catch(() => {});
    }
  };

  const Row = ({ k, labelKey, descKey }: { k: keyof typeof system; labelKey: string; descKey: string }) => {
    const label = t(labelKey);
    return (
      <div className="flex items-center justify-between py-3 border-b last:border-0">
        <div className="space-y-1">
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground">{t(descKey)}</p>
        </div>
        <Switch
          checked={system[k]}
          onCheckedChange={(v) => {
            const next = { ...system, [k]: v };
            updateSystem({ [k]: v } as never);
            void persistSystem(
              next,
              v ? t("settings.system.toggleEnabled", { label }) : t("settings.system.toggleDisabled", { label }),
            );
          }}
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.system.preferencesTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Row k="enableSplitBill" labelKey="settings.system.splitBill" descKey="settings.system.splitBillDesc" />
          <Row k="enableMultiPayment" labelKey="settings.system.multiPayment" descKey="settings.system.multiPaymentDesc" />
          <Row
            k="confirmBeforePayment"
            labelKey="settings.system.confirmBeforePayment"
            descKey="settings.system.confirmBeforePaymentDesc"
          />
          <Row k="enableQROrdering" labelKey="settings.system.qrOrdering" descKey="settings.system.qrOrderingDesc" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.system.qrOrderingTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Row k="enableCallCashier" labelKey="settings.system.callCashier" descKey="settings.system.callCashierDesc" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.system.inventoryTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm font-medium">{t("settings.system.stockMode")}</Label>
            <p className="text-xs text-muted-foreground">{t("settings.system.stockModeDesc")}</p>
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
              void persistSystem(next, t("settings.system.stockModeSet", { mode }));
            }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="strict" id="stock-mode-strict" />
              <Label htmlFor="stock-mode-strict" className="font-normal">
                {t("settings.system.stockStrict")}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="warning" id="stock-mode-warning" />
              <Label htmlFor="stock-mode-warning" className="font-normal">
                {t("settings.system.stockWarning")}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="deferred" id="stock-mode-deferred" />
              <Label htmlFor="stock-mode-deferred" className="font-normal">
                {t("settings.system.stockDeferred")}
              </Label>
            </div>
          </RadioGroup>
          <Row
            k="allowNegativeStock"
            labelKey="settings.system.allowNegativeStock"
            descKey="settings.system.allowNegativeStockDesc"
          />
        </CardContent>
      </Card>

      <SoundAlertSettings />

      <CustomerAppUrlSettings />

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.system.autoLockTitle")}</CardTitle>
        </CardHeader>
        <CardContent className={`space-y-4 ${!pinLock ? "opacity-60" : ""}`}>
          {!pinLock ? (
            <p className="text-xs text-muted-foreground rounded-lg border border-border bg-muted/40 p-3">
              {t("settings.system.pinWarning")}
            </p>
          ) : null}
          <div className="flex items-center justify-between py-3 border-b">
            <div className="space-y-1">
              <Label className="text-sm font-medium">{t("settings.system.enableAutoLock")}</Label>
              <p className="text-xs text-muted-foreground">{t("settings.system.enableAutoLockDesc")}</p>
            </div>
            <Switch
              checked={pinLock && autoLock}
              disabled={!pinLock}
              onCheckedChange={(v) => {
                setAutoLock(v);
                toast.success(t("settings.system.autoLock", { state: v ? t("common.on") : t("common.off") }));
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium">{t("settings.system.idleTimeout")}</Label>
              <p className="text-xs text-muted-foreground">{t("settings.system.idleTimeoutDesc")}</p>
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
              {t("settings.system.lockNow")}
            </button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
