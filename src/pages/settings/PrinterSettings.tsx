import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Printer as PrinterIcon, Wifi, Bluetooth, RefreshCw } from "lucide-react";
import { useSettingsStore, Printer, newId, removePrinterCascade } from "@/stores/settingsStore";
import { toast } from "sonner";
import { ApiHttpError, getApiAccessToken } from "@/lib/api-integration/client";
import { usePrinterManagementStore } from "@/stores/printerManagementStore";
import { useReceiptDocumentStore } from "@/stores/receiptDocumentStore";
import { ReceiptPreviewModal } from "@/components/receipts/ReceiptPreviewModal";
import { useHardwareBridgeStore } from "@/stores/hardwareBridgeStore";
import { ShadcnTableSkeletonBody } from "@/components/skeletons/table/ShadcnTableSkeletonBody";
import { SkeletonBusyRegion } from "@/components/skeletons/SkeletonBusyRegion";
import { PrinterQueuePanelSkeleton } from "@/components/skeletons/list/PrinterQueuePanelSkeleton";
import { BridgeDeviceListSkeleton } from "@/components/skeletons/list/BridgeDeviceListSkeleton";
import { useAuthStore } from "@/stores/authStore";
import { getUserCapabilities } from "@/domain/accessControl";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { buildPrinterPayload, normalizePrinterForForm } from "@/domain/printerFormUtils";
import { BridgePairingWizard } from "@/components/hardware-bridge/BridgePairingWizard";
import { usePrinterSettingsOutlets } from "@/hooks/usePrinterSettingsOutlets";

const empty: Printer = {
  id: "",
  name: "",
  printerType: "kitchen",
  connection: "lan",
  thermalPaperWidth: "58mm",
  ip: "",
  port: 9100,
  outletId: 0,
};

function formatPaperWidth(printer: Printer): string {
  return printer.thermalPaperWidth === "80mm" ? "80mm" : "58mm";
}

function formatPrinterAddress(printer: Printer): string {
  if (printer.connection === "lan") {
    const host = printer.ip?.trim();
    if (!host) return "-";
    return printer.port && printer.port !== 9100 ? `${host}:${printer.port}` : host;
  }
  if (printer.connection === "usb") return printer.devicePath || printer.bluetoothDevice || "-";
  if (printer.connection === "bluetooth") {
    return [printer.bluetoothAddress, printer.devicePath || printer.bluetoothDevice].filter(Boolean).join(" / ") || "-";
  }
  if (printer.connection === "shared") {
    return [printer.sharePath || printer.bluetoothDevice, printer.sharePrinterName || printer.ip].filter(Boolean).join(" → ") || "-";
  }
  return "-";
}

const TENANT_ID = Number(import.meta.env.VITE_API_TENANT_ID ?? 1) || 1;

export default function PrinterSettings() {
  const { t } = useTranslation("common");
  const authUser = useAuthStore((s) => s.user);
  const capabilities = getUserCapabilities(authUser);
  const printers = useSettingsStore((s) => s.printers);
  const outlets = usePrinterSettingsOutlets();
  const upsertPrinter = useSettingsStore((s) => s.upsertPrinter);
  const queueByPrinter = usePrinterManagementStore((s) => s.queueByPrinter);
  const fetchQueueStatus = usePrinterManagementStore((s) => s.fetchQueueStatus);
  const saveProfile = usePrinterManagementStore((s) => s.saveProfile);
  const sendTestPrint = usePrinterManagementStore((s) => s.sendTestPrint);
  const testingPrinterId = usePrinterManagementStore((s) => s.testingPrinterId);
  const retryFailedJob = usePrinterManagementStore((s) => s.retryFailedJob);
  const isSavingProfile = usePrinterManagementStore((s) => s.isSavingProfile);
  const isLoadingQueue = usePrinterManagementStore((s) => s.isLoadingQueue);
  const historyRows = useReceiptDocumentStore((s) => s.historyRows);
  const historyOutletId = useReceiptDocumentStore((s) => s.historyOutletId);
  const isLoadingReceiptHistory = useReceiptDocumentStore((s) => s.isLoadingHistory);
  const receiptHistoryError = useReceiptDocumentStore((s) => s.error);
  const setHistoryOutletId = useReceiptDocumentStore((s) => s.setHistoryOutletId);
  const loadReceiptHistory = useReceiptDocumentStore((s) => s.loadHistory);
  const openReceiptPreview = useReceiptDocumentStore((s) => s.openPreview);
  const bridgeStatus = useHardwareBridgeStore((s) => s.bridgeStatus);
  const heartbeatState = useHardwareBridgeStore((s) => s.heartbeatState);
  const reconnectState = useHardwareBridgeStore((s) => s.reconnectState);
  const bridgeDevices = useHardwareBridgeStore((s) => s.devices);
  const bridgeInitialLoading = useHardwareBridgeStore((s) => s.initialLoading);
  const bridgeBackgroundRefreshing = useHardwareBridgeStore((s) => s.backgroundRefreshing);
  const bridgeError = useHardwareBridgeStore((s) => s.error);
  const bridgeRealtimeState = useHardwareBridgeStore((s) => s.realtimeState);
  const bridgeTransport = useHardwareBridgeStore((s) => s.realtimeTransport);
  const bridgeRuntimeState = useHardwareBridgeStore((s) => s.runtimeState);
  const bridgeRuntimeCapabilities = useHardwareBridgeStore((s) => s.runtimeCapabilities);
  const bridgeSpoolHealth = useHardwareBridgeStore((s) => s.spoolHealth);
  const bridgeExecutionLifecycle = useHardwareBridgeStore((s) => s.executionLifecycle);
  const bridgeProvisioning = useHardwareBridgeStore((s) => s.provisioning);
  const bridgeWatchdog = useHardwareBridgeStore((s) => s.watchdog);
  const bridgeRuntime = useHardwareBridgeStore((s) => s.runtime);
  const startBridgeMonitoring = useHardwareBridgeStore((s) => s.startMonitoring);
  const stopBridgeMonitoring = useHardwareBridgeStore((s) => s.stopMonitoring);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Printer>(empty);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);

  useEffect(() => {
    if (!capabilities.printerAdmin) return;
    void fetchQueueStatus();
  }, [fetchQueueStatus, capabilities.printerAdmin]);

  useEffect(() => {
    const first = outlets[0]?.id;
    if (first && !historyOutletId) {
      setHistoryOutletId(first);
    }
  }, [outlets, historyOutletId, setHistoryOutletId]);

  useEffect(() => {
    if (!capabilities.hardwareBridge || !diagnosticsOpen) return;
    const resolvedOutletId =
      historyOutletId && historyOutletId > 0 ? historyOutletId : outlets[0]?.id;
    if (!resolvedOutletId || resolvedOutletId < 1) return;
    void startBridgeMonitoring(resolvedOutletId, 5000, { diagnostics: true });
    return () => {
      stopBridgeMonitoring();
    };
  }, [
    diagnosticsOpen,
    historyOutletId,
    outlets[0]?.id,
    startBridgeMonitoring,
    stopBridgeMonitoring,
    capabilities.hardwareBridge,
  ]);

  const save = async () => {
    if (!form.name.trim()) return toast.error(t("settings.printers.nameRequired"));
    if (!form.outletId || form.outletId < 1) return toast.error(t("settings.printers.outletRequired"));
    if (form.connection === "lan" && !form.ip?.trim()) return toast.error(t("settings.printers.ipRequired"));
    if (form.connection === "usb" && !form.devicePath?.trim()) return toast.error(t("settings.printers.devicePath"));
    if (form.connection === "bluetooth" && !form.bluetoothAddress?.trim() && !form.devicePath?.trim()) {
      return toast.error(t("settings.printers.bluetoothAddress"));
    }
    if (form.connection === "shared" && (!form.sharePath?.trim() || !form.sharePrinterName?.trim())) {
      return toast.error(t("settings.printers.sharePath"));
    }
    try {
      await saveProfile(buildPrinterPayload(form));
      toast.success(t("settings.printers.saved"));
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("common.saveFailed"));
    }
  };

  const test = async (printer: Printer) => {
    try {
      await sendTestPrint(printer.id);
      toast.success(t("settings.printers.testSent"));
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("settings.printers.testFailed"));
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        {capabilities.hardwareBridge ? (
          <>
            <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              {t("settings.bridgeSetup.restartBanner")}
            </p>
            <BridgePairingWizard />
          </>
        ) : null}
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">{t("settings.printers.title")}</h2>
          <Button
            type="button"
            onClick={() => {
              setForm({ ...empty, id: newId(), outletId: outlets[0]?.id ?? 0 });
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("settings.printers.add")}
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Connection</TableHead>
              <TableHead>{t("settings.printers.paperWidth")}</TableHead>
              <TableHead>Address</TableHead><TableHead>Outlet</TableHead><TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {printers.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium flex items-center gap-2"><PrinterIcon className="h-4 w-4 text-muted-foreground" />{p.name}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{p.printerType}</Badge></TableCell>
                <TableCell className="capitalize">{p.connection}</TableCell>
                <TableCell><Badge variant="secondary">{formatPaperWidth(p)}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{formatPrinterAddress(p)}</TableCell>
                <TableCell>{outlets.find((o) => o.id === p.outletId)?.name || "-"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={testingPrinterId === p.id}
                      onClick={() => void test(p)}
                    >
                      {testingPrinterId === p.id ? t("settings.printers.testing") : "Test"}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setForm(normalizePrinterForForm(p)); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (!confirm(t("settings.printers.deleteConfirm"))) return;
                        void (async () => {
                          try {
                            await removePrinterCascade(p.id);
                          } catch (e) {
                            toast.error(e instanceof ApiHttpError ? e.message : t("common.deleteFailed"));
                          }
                        })();
                      }}
                    ><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Collapsible open={diagnosticsOpen} onOpenChange={setDiagnosticsOpen} className="border-t pt-4">
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" className="px-0 font-medium">
              {t("settings.printers.advancedDiagnostics")}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
        <div className="space-y-3 border-t pt-4">
          <h3 className="font-medium">Receipt render history (Phase 14)</h3>
          <p className="text-xs text-muted-foreground">
            Server-rendered thermal snapshots and invoice metadata. Printing stays on the backend queue — this panel is preview and reprint orchestration only.
          </p>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="space-y-2">
              <Label>Outlet</Label>
              <Select
                value={historyOutletId && historyOutletId > 0 ? String(historyOutletId) : ""}
                onValueChange={(v) => setHistoryOutletId(Number(v))}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select outlet" />
                </SelectTrigger>
                <SelectContent>
                  {outlets.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={!historyOutletId || historyOutletId < 1 || isLoadingReceiptHistory}
              onClick={() => {
                if (historyOutletId && historyOutletId > 0) void loadReceiptHistory(historyOutletId);
              }}
            >
              {isLoadingReceiptHistory ? "Loading…" : "Load history"}
            </Button>
          </div>
          {receiptHistoryError ? <p className="text-sm text-destructive">{receiptHistoryError}</p> : null}
          {isLoadingReceiptHistory ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Id</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <ShadcnTableSkeletonBody columns={6} rows={6} />
            </Table>
          ) : historyRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rows loaded. Choose an outlet and load history.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Id</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.id}</TableCell>
                    <TableCell className="text-xs">{row.kind}</TableCell>
                    <TableCell className="text-xs">
                      {row.sourceType}/{row.sourceId}
                    </TableCell>
                    <TableCell className="text-xs">{row.invoiceNumber ?? "—"}</TableCell>
                    <TableCell className="text-xs space-x-1">
                      {row.deferredReplayPending ? <Badge variant="destructive">Deferred</Badge> : null}
                      {row.pdfAvailable ? <Badge variant="outline">PDF</Badge> : null}
                      <Badge variant="outline">R{row.reprintCount}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button type="button" size="sm" variant="outline" onClick={() => void openReceiptPreview(row.id)}>
                        Preview
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="font-medium">Hardware Bridge Foundation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              Bridge status: <Badge variant={bridgeStatus === "online" ? "default" : "outline"}>{bridgeStatus}</Badge>
            </div>
            <div>
              Heartbeat:{" "}
              <Badge variant={heartbeatState === "healthy" ? "default" : "outline"}>{heartbeatState}</Badge>
            </div>
            <div>
              Reconnect:{" "}
              <Badge variant={reconnectState === "stable" ? "outline" : "secondary"}>{reconnectState}</Badge>
            </div>
            <div>
              Transport:{" "}
              <Badge variant="outline">
                {bridgeTransport} / {bridgeRealtimeState}
              </Badge>
            </div>
            <div>
              Runtime state:{" "}
              <Badge variant={bridgeRuntimeState === "degraded" || bridgeRuntimeState === "stale" ? "destructive" : "outline"}>
                {bridgeRuntimeState}
              </Badge>
            </div>
            <div>
              Spool depth: <Badge variant="outline">{bridgeSpoolHealth.queueDepth}</Badge>
            </div>
            <div>
              Dead-letter: <Badge variant="outline">{bridgeSpoolHealth.deadLetterCount}</Badge>
            </div>
            <div>
              Ack latency: <Badge variant="outline">{bridgeSpoolHealth.avgAckLatencyMs}ms</Badge>
            </div>
            <div>
              Retry count: <Badge variant="outline">{bridgeSpoolHealth.retryCount}</Badge>
            </div>
            <div>
              Executing: <Badge variant="outline">{bridgeExecutionLifecycle.executing}</Badge>
            </div>
            <div>
              Retry pending: <Badge variant="outline">{bridgeExecutionLifecycle.retryPending}</Badge>
            </div>
            <div>
              Acked: <Badge variant="outline">{bridgeExecutionLifecycle.acknowledged}</Badge>
            </div>
            <div className="md:col-span-2">
              Capabilities:{" "}
              <Badge variant="outline">
                {bridgeRuntimeCapabilities.capabilities.length > 0
                  ? bridgeRuntimeCapabilities.capabilities.join(", ")
                  : "none"}
              </Badge>
            </div>
            <div className="md:col-span-2">
              Transports: <Badge variant="outline">{bridgeRuntimeCapabilities.transports.join(", ") || "polling"}</Badge>
              {" "}
              <Badge variant="outline">spool {bridgeRuntimeCapabilities.spoolSupported ? "enabled" : "disabled"}</Badge>
            </div>
            <div>
              Provisioning: <Badge variant="outline">{bridgeProvisioning.status}</Badge>
            </div>
            <div>
              Pair identity:{" "}
              <Badge variant="outline">
                {bridgeProvisioning.pairedOutletIdentity ?? "n/a"} / {bridgeProvisioning.pairedDeviceIdentity ?? "n/a"}
              </Badge>
            </div>
            <div>
              Runtime version: <Badge variant="outline">{bridgeRuntime.version}</Badge>
            </div>
            <div>
              Token health: <Badge variant="outline">{bridgeProvisioning.tokenHealth}</Badge>
            </div>
            <div>
              Watchdog: <Badge variant={bridgeWatchdog.state === "degraded" ? "destructive" : "outline"}>{bridgeWatchdog.state}</Badge>
            </div>
            <div>
              Restarts/crashes: <Badge variant="outline">{bridgeWatchdog.restartCount}/{bridgeWatchdog.crashCount}</Badge>
            </div>
            <div>
              Update availability:{" "}
              <Badge variant={bridgeRuntime.updateAvailable ? "secondary" : "outline"}>
                {bridgeRuntime.updateAvailable ? bridgeRuntime.updateTargetVersion ?? "available" : "none"}
              </Badge>
            </div>
            <div>
              Deployment: <Badge variant="outline">{bridgeRuntime.deploymentMode} ({bridgeRuntime.serviceMode})</Badge>
            </div>
          </div>
          {bridgeRuntimeState === "reconnecting" ? (
            <p className="text-xs text-muted-foreground">Realtime reconnect in progress; polling fallback is still active.</p>
          ) : null}
          {bridgeRuntimeState === "stale" || bridgeRuntimeState === "degraded" ? (
            <p className="text-xs text-destructive">Bridge runtime is {bridgeRuntimeState}; queue monitoring may be delayed.</p>
          ) : null}
          {bridgeError ? <p className="text-sm text-destructive">{bridgeError}</p> : null}
          {bridgeBackgroundRefreshing ? (
            <p className="text-xs text-muted-foreground">Refreshing hardware bridge devices...</p>
          ) : null}
          <SkeletonBusyRegion busy={bridgeInitialLoading} label="Loading hardware bridge devices">
            {bridgeInitialLoading ? (
              <BridgeDeviceListSkeleton />
            ) : bridgeDevices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hardware bridge devices connected for the selected outlet.</p>
            ) : (
              <div className="space-y-2">
              {bridgeDevices.map((device) => (
                <div key={device.id} className="border rounded-lg p-3 space-y-1">
                  {(() => {
                    const hints = Array.isArray(device.metadata?.transportHints)
                      ? device.metadata.transportHints.map((item) => String(item).toLowerCase())
                      : [];
                    const hasLanHint = hints.some((hint) => hint.includes("lan") || hint.includes("ethernet"));
                    const hasBluetoothHint = hints.some((hint) => hint.includes("bluetooth"));
                    return (
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{device.displayLabel || device.deviceKey}</p>
                    <Badge variant="outline">{device.status}</Badge>
                    {device.connectionHint === "lan" || hasLanHint ? (
                      <Badge variant="outline" className="gap-1">
                        <Wifi className="h-3 w-3" />
                        LAN
                      </Badge>
                    ) : null}
                    {device.connectionHint === "bluetooth" || hasBluetoothHint ? (
                      <Badge variant="outline" className="gap-1">
                        <Bluetooth className="h-3 w-3" />
                        Bluetooth
                      </Badge>
                    ) : null}
                  </div>
                    );
                  })()}
                  <p className="text-xs text-muted-foreground">
                    Last heartbeat: {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : "never"} •
                    reconnects {device.reconnectCount}
                  </p>
                  {device.disabledAt ? (
                    <p className="text-xs text-destructive">Disabled at {new Date(device.disabledAt).toLocaleString()}</p>
                  ) : null}
                  {device.revokedAt ? (
                    <p className="text-xs text-destructive">Revoked at {new Date(device.revokedAt).toLocaleString()}</p>
                  ) : null}
                </div>
              ))}
            </div>
            )}
          </SkeletonBusyRegion>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium">Queue Status</h3>
          <SkeletonBusyRegion busy={isLoadingQueue} label="Loading printer queues">
            {isLoadingQueue ? (
              <PrinterQueuePanelSkeleton panels={3} />
            ) : queueByPrinter.length === 0 ? (
              <p className="text-sm text-muted-foreground">No queue data available.</p>
            ) : (
              <div className="space-y-2">
              {queueByPrinter.map((queue) => (
                <div key={queue.printerId} className="border rounded-lg p-3 space-y-2">
                  <p className="font-medium">{queue.printerName}</p>
                  <p className="text-xs text-muted-foreground">
                    Pending: {queue.pending} • Failed: {queue.failed} • Printing: {queue.printing}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    bridge-compatible queue fallback active
                  </p>
                  {queue.jobs
                    .filter((job) => job.status === "failed")
                    .map((job) => (
                      <div key={job.id} className="flex items-center justify-between text-sm bg-muted/50 rounded px-2 py-1">
                        <span>{job.route} • attempts {job.attempts}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void retryFailedJob(queue.printerId, job.id)}
                        >
                          Retry
                        </Button>
                      </div>
                    ))}
                </div>
              ))}
            </div>
            )}
          </SkeletonBusyRegion>
        </div>
          </CollapsibleContent>
        </Collapsible>

        <ReceiptPreviewModal />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("settings.printers.dialogTitle")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2"><Label>{t("common.name")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("common.type")}</Label>
                  <Select value={form.printerType} onValueChange={(v: Printer["printerType"]) => setForm({ ...form, printerType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kitchen">{t("settings.printers.kitchen")}</SelectItem>
                      <SelectItem value="bar">{t("settings.printers.bar")}</SelectItem>
                      <SelectItem value="dessert">{t("settings.printers.dessert")}</SelectItem>
                      <SelectItem value="cashier">{t("settings.printers.cashier")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("settings.printers.connection")}</Label>
                  <Select
                    value={form.connection}
                    onValueChange={(v: Printer["connection"]) => setForm({ ...form, connection: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lan">{t("settings.printers.lan")}</SelectItem>
                      <SelectItem value="usb">{t("settings.printers.usb")}</SelectItem>
                      <SelectItem value="bluetooth">{t("settings.printers.bluetooth")}</SelectItem>
                      <SelectItem value="shared">{t("settings.printers.shared")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("settings.printers.paperWidth")}</Label>
                <Select
                  value={form.thermalPaperWidth ?? "58mm"}
                  onValueChange={(v: NonNullable<Printer["thermalPaperWidth"]>) =>
                    setForm({ ...form, thermalPaperWidth: v })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58mm">{t("settings.printers.paperWidth58")}</SelectItem>
                    <SelectItem value="80mm">{t("settings.printers.paperWidth80")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.connection === "lan" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t("settings.printers.ipAddress")}</Label>
                    <Input placeholder="192.168.1.50" value={form.ip || ""} onChange={(e) => setForm({ ...form, ip: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.printers.port")}</Label>
                    <Input
                      type="number"
                      placeholder="9100"
                      value={form.port ?? 9100}
                      onChange={(e) => setForm({ ...form, port: Number(e.target.value) || 9100 })}
                    />
                  </div>
                </div>
              ) : null}
              {form.connection === "usb" ? (
                <div className="space-y-2">
                  <Label>{t("settings.printers.devicePath")}</Label>
                  <Input
                    placeholder="/dev/usb/lp0 or COM5"
                    value={form.devicePath || ""}
                    onChange={(e) => setForm({ ...form, devicePath: e.target.value })}
                  />
                </div>
              ) : null}
              {form.connection === "bluetooth" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t("settings.printers.bluetoothAddress")}</Label>
                    <Input
                      placeholder="AA:BB:CC:DD:EE:FF"
                      value={form.bluetoothAddress || ""}
                      onChange={(e) => setForm({ ...form, bluetoothAddress: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.printers.devicePath")}</Label>
                    <Input
                      placeholder="RFCOMM device path"
                      value={form.devicePath || ""}
                      onChange={(e) => setForm({ ...form, devicePath: e.target.value })}
                    />
                  </div>
                </div>
              ) : null}
              {form.connection === "shared" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t("settings.printers.sharePath")}</Label>
                    <Input
                      placeholder="\\\\server\\share"
                      value={form.sharePath || ""}
                      onChange={(e) => setForm({ ...form, sharePath: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.printers.sharePrinterName")}</Label>
                    <Input
                      placeholder="EPSON TM-T82"
                      value={form.sharePrinterName || ""}
                      onChange={(e) => setForm({ ...form, sharePrinterName: e.target.value })}
                    />
                  </div>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>{t("settings.printers.outlet")}</Label>
                <Select
                  value={form.outletId > 0 ? String(form.outletId) : ""}
                  onValueChange={(v) => setForm({ ...form, outletId: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("settings.printers.selectOutlet")} />
                  </SelectTrigger>
                  <SelectContent>
                    {outlets.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSavingProfile}>{t("common.cancel")}</Button>
              <Button type="button" onClick={() => void save()} disabled={isSavingProfile}>{isSavingProfile ? t("common.saving") : t("common.saveShort")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
