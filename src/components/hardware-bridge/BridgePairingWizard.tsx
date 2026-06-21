import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePrinterSettingsOutlets } from "@/hooks/usePrinterSettingsOutlets";
import { isHardwareBridgeDeviceOnline } from "@/domain/hardwareBridgeStatus";
import { useHardwareBridgeStore } from "@/stores/hardwareBridgeStore";
import { useOutletStore } from "@/stores/outletStore";
import { toast } from "sonner";

function formatPairingCode(code: string): string {
  const digits = code.replace(/\D+/g, "");
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

function isRecentlyPaired(metadata: Record<string, unknown> | null | undefined): boolean {
  const pairedAt = metadata?.provisioning && typeof metadata.provisioning === "object"
    ? (metadata.provisioning as Record<string, unknown>).pairedAt
    : null;
  if (typeof pairedAt !== "string" || !pairedAt.trim()) return false;
  const epoch = new Date(pairedAt).getTime();
  if (Number.isNaN(epoch)) return false;
  return Date.now() - epoch < 15 * 60_000;
}

export function BridgePairingWizard() {
  const { t } = useTranslation("common");
  const outlets = usePrinterSettingsOutlets();
  const devices = useHardwareBridgeStore((s) => s.devices);
  const pairingCode = useHardwareBridgeStore((s) => s.pairingCode);
  const pairingExpiresAt = useHardwareBridgeStore((s) => s.pairingExpiresAt);
  const pairingPending = useHardwareBridgeStore((s) => s.pairingPending);
  const pairingOutletId = useHardwareBridgeStore((s) => s.pairingOutletId);
  const initPairing = useHardwareBridgeStore((s) => s.initPairing);
  const revokeDevice = useHardwareBridgeStore((s) => s.revokeDevice);
  const clearPairing = useHardwareBridgeStore((s) => s.clearPairing);
  const fetchSnapshot = useHardwareBridgeStore((s) => s.fetchSnapshot);
  const startMonitoring = useHardwareBridgeStore((s) => s.startMonitoring);
  const stopMonitoring = useHardwareBridgeStore((s) => s.stopMonitoring);
  const bridgeError = useHardwareBridgeStore((s) => s.error);

  const [outletId, setOutletId] = useState<number>(outlets[0]?.id ?? 0);
  const [displayLabel, setDisplayLabel] = useState("");
  const [now, setNow] = useState(Date.now());
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (outlets[0]?.id && !outletId) {
      setOutletId(outlets[0].id);
    }
  }, [outlets, outletId]);

  useEffect(() => {
    if (!outletId || outletId < 1) return;
    void fetchSnapshot(outletId, "background");
  }, [outletId, fetchSnapshot]);

  useEffect(() => {
    if (!pairingPending || !pairingOutletId) return;
    void startMonitoring(pairingOutletId, 3000);
    return () => {
      stopMonitoring();
    };
  }, [pairingPending, pairingOutletId, startMonitoring, stopMonitoring]);

  useEffect(() => {
    if (!pairingPending) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pairingPending]);

  const outletDevices = useMemo(
    () => devices.filter((device) => device.outletId === (pairingOutletId ?? outletId)),
    [devices, outletId, pairingOutletId],
  );

  const activeDevice = outletDevices.find((device) => {
    if (device.revokedAt) return false;
    return isHardwareBridgeDeviceOnline(device.lastSeenAt) || isRecentlyPaired(device.metadata);
  });
  const expiresMs = pairingExpiresAt ? new Date(pairingExpiresAt).getTime() - now : 0;
  const codeExpired = pairingExpiresAt ? expiresMs <= 0 : false;

  useEffect(() => {
    if (!activeDevice) return;
    const targetOutletId = pairingOutletId ?? outletId;
    if (targetOutletId > 0 && useOutletStore.getState().activeOutletId !== targetOutletId) {
      useOutletStore.getState().setActiveOutletContext(targetOutletId);
    }
  }, [activeDevice, outletId, pairingOutletId]);

  useEffect(() => {
    if (!pairingPending || !pairingOutletId) return;
    if (activeDevice) {
      useOutletStore.getState().setActiveOutletContext(pairingOutletId);
      clearPairing();
      void fetchSnapshot(pairingOutletId, "background");
      toast.success(t("settings.bridgePairing.connected"));
    }
  }, [activeDevice, pairingPending, pairingOutletId, clearPairing, fetchSnapshot, t]);

  const handleGenerate = async () => {
    if (!outletId || outletId < 1) {
      toast.error(t("settings.bridgePairing.noOutlet"));
      return;
    }
    setIsGenerating(true);
    try {
      await initPairing(outletId, displayLabel.trim() || undefined);
    } catch {
      toast.error(t("settings.bridgePairing.initFailed"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    if (!pairingCode) return;
    const digits = pairingCode.replace(/\D+/g, "");
    try {
      await navigator.clipboard.writeText(digits);
      toast.success(t("settings.bridgePairing.codeCopied"));
    } catch {
      toast.error(t("settings.bridgePairing.copyFailed"));
    }
  };

  const handleRevoke = async (deviceId: number) => {
    if (!confirm(t("settings.bridgePairing.revokeConfirm"))) return;
    try {
      await revokeDevice(deviceId);
      toast.success(t("settings.bridgePairing.revoked"));
      if (outletId > 0) {
        await fetchSnapshot(outletId, "background");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.deleteFailed"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.bridgePairing.title")}</CardTitle>
        <CardDescription>{t("settings.bridgePairing.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("settings.bridgePairing.selectOutlet")}</Label>
            <Select value={outletId > 0 ? String(outletId) : ""} onValueChange={(v) => setOutletId(Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder={t("settings.printers.selectOutlet")} />
              </SelectTrigger>
              <SelectContent>
                {outlets.map((outlet) => (
                  <SelectItem key={outlet.id} value={String(outlet.id)}>
                    {outlet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("settings.bridgePairing.displayLabel")}</Label>
            <Input
              value={displayLabel}
              onChange={(e) => setDisplayLabel(e.target.value)}
              placeholder={t("settings.bridgePairing.displayLabelPlaceholder")}
            />
          </div>
        </div>

        {activeDevice ? (
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{activeDevice.displayLabel || t("settings.bridgePairing.connected")}</p>
                <p className="text-sm text-muted-foreground">
                  {outlets.find((o) => o.id === (pairingOutletId ?? outletId))?.name}
                </p>
                {!isHardwareBridgeDeviceOnline(activeDevice.lastSeenAt) && isRecentlyPaired(activeDevice.metadata) ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("settings.bridgePairing.pairedWaitingBridge")}
                  </p>
                ) : null}
              </div>
              <Badge variant={isHardwareBridgeDeviceOnline(activeDevice.lastSeenAt) ? "default" : "outline"}>
                {isHardwareBridgeDeviceOnline(activeDevice.lastSeenAt)
                  ? t("settings.bridgePairing.online")
                  : t("settings.bridgePairing.offline")}
              </Badge>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void handleRevoke(activeDevice.id)}>
              {t("settings.bridgePairing.revoke")}
            </Button>
          </div>
        ) : pairingCode && pairingPending ? (
          <div className="rounded-lg border p-4 space-y-3 text-center">
            <p className="text-sm text-muted-foreground">{t("settings.bridgePairing.codeTitle")}</p>
            <button
              type="button"
              onClick={() => void handleCopyCode()}
              title={t("settings.bridgePairing.clickToCopy")}
              className="mx-auto block rounded-md px-3 py-1 text-4xl font-bold tracking-widest transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {formatPairingCode(pairingCode)}
            </button>
            <p className="text-xs text-muted-foreground">{t("settings.bridgePairing.clickToCopy")}</p>
            <p className="text-xs text-muted-foreground">
              {codeExpired
                ? t("settings.bridgePairing.expired")
                : `${Math.max(0, Math.floor(expiresMs / 1000))}s`}
            </p>
            <p className="text-sm text-muted-foreground">{t("settings.bridgePairing.codeHint")}</p>
            <p className="text-sm">{t("settings.bridgePairing.waiting")}</p>
            {bridgeError ? <p className="text-sm text-destructive">{bridgeError}</p> : null}
            {codeExpired ? (
              <Button type="button" disabled={isGenerating} onClick={() => void handleGenerate()}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("settings.bridgePairing.generating")}
                  </>
                ) : (
                  t("settings.bridgePairing.generateCode")
                )}
              </Button>
            ) : null}
          </div>
        ) : (
          <Button type="button" disabled={isGenerating} onClick={() => void handleGenerate()}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("settings.bridgePairing.generating")}
              </>
            ) : (
              t("settings.bridgePairing.generateCode")
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
