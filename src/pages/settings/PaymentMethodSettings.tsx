import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("common");
  const paymentMethods = useSettingsStore((s) => s.paymentMethods);
  const upsertPayment = useSettingsStore((s) => s.upsertPayment);
  const ensureSectionsLoaded = useSettingsStore((s) => s.ensureSectionsLoaded);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PaymentMethod>(empty);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) return toast.error(t("settings.payments.nameRequired"));
    const wasInList = useSettingsStore.getState().paymentMethods.some((x) => x.id === form.id);
    setSaving(true);
    try {
      if (!getApiAccessToken()) {
        upsertPayment(form);
        toast.success(t("settings.payments.savedLocally"));
        setOpen(false);
        return;
      }
      const saved = wasInList ? await patchPaymentMethod(form.id, form) : await postPaymentMethod(form);
      upsertPayment(saved);
      await ensureSectionsLoaded(["paymentMethods"], { force: true, staleMs: 0 });
      toast.success(t("settings.payments.saved"));
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div>
            <h2 className="font-semibold">{t("settings.payments.masterTitle")}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t("settings.payments.masterDesc")}
            </p>
          </div>
          <Button onClick={() => { setForm({ ...empty, id: newId() }); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />{t("settings.payments.addMethod")}</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead><TableHead>{t("common.type")}</TableHead><TableHead>{t("settings.payments.integration")}</TableHead>
              <TableHead>{t("settings.payments.fee")}</TableHead><TableHead>{t("common.status")}</TableHead><TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentMethods.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{p.type}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{p.integration || "-"}</TableCell>
                <TableCell>{p.fee ? `${p.fee}%` : "-"}</TableCell>
                <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status === "active" ? t("common.active") : t("common.inactive")}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setForm(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (!confirm(t("common.deleteConfirm"))) return;
                        void (async () => {
                          try {
                            await removePaymentCascade(p.id);
                            if (getApiAccessToken()) await ensureSectionsLoaded(["paymentMethods"], { force: true, staleMs: 0 });
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
            <DialogHeader><DialogTitle>{t("settings.payments.dialogTitle")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2"><Label>{t("common.name")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>{t("common.type")}</Label>
                <Select value={form.type} onValueChange={(v: "cash" | "digital") => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t("settings.payments.cash")}</SelectItem>
                    <SelectItem value="digital">{t("settings.payments.digital")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>{t("settings.payments.integrationOptional")}</Label><Input placeholder={t("settings.payments.integrationPlaceholder")} value={form.integration || ""} onChange={(e) => setForm({ ...form, integration: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t("settings.payments.feeOptional")}</Label><Input type="number" step="0.1" value={form.fee ?? ""} onChange={(e) => setForm({ ...form, fee: e.target.value ? +e.target.value : undefined })} /></div>
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
  );
}
