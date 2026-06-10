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
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const title = type === "waste" ? "Record Waste" : "Stock Adjustment";

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
            <Label>Ingredient</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
              <SelectContent>
                {items.filter((i) => i.type !== "asset").map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantity</Label>
            <Input type="number" min="0.01" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div>
            <Label>Reference / Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => void handleSubmit()} disabled={busy || !itemId}>Save Movement</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
