import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { useSettingsStore, Tax, newId, removeTaxCascade } from "@/stores/settingsStore";
import { toast } from "sonner";
import { ApiHttpError, getApiAccessToken } from "@/lib/api-integration/client";
import { patchTax, postTax } from "@/lib/api-integration/settingsDomainEndpoints";
import OutletTaxAssignmentSettings from "./OutletTaxAssignmentSettings";

const empty: Tax = { id: "", name: "", type: "percentage", value: 0, applyDineIn: true, applyTakeaway: true, inclusive: false, status: "active", effectiveFrom: null, effectiveTo: null };

export default function TaxSettings() {
  const { t } = useTranslation("common");
  const taxes = useSettingsStore((s) => s.taxes);
  const upsertTax = useSettingsStore((s) => s.upsertTax);
  const ensureSectionsLoaded = useSettingsStore((s) => s.ensureSectionsLoaded);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Tax>(empty);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) return toast.error(t("settings.taxes.nameRequired"));
    if (form.value < 0) return toast.error(t("settings.taxes.valueMin"));
    if (form.effectiveFrom && form.effectiveTo && form.effectiveTo < form.effectiveFrom) {
      return toast.error(t("settings.taxes.effectiveRangeInvalid"));
    }
    const wasInList = useSettingsStore.getState().taxes.some((row) => row.id === form.id);
    setSaving(true);
    try {
      if (!getApiAccessToken()) {
        upsertTax(form);
        toast.success(t("settings.taxes.savedLocally"));
        setOpen(false);
        return;
      }
      const saved = wasInList ? await patchTax(form.id, form) : await postTax(form);
      upsertTax(saved);
      await ensureSectionsLoaded(["taxes"], { force: true, staleMs: 0 });
      toast.success(t("settings.taxes.saved"));
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">{t("settings.taxes.title")}</h2>
          <Button onClick={() => { setForm({ ...empty, id: newId() }); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />{t("settings.taxes.add")}</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead><TableHead>{t("common.type")}</TableHead><TableHead>{t("settings.taxes.value")}</TableHead>
              <TableHead>{t("settings.taxes.applyTo")}</TableHead><TableHead>{t("settings.taxes.mode")}</TableHead><TableHead>{t("settings.taxes.effective")}</TableHead><TableHead>{t("common.status")}</TableHead><TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {taxes.map((tax) => (
              <TableRow key={tax.id}>
                <TableCell className="font-medium">{tax.name}</TableCell>
                <TableCell className="capitalize">{tax.type}</TableCell>
                <TableCell>{tax.type === "percentage" ? `${tax.value}%` : tax.value}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {[tax.applyDineIn && t("settings.taxes.dineIn"), tax.applyTakeaway && t("settings.taxes.takeaway")].filter(Boolean).join(", ")}
                </TableCell>
                <TableCell>{tax.inclusive ? t("settings.taxes.inclusive") : t("settings.taxes.exclusive")}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {[tax.effectiveFrom, tax.effectiveTo].filter(Boolean).join(" – ") || t("settings.taxes.alwaysEffective")}
                </TableCell>
                <TableCell><Badge variant={tax.status === "active" ? "default" : "secondary"}>{tax.status === "active" ? t("common.active") : t("common.inactive")}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setForm(tax); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (!confirm(t("settings.taxes.deleteConfirm"))) return;
                        void (async () => {
                          try {
                            await removeTaxCascade(tax.id);
                            if (getApiAccessToken()) await ensureSectionsLoaded(["taxes"], { force: true, staleMs: 0 });
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

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("settings.taxes.dialogTitle")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2"><Label>{t("common.name")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("common.type")}</Label>
                  <Select value={form.type} onValueChange={(v: "percentage" | "fixed") => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">{t("settings.taxes.percentage")}</SelectItem>
                      <SelectItem value="fixed">{t("settings.taxes.fixed")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>{t("settings.taxes.value")}</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: +e.target.value })} /></div>
              </div>
              <div className="space-y-2">
                <Label>{t("settings.taxes.applyTo")}</Label>
                <div className="flex gap-4 pt-1">
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.applyDineIn} onCheckedChange={(v) => setForm({ ...form, applyDineIn: !!v })} />{t("settings.taxes.dineIn")}</label>
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.applyTakeaway} onCheckedChange={(v) => setForm({ ...form, applyTakeaway: !!v })} />{t("settings.taxes.takeaway")}</label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("settings.taxes.calcMode")}</Label>
                <Select value={form.inclusive ? "inclusive" : "exclusive"} onValueChange={(v) => setForm({ ...form, inclusive: v === "inclusive" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exclusive">{t("settings.taxes.exclusiveDesc")}</SelectItem>
                    <SelectItem value="inclusive">{t("settings.taxes.inclusiveDesc")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("settings.taxes.effectiveFrom")}</Label>
                  <Input type="date" value={form.effectiveFrom ?? ""} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value || null })} />
                </div>
                <div className="space-y-2">
                  <Label>{t("settings.taxes.effectiveTo")}</Label>
                  <Input type="date" value={form.effectiveTo ?? ""} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value || null })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("common.status")}</Label>
                <Select value={form.status} onValueChange={(v: "active" | "inactive") => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t("common.active")}</SelectItem>
                    <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>{t("common.cancel")}</Button>
              <Button type="button" onClick={() => void save()} disabled={saving}>{saving ? t("common.saving") : t("common.saveShort")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
    <OutletTaxAssignmentSettings />
    </div>
  );
}
