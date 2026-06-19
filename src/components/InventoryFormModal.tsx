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

const typeConfig: Record<InventoryItemType, { label: string; icon: React.ReactNode; units: string[]; color: string }> = {
  ingredient: { label: "Ingredient", icon: <Package className="h-4 w-4" />, units: ["kg", "g", "L", "ml", "pcs", "pack", "box"], color: "text-emerald-500" },
  atk: { label: "ATK (Office)", icon: <Paperclip className="h-4 w-4" />, units: ["pcs", "box", "pack", "ream"], color: "text-blue-500" },
  asset: { label: "Asset", icon: <Armchair className="h-4 w-4" />, units: ["pcs", "unit"], color: "text-amber-500" },
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
  const [form, setForm] = useState<FormData>(emptyForm);
  const [procurementForm, setProcurementForm] = useState<ProcurementFormState>(emptyProcurementForm);
  const [tab, setTab] = useState("details");
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);

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
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.type) e.type = "Type is required";
    if (form.type !== "asset" && !form.unit) e.unit = "Unit is required";
    if (form.stock !== "" && (isNaN(Number(form.stock)) || Number(form.stock) < 0)) e.stock = "Invalid number";
    if (form.type !== "asset" && form.min !== "" && (isNaN(Number(form.min)) || Number(form.min) < 0)) e.min = "Invalid number";
    if (form.price !== "" && (isNaN(Number(form.price)) || Number(form.price) < 0)) e.price = "Invalid number";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    // simulate async
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
        title: editItem ? "Item updated" : "Item created",
        description: editItem
          ? `${payload.name} has been updated.`
          : `${payload.name} has been added to inventory.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unknown error",
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
          <DialogTitle className="text-lg">{editItem ? "Edit Inventory Item" : "Add Inventory Item"}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="py-2">
          {editItem && (
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="procurement">Procurement</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="details" className="space-y-5 mt-0">
          {/* Type selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Type *</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(typeConfig) as InventoryItemType[]).map((t) => {
                const c = typeConfig[t];
                const active = form.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                      active
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <span className={active ? "text-primary" : c.color}>{c.icon}</span>
                    {c.label}
                  </button>
                );
              })}
            </div>
            {errors.type && <p className="text-xs text-destructive">{errors.type}</p>}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Item Name *</Label>
            <Input
              placeholder="e.g. Rice, Thermal Paper, Blender"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Dynamic fields */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span className={cfg.color}>{cfg.icon}</span>
              {cfg.label} Details
            </p>

            {/* Unit — always shown */}
            <div className="space-y-2">
              <Label className="text-sm">Unit {form.type !== "asset" && "*"}</Label>
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

            {/* Stock / Quantity */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{form.type === "asset" ? "Quantity" : "Initial Stock"}</Label>
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

              {/* Minimum Stock — not for assets */}
              {form.type !== "asset" && (
                <div className="space-y-2">
                  <Label className="text-sm">Minimum Stock</Label>
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

            {/* Price — not for assets */}
            {form.type !== "asset" && (
              <div className="space-y-2">
                <Label className="text-sm">Purchase Price (Rp)</Label>
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

            {/* Notes — only for assets */}
            {form.type === "asset" && (
              <div className="space-y-2">
                <Label className="text-sm">Notes</Label>
                <Textarea
                  placeholder="Description, serial number, location..."
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
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editItem ? "Update Item" : "Save Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
