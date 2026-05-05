import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Printer as PrinterIcon } from "lucide-react";
import { useSettingsStore, Printer, newId, removePrinterCascade } from "@/stores/settingsStore";
import { toast } from "sonner";
import { ApiHttpError, getApiAccessToken } from "@/lib/api-integration/client";
import { patchPrinter, postPrinter } from "@/lib/api-integration/settingsDomainEndpoints";

const empty: Printer = { id: "", name: "", printerType: "kitchen", connection: "lan", ip: "", outletId: "" };

export default function PrinterSettings() {
  const printers = useSettingsStore((s) => s.printers);
  const outlets = useSettingsStore((s) => s.outlets);
  const upsertPrinter = useSettingsStore((s) => s.upsertPrinter);
  const refreshFromApi = useSettingsStore((s) => s.refreshFromApi);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Printer>(empty);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) return toast.error("Printer name required");
    if (!form.outletId) return toast.error("Select outlet");
    if (form.connection === "lan" && !form.ip?.trim()) return toast.error("IP address required for LAN");
    const wasInList = useSettingsStore.getState().printers.some((p) => p.id === form.id);
    setSaving(true);
    try {
      if (!getApiAccessToken()) {
        upsertPrinter(form);
        toast.success("Printer saved locally");
        setOpen(false);
        return;
      }
      const payload: Printer = {
        ...form,
        ip: form.connection === "lan" ? form.ip : undefined,
        bluetoothDevice: form.connection === "bluetooth" ? form.bluetoothDevice : undefined,
      };
      const saved = wasInList ? await patchPrinter(form.id, payload) : await postPrinter(payload);
      upsertPrinter(saved);
      await refreshFromApi();
      toast.success("Printer saved");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const test = () => toast.success("Test print sent (simulated)");

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Printer Setup</h2>
          <Button onClick={() => { setForm({ ...empty, id: newId(), outletId: outlets[0]?.id || "" }); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Printer</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Connection</TableHead>
              <TableHead>Address</TableHead><TableHead>Outlet</TableHead><TableHead className="w-32"></TableHead>
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
                <Select value={form.outletId} onValueChange={(v) => setForm({ ...form, outletId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select outlet" /></SelectTrigger>
                  <SelectContent>
                    {outlets.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.printerType === "kitchen" && (
                <div className="space-y-2">
                  <Label>Assigned Categories (comma-separated)</Label>
                  <Input placeholder="Main Course, Drinks" value={form.assignedCategories?.join(", ") || ""} onChange={(e) => setForm({ ...form, assignedCategories: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="button" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
