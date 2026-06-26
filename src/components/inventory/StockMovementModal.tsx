import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";
import type { InventoryItem } from "@/stores/inventoryStore";

type MovementType = "waste" | "adjustment";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: MovementType;
  items: InventoryItem[];
  onSubmit: (payload: {
    inventory_item_id: number;
    type: MovementType;
    quantity: number;
    source_type: string;
    source_id?: string;
  }) => Promise<void>;
};

export function StockMovementModal({ open, onOpenChange, type, items, onSubmit }: Props) {
  const { t } = useOpsTranslation();
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const title = type === "waste" ? t("inventory.stockMovement.recordWaste") : t("inventory.stockMovement.adjustment");

  const handleSubmit = async () => {
    const id = Number(itemId);
    const qty = Number(quantity);
    if (!Number.isFinite(id) || id < 1 || !Number.isFinite(qty) || qty <= 0) return;
    setBusy(true);
    try {
      await onSubmit({
        inventory_item_id: id,
        type,
        quantity: qty,
        source_type: type === "waste" ? "manual_waste" : "manual_adjustment",
        source_id: note.trim() || undefined,
      });
      onOpenChange(false);
      setItemId("");
      setQuantity("1");
      setNote("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("inventory.stockMovement.ingredient")}</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger><SelectValue placeholder={t("inventory.stockMovement.selectItem")} /></SelectTrigger>
              <SelectContent>
                {items.filter((i) => i.type !== "asset").map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("inventory.stockMovement.quantity")}</Label>
            <Input type="number" min="0.01" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div>
            <Label>{t("inventory.stockMovement.referenceNote")}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("inventory.stockMovement.optional")} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => void handleSubmit()} disabled={busy || !itemId}>{t("inventory.stockMovement.saveMovement")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
