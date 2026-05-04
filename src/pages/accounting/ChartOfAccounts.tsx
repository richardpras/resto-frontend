import { useState } from "react";
import { useAccountingStore, Account, AccountType, AccountSubtype } from "@/stores/accountingStore";
import {
  createAccount as createAccountApi,
  updateAccount as updateAccountApi,
  deleteAccount as deleteAccountApi,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TYPES: { value: AccountType; label: string }[] = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "revenue", label: "Revenue" },
  { value: "expense", label: "Expense" },
];

const SUBTYPES: { value: AccountSubtype; label: string; type: AccountType }[] = [
  { value: "current_asset", label: "Current Asset", type: "asset" },
  { value: "fixed_asset", label: "Fixed Asset", type: "asset" },
  { value: "short_term_liability", label: "Short-term Liability", type: "liability" },
  { value: "long_term_liability", label: "Long-term Liability", type: "liability" },
  { value: "equity", label: "Equity", type: "equity" },
  { value: "revenue", label: "Revenue", type: "revenue" },
  { value: "cogs", label: "Cost of Goods Sold", type: "expense" },
  { value: "expense", label: "Operating Expense", type: "expense" },
];

const typeColor: Record<AccountType, string> = {
  asset: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  liability: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  equity: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  revenue: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  expense: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

export default function ChartOfAccounts() {
  const { accounts, refreshFromApi } = useAccountingStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const blank: Omit<Account, "id"> = {
    code: "", name: "", type: "asset", subtype: "current_asset", parentId: undefined, description: "", active: true,
  };
  const [form, setForm] = useState<Omit<Account, "id">>(blank);

  const openNew = () => { setEditing(null); setForm(blank); setOpen(true); };
  const openEdit = (a: Account) => {
    setEditing(a);
    setForm({ code: a.code, name: a.name, type: a.type, subtype: a.subtype, parentId: a.parentId, description: a.description, active: a.active });
    setOpen(true);
  };
  const save = async () => {
    if (!form.code || !form.name) {
      toast.error("Code and name are required");
      return;
    }
    try {
      if (editing) {
        await updateAccountApi(editing.id, {
          code: form.code,
          name: form.name,
          type: form.type,
          subtype: form.subtype,
          parentId: form.parentId ?? null,
          description: form.description || undefined,
          active: form.active,
        });
        toast.success("Account updated");
      } else {
        await createAccountApi({
          code: form.code,
          name: form.name,
          type: form.type,
          subtype: form.subtype,
          parentId: form.parentId ?? null,
          description: form.description || undefined,
          active: form.active,
        });
        toast.success("Account created");
      }
      await refreshFromApi();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    }
  };

  const filtered = accounts
    .filter((a) => filterType === "all" || a.type === filterType)
    .sort((a, b) => a.code.localeCompare(b.code));

  const subtypeOptions = SUBTYPES.filter((s) => s.type === form.type);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Type</Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Account</Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Subtype</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono">{a.code}</TableCell>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell><Badge className={typeColor[a.type]} variant="secondary">{a.type}</Badge></TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {SUBTYPES.find((s) => s.value === a.subtype)?.label}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {accounts.find((p) => p.id === a.parentId)?.name || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={a.active ? "default" : "secondary"}>{a.active ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      void (async () => {
                        try {
                          await deleteAccountApi(a.id);
                          await refreshFromApi();
                          toast.success("Deleted");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Delete failed");
                        }
                      })();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Account" : "New Account"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="1100" />
              </div>
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Cash" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v: AccountType) => {
                    const sub = SUBTYPES.find((s) => s.type === v)!.value;
                    setForm({ ...form, type: v, subtype: sub });
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subtype</Label>
                <Select value={form.subtype} onValueChange={(v: AccountSubtype) => setForm({ ...form, subtype: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{subtypeOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Parent Account (optional)</Label>
              <Select value={form.parentId || "none"} onValueChange={(v) => setForm({ ...form, parentId: v === "none" ? undefined : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {accounts.filter((a) => a.type === form.type && a.id !== editing?.id).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => void save()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
