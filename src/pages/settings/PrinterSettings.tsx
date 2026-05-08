import { useEffect, useState } from "react";
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

const empty: Printer = { id: "", name: "", printerType: "kitchen", connection: "lan", ip: "", outletId: 0 };

export default function PrinterSettings() {
  const printers = useSettingsStore((s) => s.printers);
  const outlets = useSettingsStore((s) => s.outlets);
  const upsertPrinter = useSettingsStore((s) => s.upsertPrinter);
  const refreshFromApi = useSettingsStore((s) => s.refreshFromApi);
  const queueByPrinter = usePrinterManagementStore((s) => s.queueByPrinter);
  const fetchQueueStatus = usePrinterManagementStore((s) => s.fetchQueueStatus);
  const saveProfile = usePrinterManagementStore((s) => s.saveProfile);
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
  const bridgeIsLoading = useHardwareBridgeStore((s) => s.isLoading);
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

  useEffect(() => {
    void fetchQueueStatus();
  }, [fetchQueueStatus]);

  useEffect(() => {
    const first = outlets[0]?.id;
    if (first && !historyOutletId) {
      setHistoryOutletId(first);
    }
  }, [outlets, historyOutletId, setHistoryOutletId]);

  useEffect(() => {
    const outletId = historyOutletId && historyOutletId > 0 ? historyOutletId : outlets[0]?.id;
    if (!outletId || outletId < 1) return;
    void startBridgeMonitoring(outletId, 5000);
    return () => {
      stopBridgeMonitoring();
    };
  }, [historyOutletId, outlets, startBridgeMonitoring, stopBridgeMonitoring]);

  const save = async () => {
    if (!form.name.trim()) return toast.error("Printer name required");
    if (!form.outletId || form.outletId < 1) return toast.error("Select outlet");
    if (form.connection === "lan" && !form.ip?.trim()) return toast.error("IP address required for LAN");
    try {
      const payload = {
        ...form,
        ip: form.connection === "lan" ? form.ip : undefined,
        bluetoothDevice: form.connection === "bluetooth" ? form.bluetoothDevice : undefined,
        routeRules: form.assignedCategories ?? [],
      };
      await saveProfile(payload);
      await refreshFromApi();
      toast.success("Printer saved");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Save failed");
    }
  };

  const test = () => toast.success("Test print sent (simulated)");

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Printer Setup</h2>
          <Button
            type="button"
            onClick={() => {
              setForm({ ...empty, id: newId(), outletId: outlets[0]?.id ?? 0 });
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Printer
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Connection</TableHead>
              <TableHead>Address</TableHead><TableHead>Outlet</TableHead><TableHead>Routes</TableHead><TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {printers.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium flex items-center gap-2"><PrinterIcon className="h-4 w-4 text-muted-foreground" />{p.name}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{p.printerType}</Badge></TableCell>
                <TableCell className="capitalize">{p.connection}</TableCell>
                <TableCell className="text-muted-foreground">{p.ip || p.bluetoothDevice || "-"}</TableCell>
                <TableCell>{outlets.find((o) => o.id === p.outletId)?.name || "-"}</TableCell>
                <TableCell className="text-muted-foreground">{p.assignedCategories?.join(", ") || "-"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={test}>Test</Button>
                    <Button size="icon" variant="ghost" onClick={() => { setForm(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (!confirm("Delete printer?")) return;
                        void (async () => {
                          try {
                            await removePrinterCascade(p.id);
                            if (getApiAccessToken()) await refreshFromApi();
                          } catch (e) {
                            toast.error(e instanceof ApiHttpError ? e.message : "Delete failed");
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
          {historyRows.length === 0 && !isLoadingReceiptHistory ? (
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
          {bridgeIsLoading ? (
            <p className="text-sm text-muted-foreground">Loading hardware bridge devices…</p>
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
        </div>

        <div className="space-y-3">
          <h3 className="font-medium">Queue Status</h3>
          {isLoadingQueue ? (
            <p className="text-sm text-muted-foreground">Loading printer queues…</p>
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
        </div>

        <ReceiptPreviewModal />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Printer</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.printerType} onValueChange={(v: "kitchen" | "cashier") => setForm({ ...form, printerType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kitchen">Kitchen</SelectItem>
                      <SelectItem value="cashier">Cashier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Connection</Label>
                  <Select value={form.connection} onValueChange={(v: "lan" | "bluetooth") => setForm({ ...form, connection: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lan">LAN / IP</SelectItem>
                      <SelectItem value="bluetooth">Bluetooth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.connection === "lan" ? (
                <div className="space-y-2"><Label>IP Address</Label><Input placeholder="192.168.1.50" value={form.ip || ""} onChange={(e) => setForm({ ...form, ip: e.target.value })} /></div>
              ) : (
                <div className="space-y-2"><Label>Bluetooth Device</Label><Input placeholder="POS-58" value={form.bluetoothDevice || ""} onChange={(e) => setForm({ ...form, bluetoothDevice: e.target.value })} /></div>
              )}
              <div className="space-y-2">
                <Label>Outlet</Label>
                <Select
                  value={form.outletId > 0 ? String(form.outletId) : ""}
                  onValueChange={(v) => setForm({ ...form, outletId: Number(v) })}
                >
                  <SelectTrigger>
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
              {form.printerType === "kitchen" && (
                <div className="space-y-2">
                  <Label>Route Assignment (comma-separated)</Label>
                  <Input placeholder="Main Course, Drinks" value={form.assignedCategories?.join(", ") || ""} onChange={(e) => setForm({ ...form, assignedCategories: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSavingProfile}>Cancel</Button>
              <Button type="button" onClick={() => void save()} disabled={isSavingProfile}>{isSavingProfile ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
