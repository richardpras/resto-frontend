import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOutletStore } from "@/stores/outletStore";
import { useAuthStore, PERMISSIONS } from "@/stores/authStore";
import {
  createWarehouse,
  deactivateWarehouse,
  listWarehouses,
  updateWarehouse,
  type WarehouseApiRow,
} from "@/lib/api-integration/warehouseEndpoints";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { toast } from "sonner";

type FormState = {
  code: string;
  name: string;
};

const emptyForm = (): FormState => ({ code: "", name: "" });

export default function WarehouseSettings() {
  const { t } = useTranslation("common");
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canManage = hasPermission(PERMISSIONS.PURCHASE);

  const [rows, setRows] = useState<WarehouseApiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseApiRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      setRows(await listWarehouses({ outletId: activeOutletId }));
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("settings.warehouses.loadFailed"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeOutletId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (row: WarehouseApiRow) => {
    setEditing(row);
    setForm({ code: row.code, name: row.name });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error(t("settings.warehouses.fieldsRequired"));
      return;
    }
    if (typeof activeOutletId !== "number" || activeOutletId < 1) {
      toast.error(t("settings.warehouses.selectOutlet"));
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateWarehouse(editing.id, { code: form.code.trim().toUpperCase(), name: form.name.trim() });
        toast.success(t("settings.warehouses.updated"));
      } else {
        await createWarehouse({
          outletId: activeOutletId,
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
          type: "outlet",
        });
        toast.success(t("settings.warehouses.created"));
      }
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("settings.warehouses.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (row: WarehouseApiRow) => {
    if (!confirm(t("settings.warehouses.deactivateConfirm"))) return;
    try {
      await deactivateWarehouse(row.id);
      toast.success(t("settings.warehouses.deactivated"));
      await load();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("settings.warehouses.saveFailed"));
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h2 className="font-semibold">{t("settings.warehouses.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("settings.warehouses.subtitle")}</p>
          </div>
          {canManage && (
            <Button type="button" onClick={openNew} disabled={!activeOutletId || activeOutletId < 1}>
              <Plus className="h-4 w-4 mr-2" />
              {t("settings.warehouses.add")}
            </Button>
          )}
        </div>

        {(!activeOutletId || activeOutletId < 1) && (
          <p className="text-sm text-amber-700 dark:text-amber-300">{t("settings.warehouses.selectOutlet")}</p>
        )}

        {loading && <p className="text-sm text-muted-foreground">{t("settings.warehouses.loading")}</p>}

        {!loading && activeOutletId && activeOutletId >= 1 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("settings.warehouses.code")}</TableHead>
                <TableHead>{t("settings.warehouses.name")}</TableHead>
                <TableHead>{t("settings.warehouses.status")}</TableHead>
                {canManage && <TableHead className="text-right">{t("settings.warehouses.actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 4 : 3} className="text-center text-muted-foreground py-8">
                    {t("settings.warehouses.empty")}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-sm">{row.code}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.isActive ? t("settings.warehouses.active") : t("settings.warehouses.inactive")}</Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(row)} disabled={!row.isActive}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {row.isActive && (
                        <Button size="sm" variant="ghost" onClick={() => void handleDeactivate(row)}>
                          <Power className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t("settings.warehouses.edit") : t("settings.warehouses.add")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("settings.warehouses.code")}</Label>
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("settings.warehouses.name")}</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => void handleSave()} disabled={saving}>{t("common.saveShort")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
