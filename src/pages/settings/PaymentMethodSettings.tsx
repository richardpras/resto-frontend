import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useSettingsStore, PaymentMethod, newId, removePaymentCascade } from "@/stores/settingsStore";
import { toast } from "sonner";
import { ApiHttpError, getApiAccessToken } from "@/lib/api-integration/client";
import { patchPaymentMethod, postPaymentMethod } from "@/lib/api-integration/settingsDomainEndpoints";

const empty: PaymentMethod = { id: "", name: "", type: "cash", status: "active" };

export default function PaymentMethodSettings() {
  const paymentMethods = useSettingsStore((s) => s.paymentMethods);
  const upsertPayment = useSettingsStore((s) => s.upsertPayment);
  const ensureSectionsLoaded = useSettingsStore((s) => s.ensureSectionsLoaded);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PaymentMethod>(empty);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) return toast.error("Method name required");
    const wasInList = useSettingsStore.getState().paymentMethods.some((x) => x.id === form.id);
    setSaving(true);
    try {
      if (!getApiAccessToken()) {
        upsertPayment(form);
        toast.success("Payment method saved locally");
        setOpen(false);
        return;
      }
      const saved = wasInList ? await patchPaymentMethod(form.id, form) : await postPaymentMethod(form);
      upsertPayment(saved);
      await ensureSectionsLoaded(["paymentMethods"], { force: true, staleMs: 0 });
      toast.success("Payment method saved");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Payment Methods</h2>
          <Button onClick={() => { setForm({ ...empty, id: newId() }); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Method</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Integration</TableHead>
              <TableHead>Fee</TableHead><TableHead>Status</TableHead><TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentMethods.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{p.type}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{p.integration || "-"}</TableCell>
                <TableCell>{p.fee ? `${p.fee}%` : "-"}</TableCell>
                <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setForm(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (!confirm("Delete?")) return;
                        void (async () => {
                          try {
                            await removePaymentCascade(p.id);
                            if (getApiAccessToken()) await ensureSectionsLoaded(["paymentMethods"], { force: true, staleMs: 0 });
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
            <DialogHeader><DialogTitle>Payment Method</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v: "cash" | "digital") => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="digital">Digital</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Integration (optional)</Label><Input placeholder="Midtrans, Xendit..." value={form.integration || ""} onChange={(e) => setForm({ ...form, integration: e.target.value })} /></div>
              <div className="space-y-2"><Label>Fee % (optional)</Label><Input type="number" step="0.1" value={form.fee ?? ""} onChange={(e) => setForm({ ...form, fee: e.target.value ? +e.target.value : undefined })} /></div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: "active" | "inactive") => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
