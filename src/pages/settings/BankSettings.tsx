import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { useSettingsStore, BankAccount, newId } from "@/stores/settingsStore";
import { toast } from "sonner";

const empty: BankAccount = { id: "", bankName: "", accountName: "", accountNumber: "", isDefault: false };

export default function BankSettings() {
  const { banks, upsertBank, deleteBank, setDefaultBank } = useSettingsStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BankAccount>(empty);

  const save = () => {
    if (!form.bankName.trim() || !form.accountNumber.trim()) return toast.error("Bank name & account number required");
    upsertBank(form);
    if (form.isDefault) setDefaultBank(form.id);
    setOpen(false);
    toast.success("Bank account saved");
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Bank & Finance</h2>
          <Button onClick={() => { setForm({ ...empty, id: newId() }); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Account</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bank</TableHead><TableHead>Account Name</TableHead><TableHead>Account Number</TableHead>
              <TableHead>Default</TableHead><TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banks.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.bankName}</TableCell>
                <TableCell>{b.accountName}</TableCell>
                <TableCell className="font-mono text-sm">{b.accountNumber}</TableCell>
                <TableCell>{b.isDefault && <Badge><Star className="h-3 w-3 mr-1" />Default</Badge>}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {!b.isDefault && <Button size="sm" variant="ghost" onClick={() => setDefaultBank(b.id)}>Set Default</Button>}
                    <Button size="icon" variant="ghost" onClick={() => { setForm(b); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete?")) deleteBank(b.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Bank Account</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2"><Label>Bank Name</Label><Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Account Name</Label><Input value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Account Number</Label><Input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm pt-1">
                <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
                Set as default account
              </label>
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
