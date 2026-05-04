import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useSettingsStore, Tax, newId } from "@/stores/settingsStore";
import { toast } from "sonner";

const empty: Tax = { id: "", name: "", type: "percentage", value: 0, applyDineIn: true, applyTakeaway: true, inclusive: false, status: "active" };

export default function TaxSettings() {
  const { taxes, upsertTax, deleteTax } = useSettingsStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Tax>(empty);

  const save = () => {
    if (!form.name.trim()) return toast.error("Tax name required");
    if (form.value < 0) return toast.error("Value must be ≥ 0");
    upsertTax(form);
    setOpen(false);
    toast.success("Tax saved");
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Tax Configuration</h2>
          <Button onClick={() => { setForm({ ...empty, id: newId() }); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Tax</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Value</TableHead>
              <TableHead>Apply To</TableHead><TableHead>Mode</TableHead><TableHead>Status</TableHead><TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {taxes.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="capitalize">{t.type}</TableCell>
                <TableCell>{t.type === "percentage" ? `${t.value}%` : t.value}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {[t.applyDineIn && "Dine-in", t.applyTakeaway && "Takeaway"].filter(Boolean).join(", ")}
                </TableCell>
                <TableCell>{t.inclusive ? "Inclusive" : "Exclusive"}</TableCell>
                <TableCell><Badge variant={t.status === "active" ? "default" : "secondary"}>{t.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setForm(t); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete tax?")) deleteTax(t.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Tax</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v: "percentage" | "fixed") => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Value</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: +e.target.value })} /></div>
              </div>
              <div className="space-y-2">
                <Label>Apply To</Label>
                <div className="flex gap-4 pt-1">
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.applyDineIn} onCheckedChange={(v) => setForm({ ...form, applyDineIn: !!v })} />Dine-in</label>
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.applyTakeaway} onCheckedChange={(v) => setForm({ ...form, applyTakeaway: !!v })} />Takeaway</label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Calculation Mode</Label>
                <Select value={form.inclusive ? "inclusive" : "exclusive"} onValueChange={(v) => setForm({ ...form, inclusive: v === "inclusive" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exclusive">Exclusive (added to price)</SelectItem>
                    <SelectItem value="inclusive">Inclusive (already in price)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
