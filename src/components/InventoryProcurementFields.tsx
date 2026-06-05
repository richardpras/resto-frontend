import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listProcurementSettings } from "@/lib/api-integration/procurementSettingsEndpoints";
import { useSupplierStore } from "@/stores/supplierStore";

export type ProcurementFormState = {
  settingId: string | null;
  preferredSupplierId: string;
  minimumOrderQty: string;
  reorderQty: string;
  leadTimeDays: string;
  lastPurchasePrice: string;
};

export const emptyProcurementForm: ProcurementFormState = {
  settingId: null,
  preferredSupplierId: "",
  minimumOrderQty: "",
  reorderQty: "",
  leadTimeDays: "",
  lastPurchasePrice: "",
};

type Props = {
  inventoryItemId: string;
  value: ProcurementFormState;
  onChange: (value: ProcurementFormState) => void;
};

export default function InventoryProcurementFields({ inventoryItemId, value, onChange }: Props) {
  const { suppliers, fetchSuppliers } = useSupplierStore();

  useEffect(() => {
    void fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const rows = await listProcurementSettings(inventoryItemId);
      if (!active) return;
      const row = rows[0];
      if (!row) {
        onChange(emptyProcurementForm);
        return;
      }
      onChange({
        settingId: row.id,
        preferredSupplierId: row.preferredSupplierId ?? "",
        minimumOrderQty: row.minimumOrderQty != null ? String(row.minimumOrderQty) : "",
        reorderQty: row.reorderQty != null ? String(row.reorderQty) : "",
        leadTimeDays: row.leadTimeDays != null ? String(row.leadTimeDays) : "",
        lastPurchasePrice: row.lastPurchasePrice != null ? String(row.lastPurchasePrice) : "",
      });
    };
    void load();
    return () => {
      active = false;
    };
  }, [inventoryItemId, onChange]);

  const setField = <K extends keyof ProcurementFormState>(key: K, fieldValue: ProcurementFormState[K]) => {
    onChange({ ...value, [key]: fieldValue });
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Procurement defaults for this item. Saved together with the item update.</p>

      <div className="space-y-2">
        <Label>Preferred Supplier</Label>
        <Select
          value={value.preferredSupplierId || "__none__"}
          onValueChange={(v) => setField("preferredSupplierId", v === "__none__" ? "" : v)}
        >
          <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— None —</SelectItem>
            {suppliers.filter((s) => s.isActive).map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Minimum Order Qty</Label>
          <Input type="number" min="0" value={value.minimumOrderQty} onChange={(e) => setField("minimumOrderQty", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Reorder Qty</Label>
          <Input type="number" min="0" value={value.reorderQty} onChange={(e) => setField("reorderQty", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Lead Time (days)</Label>
          <Input type="number" min="0" value={value.leadTimeDays} onChange={(e) => setField("leadTimeDays", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Last Purchase Price</Label>
          <Input type="number" min="0" value={value.lastPurchasePrice} onChange={(e) => setField("lastPurchasePrice", e.target.value)} />
        </div>
      </div>
    </div>
  );
}
