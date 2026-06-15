import { useState } from "react";
import { useAccountingStore, Account, AccountType, AccountSubtype } from "@/stores/accountingStore";
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
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";

const ACCOUNT_TYPES: AccountType[] = ["asset", "liability", "equity", "revenue", "expense"];

const ACCOUNT_SUBTYPES: { value: AccountSubtype; type: AccountType }[] = [
  { value: "current_asset", type: "asset" },
  { value: "fixed_asset", type: "asset" },
  { value: "short_term_liability", type: "liability" },
  { value: "long_term_liability", type: "liability" },
  { value: "equity", type: "equity" },
  { value: "revenue", type: "revenue" },
  { value: "cogs", type: "expense" },
  { value: "expense", type: "expense" },
];

const typeColor: Record<AccountType, string> = {
  asset: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  liability: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  equity: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  revenue: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  expense: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

export default function ChartOfAccounts() {
  const { t } = useErpTranslation();
  const accounts = useAccountingStore((s) => s.accounts);
  const createAccountRemote = useAccountingStore((s) => s.createAccountRemote);
  const updateAccountRemote = useAccountingStore((s) => s.updateAccountRemote);
  const deleteAccountRemote = useAccountingStore((s) => s.deleteAccountRemote);
  const revalidateBaseData = useAccountingStore((s) => s.revalidateBaseData);
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
      toast.error(t("accounting.coa.codeNameRequired"));
      return;
    }
    try {
      if (editing) {
        await updateAccountRemote(editing.id, {
          code: form.code,
          name: form.name,
          type: form.type,
          subtype: form.subtype,
          parentId: form.parentId ?? null,
          description: form.description || undefined,
          active: form.active,
        });
        toast.success(t("accounting.coa.updated"));
      } else {
        await createAccountRemote({
          code: form.code,
          name: form.name,
          type: form.type,
          subtype: form.subtype,
          parentId: form.parentId ?? null,
          description: form.description || undefined,
          active: form.active,
        });
        toast.success(t("accounting.coa.created"));
      }
      await revalidateBaseData();
      setOpen(false);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("accounting.coa.saveFailed"));
    }
  };

  const filtered = accounts
    .filter((a) => filterType === "all" || a.type === filterType)
    .sort((a, b) => a.code.localeCompare(b.code));

  const subtypeOptions = ACCOUNT_SUBTYPES.filter((s) => s.type === form.type);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">{t("accounting.coa.type")}</Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("accounting.coa.filterAll")}</SelectItem>
              {ACCOUNT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>{t(`accounting.coa.types.${type}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> {t("accounting.coa.newAccount")}</Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("accounting.coa.code")}</TableHead>
              <TableHead>{t("accounting.coa.name")}</TableHead>
              <TableHead>{t("accounting.coa.type")}</TableHead>
              <TableHead>{t("accounting.coa.subtype")}</TableHead>
              <TableHead>{t("accounting.coa.parent")}</TableHead>
              <TableHead>{t("common:common.status")}</TableHead>
              <TableHead className="text-right">{t("accounting.coa.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono">{a.code}</TableCell>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell><Badge className={typeColor[a.type]} variant="secondary">{t(`accounting.coa.types.${a.type}`)}</Badge></TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {t(`accounting.coa.subtypes.${a.subtype}`)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {accounts.find((p) => p.id === a.parentId)?.name || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={a.active ? "default" : "secondary"}>
                    {a.active ? t("common:common.active") : t("common:common.inactive")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      void (async () => {
                        try {
                          await deleteAccountRemote(a.id);
                          await revalidateBaseData();
                          toast.success(t("accounting.coa.deleted"));
                        } catch (e) {
                          toast.error(formatApiErrorMessage(e, t) || t("accounting.coa.deleteFailed"));
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
          <DialogHeader>
            <DialogTitle>{editing ? t("accounting.coa.editAccount") : t("accounting.coa.newAccount")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("accounting.coa.code")}</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="1100" />
              </div>
              <div>
                <Label>{t("accounting.coa.name")}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Cash" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("accounting.coa.type")}</Label>
                <Select
                  value={form.type}
                  onValueChange={(v: AccountType) => {
                    const sub = ACCOUNT_SUBTYPES.find((s) => s.type === v)!.value;
                    setForm({ ...form, type: v, subtype: sub });
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{t(`accounting.coa.types.${type}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("accounting.coa.subtype")}</Label>
                <Select value={form.subtype} onValueChange={(v: AccountSubtype) => setForm({ ...form, subtype: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {subtypeOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{t(`accounting.coa.subtypes.${s.value}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t("accounting.coa.parentOptional")}</Label>
              <Select value={form.parentId || "none"} onValueChange={(v) => setForm({ ...form, parentId: v === "none" ? undefined : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("accounting.coa.none")}</SelectItem>
                  {accounts.filter((a) => a.type === form.type && a.id !== editing?.id).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("accounting.coa.description")}</Label>
              <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common:common.cancel")}</Button>
            <Button onClick={() => void save()}>{t("ops:shared.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
