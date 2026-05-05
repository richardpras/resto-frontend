import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { useSettingsStore, BankAccount, newId, removeBankCascade } from "@/stores/settingsStore";
import { toast } from "sonner";
import { ApiHttpError, getApiAccessToken } from "@/lib/api-integration/client";
import { patchBankAccount, postBankAccount } from "@/lib/api-integration/settingsDomainEndpoints";

const empty: BankAccount = { id: "", bankName: "", accountName: "", accountNumber: "", isDefault: false };

async function syncAllBanksToApi(): Promise<void> {
  const { banks } = useSettingsStore.getState();
  await Promise.all(banks.map((b) => patchBankAccount(b.id, b)));
}

export default function BankSettings() {
  const banks = useSettingsStore((s) => s.banks);
  const upsertBank = useSettingsStore((s) => s.upsertBank);
  const setDefaultBank = useSettingsStore((s) => s.setDefaultBank);
  const refreshFromApi = useSettingsStore((s) => s.refreshFromApi);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BankAccount>(empty);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.bankName.trim() || !form.accountNumber.trim()) return toast.error("Bank name & account number required");
    const wasInList = useSettingsStore.getState().banks.some((b) => b.id === form.id);
    upsertBank(form);
    if (form.isDefault) setDefaultBank(form.id);

    setSaving(true);
    try {
      if (!getApiAccessToken()) {
        toast.success("Bank account saved locally");
        setOpen(false);
        return;
      }
      if (!wasInList) await postBankAccount(form);
      else {
        const latest = useSettingsStore.getState().banks.find((b) => b.id === form.id)!;
        await patchBankAccount(form.id, latest);
      }
      if (form.isDefault) await syncAllBanksToApi();
      await refreshFromApi();
      toast.success("Bank account saved");
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
          <h2 className="font-semibold">Bank & Finance</h2>
          <Button type="button" onClick={() => { setForm({ ...empty, id: newId() }); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Account</Button>
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
                    {!b.isDefault && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          void (async () => {
                            setDefaultBank(b.id);
                            if (!getApiAccessToken()) return;
                            try {
                              await syncAllBanksToApi();
                              await refreshFromApi();
                            } catch (e) {
                              toast.error(e instanceof ApiHttpError ? e.message : "Update failed");
                            }
                          })();
                        }}
                      >Set Default</Button>
                    )}
                    <Button type="button" size="icon" variant="ghost" onClick={() => { setForm(b); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (!confirm("Delete?")) return;
                        void (async () => {
                          try {
                            await removeBankCascade(b.id);
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="button" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
