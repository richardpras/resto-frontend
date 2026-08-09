import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Bluetooth, Check, Loader2, Printer, PrinterX } from "lucide-react";
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
  getBluetoothAutoCut,
  saveBluetoothAutoCut,
} from "@/mobile/print/bluetoothPrinterConfig";
import { resetNativePrintPortCache } from "@/mobile/print/resolvePrintPort";
import { notifyPrinterConfigChanged } from "@/mobile/print/printerConfigEvents";
import type { EscPosDocument } from "@/mobile/print/escposBuilder";
import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  outletId: number | null;
  /**
   * `banner` — compact strip (legacy).
   * `panel` — settings card section.
   * `compact` — icon-only trigger.
   * `header` — app header icon beside connectivity.
   */
  variant?: "banner" | "panel" | "compact" | "header";
  /** @deprecated Prefer `variant="compact"`. */
  compact?: boolean;
};

export function BluetoothPrinterSetup({ outletId, variant, compact = false }: Props) {
  const resolvedVariant = variant ?? (compact ? "compact" : "banner");
  const { t } = useTranslation("ops");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sunmiDevice, setSunmiDevice] = useState<boolean | null>(null);
  const [savedAddress, setSavedAddress] = useState<string | null>(null);
  const [devices, setDevices] = useState<Array<{ name: string; address: string }>>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [autoCut, setAutoCut] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  // Show on Android once we know it is not a Sunmi built-in printer.
  // Keep visible while the Sunmi probe is still pending (`null`) so the header icon appears quickly.
  const showControl =
    isNativeAndroid() && sunmiDevice !== true && outletId !== null && outletId > 0;

  const refreshState = useCallback(async () => {
    if (!outletId || outletId < 1) return;
    const sunmi = await isSunmiPrinterAvailable();
    setSunmiDevice(sunmi);
    if (sunmi) return;
    const [address, cut] = await Promise.all([
      getSavedBluetoothAddress(outletId),
      getBluetoothAutoCut(outletId),
    ]);
    setSavedAddress(address);
    setSelectedAddress(address);
    setAutoCut(cut);
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

  const handleDialogOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      void loadDevices();
    }
  };

  const handleSave = async () => {
    if (!outletId || !selectedAddress) return;
    await saveBluetoothAddress(outletId, selectedAddress);
    await saveBluetoothAutoCut(outletId, autoCut);
    getBluetoothPrintAdapter().setOutletId(outletId);
    getBluetoothPrintAdapter().resetAvailability();
    resetNativePrintPortCache();
    notifyPrinterConfigChanged();
    setSavedAddress(selectedAddress);
    setOpen(false);
  };

  const handleTestPrint = async () => {
    if (!outletId || !selectedAddress) return;
    setTesting(true);
    setError(null);
    try {
      await saveBluetoothAddress(outletId, selectedAddress);
      await saveBluetoothAutoCut(outletId, autoCut);
      const adapter = getBluetoothPrintAdapter();
      adapter.setOutletId(outletId);
      adapter.resetAvailability();
      resetNativePrintPortCache();
      notifyPrinterConfigChanged();
      setSavedAddress(selectedAddress);

      const doc: EscPosDocument = {
        lines: [
          { text: "RestoHub BT Test", align: "center", bold: true },
          { text: selectedAddress, align: "center" },
          { text: new Date().toLocaleString(), align: "center" },
          { text: "OK jika baris ini tercetak", align: "center" },
        ],
        cut: autoCut,
      };
      const result = await adapter.printDocument(doc);
      if (!result.ok) {
        setError(result.error || t("mobile.bluetoothTestFailed"));
        toast.error(result.error || t("mobile.bluetoothTestFailed"));
        return;
      }
      toast.success(t("mobile.bluetoothTestOk"));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("mobile.bluetoothTestFailed");
      setError(message);
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  if (!showControl) return null;

  return (
    <>
      {resolvedVariant === "header" || resolvedVariant === "compact" ? (
        <button
          type="button"
          onClick={openDialog}
          className={
            resolvedVariant === "header"
              ? `p-2 rounded-lg hover:bg-muted transition-colors ${
                  savedAddress ? "text-success" : "text-muted-foreground"
                }`
              : `inline-flex h-7 w-7 items-center justify-center rounded-lg border shrink-0 ${
                  savedAddress
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-border bg-muted/40 text-muted-foreground"
                }`
          }
          aria-label={savedAddress ? t("mobile.bluetoothChange") : t("mobile.bluetoothSetup")}
          title={savedAddress ? t("mobile.bluetoothReady", { address: savedAddress }) : t("mobile.bluetoothSetupRequired")}
        >
          {savedAddress ? (
            <Printer className={resolvedVariant === "header" ? "h-4 w-4" : "h-3.5 w-3.5"} />
          ) : (
            <PrinterX className={resolvedVariant === "header" ? "h-4 w-4" : "h-3.5 w-3.5"} />
          )}
        </button>
      ) : resolvedVariant === "panel" ? (
        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-md border border-blue-500/30 bg-blue-500/10 p-2 text-blue-700 dark:text-blue-300">
              <Bluetooth className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                {t("mobile.bluetoothSetupTitle")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {savedAddress
                  ? t("mobile.bluetoothReady", { address: savedAddress })
                  : t("mobile.bluetoothSetupRequired")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("mobile.bluetoothSetupBody")}
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={openDialog}>
              {savedAddress ? t("mobile.bluetoothChange") : t("mobile.bluetoothSetup")}
            </Button>
          </div>
        </div>
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

      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
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

          <label className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 cursor-pointer">
            <Checkbox
              checked={autoCut}
              onCheckedChange={(checked) => setAutoCut(checked === true)}
              className="mt-0.5"
            />
            <span className="space-y-0.5">
              <span className="block text-sm font-medium text-foreground">{t("mobile.bluetoothAutoCut")}</span>
              <span className="block text-xs text-muted-foreground">{t("mobile.bluetoothAutoCutHint")}</span>
            </span>
          </label>

          <DialogFooter className="gap-2 flex-col sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => void loadDevices()} disabled={loading || testing}>
              {t("mobile.bluetoothRefresh")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleTestPrint()}
              disabled={!selectedAddress || loading || testing}
            >
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              {t("mobile.bluetoothTestPrint")}
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={!selectedAddress || loading || testing}>
              {t("mobile.bluetoothSave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
