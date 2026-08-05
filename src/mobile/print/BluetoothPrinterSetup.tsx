import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bluetooth, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isNativeAndroid, isSunmiPrinterAvailable } from "@/mobile/platform";
import {
  ensureBluetoothPermissions,
  getBluetoothPrintAdapter,
  listPairedBluetoothPrinters,
} from "@/mobile/print/BluetoothPrintAdapter";
import {
  getSavedBluetoothAddress,
  saveBluetoothAddress,
} from "@/mobile/print/bluetoothPrinterConfig";
import { resetNativePrintPortCache } from "@/mobile/print/resolvePrintPort";

type Props = {
  outletId: number | null;
  /** Icon-only trigger for short/landscape viewports — hides the full banner. */
  compact?: boolean;
};

export function BluetoothPrinterSetup({ outletId, compact = false }: Props) {
  const { t } = useTranslation("ops");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sunmiDevice, setSunmiDevice] = useState<boolean | null>(null);
  const [savedAddress, setSavedAddress] = useState<string | null>(null);
  const [devices, setDevices] = useState<Array<{ name: string; address: string }>>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showBanner = isNativeAndroid() && sunmiDevice === false && outletId !== null && outletId > 0;

  const refreshState = useCallback(async () => {
    if (!outletId || outletId < 1) return;
    const sunmi = await isSunmiPrinterAvailable();
    setSunmiDevice(sunmi);
    if (sunmi) return;
    const address = await getSavedBluetoothAddress(outletId);
    setSavedAddress(address);
    setSelectedAddress(address);
  }, [outletId]);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  const loadDevices = useCallback(async () => {
    if (!outletId || outletId < 1) return;
    setLoading(true);
    setError(null);
    try {
      const granted = await ensureBluetoothPermissions();
      if (!granted) {
        setError(t("mobile.bluetoothPermissionDenied"));
        setDevices([]);
        return;
      }
      const paired = await listPairedBluetoothPrinters();
      setDevices(paired);
      if (paired.length === 0) {
        setError(t("mobile.bluetoothNoPaired"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("mobile.bluetoothLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [outletId, t]);

  const openDialog = () => {
    setOpen(true);
    void loadDevices();
  };

  const handleSave = async () => {
    if (!outletId || !selectedAddress) return;
    await saveBluetoothAddress(outletId, selectedAddress);
    getBluetoothPrintAdapter().setOutletId(outletId);
    getBluetoothPrintAdapter().resetAvailability();
    resetNativePrintPortCache();
    setSavedAddress(selectedAddress);
    setOpen(false);
  };

  if (!showBanner) return null;

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={openDialog}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 shrink-0"
          aria-label={savedAddress ? t("mobile.bluetoothChange") : t("mobile.bluetoothSetup")}
          title={savedAddress ? t("mobile.bluetoothReady", { address: savedAddress }) : t("mobile.bluetoothSetupRequired")}
        >
          <Bluetooth className="h-3.5 w-3.5" />
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-border/60 bg-blue-500/5 text-xs">
          <Bluetooth className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-foreground/80">
            {savedAddress
              ? t("mobile.bluetoothReady", { address: savedAddress })
              : t("mobile.bluetoothSetupRequired")}
          </span>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs ml-auto" onClick={openDialog}>
            {savedAddress ? t("mobile.bluetoothChange") : t("mobile.bluetoothSetup")}
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("mobile.bluetoothSetupTitle")}</DialogTitle>
            <DialogDescription>{t("mobile.bluetoothSetupBody")}</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("mobile.bluetoothLoading")}
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {devices.map((device) => {
                const active = selectedAddress === device.address;
                return (
                  <button
                    key={device.address}
                    type="button"
                    onClick={() => setSelectedAddress(device.address)}
                    className={`w-full flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                      active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <span>
                      <span className="font-medium block">{device.name}</span>
                      <span className="text-xs text-muted-foreground">{device.address}</span>
                    </span>
                    {active ? <Check className="h-4 w-4 text-primary shrink-0" /> : null}
                  </button>
                );
              })}
            </div>
          )}

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => void loadDevices()} disabled={loading}>
              {t("mobile.bluetoothRefresh")}
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={!selectedAddress || loading}>
              {t("mobile.bluetoothSave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
