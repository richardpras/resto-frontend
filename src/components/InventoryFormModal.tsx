import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { dialogScroll, dialogSize } from "@/lib/ui/dialogSizes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type InventoryItemType } from "@/stores/inventoryStore";
import { toast } from "@/hooks/use-toast";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";
import { Package, Paperclip, Armchair } from "lucide-react";
import { type InventoryItemApi, type InventoryPayload } from "@/lib/api-integration/inventoryEndpoints";
import {
  createProcurementSetting,
  updateProcurementSetting,
} from "@/lib/api-integration/procurementSettingsEndpoints";
import InventoryProcurementFields, {
  emptyProcurementForm,
  type ProcurementFormState,
} from "@/components/InventoryProcurementFields";

const typeConfig: Record<InventoryItemType, { icon: React.ReactNode; units: string[]; color: string }> = {
  ingredient: { icon: <Package className="h-4 w-4" />, units: ["kg", "g", "L", "ml", "pcs", "pack", "box"], color: "text-emerald-500" },
  atk: { icon: <Paperclip className="h-4 w-4" />, units: ["pcs", "box", "pack", "ream"], color: "text-blue-500" },
  asset: { icon: <Armchair className="h-4 w-4" />, units: ["pcs", "unit"], color: "text-amber-500" },
};

type FormData = {
  name: string;
  type: InventoryItemType;
  unit: string;
  stock: string;
  min: string;
  price: string;
  notes: string;
};

const emptyForm: FormData = { name: "", type: "ingredient", unit: "kg", stock: "", min: "", price: "", notes: "" };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editItem?: InventoryItemApi | null;
  onSave: (payload: InventoryPayload, id?: string) => Promise<string | void>;
};

export default function InventoryFormModal({ open, onOpenChange, editItem, onSave }: Props) {
  const { t } = useOpsTranslation();
  const [form, setForm] = useState<FormData>(emptyForm);
  const [procurementForm, setProcurementForm] = useState<ProcurementFormState>(emptyProcurementForm);
  const [tab, setTab] = useState("details");
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);

  const typeLabel = (type: InventoryItemType) => t(`inventory.form.types.${type}`);

  const handleProcurementChange = useCallback((value: ProcurementFormState) => {
    setProcurementForm(value);
  }, []);

  useEffect(() => {
    if (open) {
      if (editItem) {
        setForm({
          name: editItem.name,
          type: editItem.type,
          unit: editItem.unit,
          stock: String(editItem.stock),
          min: String(editItem.min),
          price: editItem.price ? String(editItem.price) : "",
          notes: editItem.notes || "",
        });
      } else {
        setForm(emptyForm);
      }
      setErrors({});
      setTab("details");
      setProcurementForm(emptyProcurementForm);
    }
  }, [open, editItem]);

  const persistProcurementSettings = async (inventoryItemId: string) => {
    const payload = {
      preferredSupplierId: procurementForm.preferredSupplierId || undefined,
      minimumOrderQty: procurementForm.minimumOrderQty !== "" ? Number(procurementForm.minimumOrderQty) : undefined,
      reorderQty: procurementForm.reorderQty !== "" ? Number(procurementForm.reorderQty) : undefined,
      leadTimeDays: procurementForm.leadTimeDays !== "" ? Number(procurementForm.leadTimeDays) : undefined,
      lastPurchasePrice: procurementForm.lastPurchasePrice !== "" ? Number(procurementForm.lastPurchasePrice) : undefined,
    };
    const hasData = Object.values(payload).some((v) => v !== undefined);
    if (!hasData && !procurementForm.settingId) return;

    if (procurementForm.settingId) {
      await updateProcurementSetting(procurementForm.settingId, {
        preferredSupplierId: payload.preferredSupplierId ?? null,
        minimumOrderQty: payload.minimumOrderQty ?? null,
        reorderQty: payload.reorderQty ?? null,
        leadTimeDays: payload.leadTimeDays ?? null,
        lastPurchasePrice: payload.lastPurchasePrice ?? null,
      });
      return;
    }
    if (!hasData) return;
    await createProcurementSetting({ inventoryItemId, ...payload });
  };

  const handleTypeChange = (type: InventoryItemType) => {
    const defaultUnit = typeConfig[type].units[0];
    setForm((f) => ({ ...f, type, unit: defaultUnit, min: type === "asset" ? "0" : f.min, price: type === "asset" ? "" : f.price }));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) e.name = t("inventory.form.validation.nameRequired");
    if (!form.type) e.type = t("inventory.form.validation.typeRequired");
    if (form.type !== "asset" && !form.unit) e.unit = t("inventory.form.validation.unitRequired");
    if (form.stock !== "" && (isNaN(Number(form.stock)) || Number(form.stock) < 0)) e.stock = t("inventory.form.validation.invalidNumber");
    if (form.type !== "asset" && form.min !== "" && (isNaN(Number(form.min)) || Number(form.min) < 0)) e.min = t("inventory.form.validation.invalidNumber");
    if (form.price !== "" && (isNaN(Number(form.price)) || Number(form.price) < 0)) e.price = t("inventory.form.validation.invalidNumber");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));

    const payload: InventoryPayload = {
      name: form.name.trim(),
      type: form.type,
      unit: form.unit,
      stock: Number(form.stock) || 0,
      min: form.type === "asset" ? 0 : Number(form.min) || 0,
      ...(form.price ? { price: Number(form.price) } : {}),
      ...(form.notes ? { notes: form.notes.trim() } : {}),
    };

    try {
      const savedId = await onSave(payload, editItem?.id);
      if (savedId) {
        await persistProcurementSettings(savedId);
      }
      toast({
        title: editItem ? t("inventory.form.toast.updated") : t("inventory.form.toast.created"),
        description: editItem
          ? t("inventory.form.toast.updatedDesc", { name: payload.name })
          : t("inventory.form.toast.createdDesc", { name: payload.name }),
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: t("inventory.form.toast.saveFailed"),
        description: error instanceof Error ? error.message : t("shared.somethingWrong"),
      });
    } finally {
      setSaving(false);
    }
  };

  const cfg = typeConfig[form.type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${dialogSize.lg} ${dialogScroll}`}>
        <DialogHeader>
          <DialogTitle className="text-lg">{editItem ? t("inventory.form.editTitle") : t("inventory.form.addTitle")}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="py-2">
          {editItem && (
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="details">{t("inventory.form.tabs.details")}</TabsTrigger>
              <TabsTrigger value="procurement">{t("inventory.form.tabs.procurement")}</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="details" className="space-y-5 mt-0">
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("inventory.form.typeRequired")}</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(typeConfig) as InventoryItemType[]).map((itemType) => {
                const c = typeConfig[itemType];
                const active = form.type === itemType;
                return (
                  <button
                    key={itemType}
                    type="button"
                    onClick={() => handleTypeChange(itemType)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                      active
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <span className={active ? "text-primary" : c.color}>{c.icon}</span>
                    {typeLabel(itemType)}
                  </button>
                );
              })}
            </div>
            {errors.type && <p className="text-xs text-destructive">{errors.type}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("inventory.form.itemName")}</Label>
            <Input
              placeholder={t("inventory.form.namePlaceholder")}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span className={cfg.color}>{cfg.icon}</span>
              {t("inventory.form.detailsLabel", { type: typeLabel(form.type) })}
            </p>

            <div className="space-y-2">
              <Label className="text-sm">{form.type !== "asset" ? t("inventory.form.unitRequired") : t("inventory.form.unit")}</Label>
              <Select value={form.unit} onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cfg.units.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.unit && <p className="text-xs text-destructive">{errors.unit}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{form.type === "asset" ? t("inventory.form.quantity") : t("inventory.form.initialStock")}</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                  className={errors.stock ? "border-destructive" : ""}
                />
                {errors.stock && <p className="text-xs text-destructive">{errors.stock}</p>}
              </div>

              {form.type !== "asset" && (
                <div className="space-y-2">
                  <Label className="text-sm">{t("inventory.form.minStock")}</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.min}
                    onChange={(e) => setForm((f) => ({ ...f, min: e.target.value }))}
                    className={errors.min ? "border-destructive" : ""}
                  />
                  {errors.min && <p className="text-xs text-destructive">{errors.min}</p>}
                </div>
              )}
            </div>

            {form.type !== "asset" && (
              <div className="space-y-2">
                <Label className="text-sm">{t("inventory.form.purchasePrice")}</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  className={errors.price ? "border-destructive" : ""}
                />
                {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
              </div>
            )}

            {form.type === "asset" && (
              <div className="space-y-2">
                <Label className="text-sm">{t("inventory.form.notes")}</Label>
                <Textarea
                  placeholder={t("inventory.form.notesPlaceholder")}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            )}
          </div>
          </TabsContent>

          {editItem && (
            <TabsContent value="procurement" className="mt-0">
              <InventoryProcurementFields
                inventoryItemId={editItem.id}
                value={procurementForm}
                onChange={handleProcurementChange}
              />
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("inventory.form.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t("inventory.form.saving") : editItem ? t("inventory.form.updateItem") : t("inventory.form.saveItem")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
