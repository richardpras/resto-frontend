import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useSettingsStore, Outlet } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { getApiAccessToken } from "@/lib/api-integration/client";
import { toast } from "sonner";

const empty: Outlet = {
  id: 0,
  code: "",
  name: "",
  address: "",
  phone: "",
  manager: "",
  status: "active",
};

export default function OutletsSettings() {
  const { t } = useTranslation("common");
  const outlets = useSettingsStore((s) => s.outlets);
  const outletsLoading = useSettingsStore((s) => s.outletsLoading);
  const outletsError = useSettingsStore((s) => s.outletsError);
  const outletsSubmitting = useSettingsStore((s) => s.outletsSubmitting);
  const saveOutlet = useSettingsStore((s) => s.saveOutlet);
  const deleteOutletById = useSettingsStore((s) => s.deleteOutletById);
  const canManageOutletSettings = useAuthStore((s) => s.canManageOutletSettings);
  const canCreateOutlet = canManageOutletSettings();
  const hasToken = Boolean(getApiAccessToken());
  const showEmptyScopeHint =
    hasToken && !outletsLoading && !outletsError && outlets.length === 0;
  const showSignInHint = !hasToken && !outletsLoading && outlets.length === 0;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Outlet>(empty);

  const openNew = () => {
    setForm({ ...empty });
    setOpen(true);
  };
  const openEdit = (outlet: Outlet) => {
    setForm(outlet);
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error(t("settings.outlets.nameRequired"));
    try {
      await saveOutlet(form);
      toast.success(t("settings.outlets.saved"));
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.saveFailed"));
    }
  };

  const onDelete = async (id: number) => {
    if (!confirm(t("settings.outlets.deleteConfirm"))) return;
    try {
      await deleteOutletById(id);
      toast.success(t("settings.outlets.deleted"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.deleteFailed"));
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">{t("settings.outlets.title")}</h2>
          {canCreateOutlet && (
            <Button type="button" onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" />
              {t("settings.outlets.add")}
            </Button>
          )}
        </div>
        {outletsLoading && (
          <p className="text-sm text-muted-foreground" role="status">
            {t("settings.outlets.loading")}
          </p>
        )}
        {outletsError && (
          <Alert variant="destructive">
            <AlertTitle>{t("settings.outlets.loadError")}</AlertTitle>
            <AlertDescription>{outletsError}</AlertDescription>
          </Alert>
        )}
        {showSignInHint && (
          <Alert>
            <AlertTitle>{t("settings.outlets.notSignedIn")}</AlertTitle>
            <AlertDescription>{t("settings.outlets.signInHint")}</AlertDescription>
          </Alert>
        )}
        {showEmptyScopeHint && (
          <Alert>
            <AlertTitle>{t("settings.outlets.emptyScope")}</AlertTitle>
            <AlertDescription>{t("settings.outlets.emptyScopeHint")}</AlertDescription>
          </Alert>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>{t("settings.outlets.code")}</TableHead>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("settings.merchant.address")}</TableHead>
              <TableHead>{t("settings.merchant.phone")}</TableHead>
              <TableHead>{t("settings.outlets.manager")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {outlets.map((outlet) => (
              <TableRow key={outlet.id}>
                <TableCell className="text-muted-foreground font-mono text-xs">{outlet.id}</TableCell>
                <TableCell className="font-mono text-xs">{outlet.code}</TableCell>
                <TableCell className="font-medium">{outlet.name}</TableCell>
                <TableCell className="text-muted-foreground">{outlet.address}</TableCell>
                <TableCell>{outlet.phone}</TableCell>
                <TableCell>{outlet.manager}</TableCell>
                <TableCell>
                  <Badge variant={outlet.status === "active" ? "default" : "secondary"}>
                    {outlet.status === "active" ? t("common.active") : t("common.inactive")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {canManageOutletSettings(outlet.id) && (
                      <>
                        <Button type="button" size="icon" variant="ghost" onClick={() => openEdit(outlet)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" onClick={() => void onDelete(outlet.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {form.id > 0 && outlets.some((outlet) => outlet.id === form.id)
                  ? t("settings.outlets.editTitle")
                  : t("settings.outlets.newTitle")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{t("settings.outlets.codeHint")}</p>
              <div className="space-y-2">
                <Label>{t("settings.outlets.code")}</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder={t("settings.outlets.codePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("common.name")}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t("settings.merchant.address")}</Label>
                <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("settings.merchant.phone")}</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t("settings.outlets.manager")}</Label>
                  <Input value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("common.status")}</Label>
                <Select value={form.status} onValueChange={(v: "active" | "inactive") => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t("common.active")}</SelectItem>
                    <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={outletsSubmitting}>
                {t("common.cancel")}
              </Button>
              <Button type="button" onClick={() => void save()} disabled={outletsSubmitting}>
                {outletsSubmitting ? t("common.saving") : t("common.saveShort")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
