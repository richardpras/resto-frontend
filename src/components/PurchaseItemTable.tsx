import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInventoryStore } from "@/stores/inventoryStore";
import { Plus, Trash2 } from "lucide-react";

export type PurchaseLineItem = {
  inventoryItemId: string;
  qty: number;
  prItemId?: string;
  requestedQty?: number;
  prRemainingQty?: number;
  isFromPr?: boolean;
  unit: string;
  price: number;
  notes?: string;
};

type Props = {
  items: PurchaseLineItem[];
  onChange: (items: PurchaseLineItem[]) => void;
  showPrice?: boolean;
  showNotes?: boolean;
  readOnly?: boolean;
  receivedQtyMap?: Record<string, number>;
  onReceivedQtyChange?: (idx: number, val: number) => void;
  showReceiving?: boolean;
  showPrComparison?: boolean;
};

export function PurchaseItemTable({
  items,
  onChange,
  showPrice = false,
  showNotes = false,
  readOnly = false,
  showReceiving = false,
  receivedQtyMap,
  onReceivedQtyChange,
  showPrComparison = false,
}: Props) {
  const { ingredients } = useInventoryStore();

  const addRow = () => {
    onChange([...items, { inventoryItemId: "", qty: 1, unit: "", price: 0, notes: "" }]);
  };

  const updateRow = (idx: number, field: string, value: any) => {
    const updated = items.map((item, i) => {
      if (i !== idx) return item;
      const next = { ...item, [field]: value };
      if (field === "inventoryItemId") {
        const inv = ingredients.find((ing) => ing.id === value);
        if (inv) next.unit = inv.unit;
      }
      return next;
    });
    onChange(updated);
  };

  const removeRow = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const getItemName = (id: string) => ingredients.find((i) => i.id === id)?.name ?? "—";

  return (
    <div className="space-y-2">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[240px]">Item</TableHead>
              <TableHead className="w-24">Qty</TableHead>
              {showPrComparison && <TableHead className="w-24">PR Qty</TableHead>}
              {showPrComparison && <TableHead className="w-24">Remaining</TableHead>}
              <TableHead className="w-20">Unit</TableHead>
              {showPrice && <TableHead className="w-28">Price</TableHead>}
              {showPrice && <TableHead className="w-28">Subtotal</TableHead>}
              {showReceiving && <TableHead className="w-28">Received</TableHead>}
              {showNotes && <TableHead>Notes</TableHead>}
              {!readOnly && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No items added yet
                </TableCell>
              </TableRow>
            )}
            {items.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  {readOnly ? (
                    <span className="text-sm font-medium">{getItemName(item.inventoryItemId)}</span>
                  ) : (
                    <Select
                      value={item.inventoryItemId}
                      onValueChange={(v) => updateRow(idx, "inventoryItemId", v)}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {ingredients.map((ing) => (
                          <SelectItem key={ing.id} value={ing.id}>
                            {ing.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell className={showPrComparison && item.isFromPr && item.requestedQty !== undefined && item.qty !== item.requestedQty ? "text-warning font-medium" : ""}>
                  {readOnly ? (
                    <span className="text-sm">{item.qty}</span>
                  ) : (
                    <Input
                      type="number"
                      min={0}
                      className="h-9 w-20"
                      value={item.qty}
                      onChange={(e) => updateRow(idx, "qty", Number(e.target.value))}
                    />
                  )}
                </TableCell>
                {showPrComparison && (
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{item.isFromPr ? (item.requestedQty ?? 0) : "-"}</span>
                  </TableCell>
                )}
                {showPrComparison && (
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{item.isFromPr ? (item.prRemainingQty ?? 0) : "-"}</span>
                  </TableCell>
                )}
                <TableCell>
                  <span className="text-sm text-muted-foreground">{item.unit || "—"}</span>
                </TableCell>
                {showPrice && (
                  <TableCell>
                    {readOnly ? (
                      <span className="text-sm">{item.price.toLocaleString()}</span>
                    ) : (
                      <Input
                        type="number"
                        min={0}
                        className="h-9 w-24"
                        value={item.price}
                        onChange={(e) => updateRow(idx, "price", Number(e.target.value))}
                      />
                    )}
                  </TableCell>
                )}
                {showPrice && (
                  <TableCell>
                    <span className="text-sm font-medium">
                      {(item.qty * item.price).toLocaleString()}
                    </span>
                  </TableCell>
                )}
                {showReceiving && (
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={item.qty}
                      className="h-9 w-24"
                      value={receivedQtyMap?.[item.inventoryItemId] ?? 0}
                      onChange={(e) => onReceivedQtyChange?.(idx, Number(e.target.value))}
                    />
                  </TableCell>
                )}
                {showNotes && (
                  <TableCell>
                    {readOnly ? (
                      <span className="text-sm text-muted-foreground">{item.notes}</span>
                    ) : (
                      <Input
                        className="h-9"
                        value={item.notes ?? ""}
                        onChange={(e) => updateRow(idx, "notes", e.target.value)}
                        placeholder="Optional"
                      />
                    )}
                  </TableCell>
                )}
                {!readOnly && (
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRow(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!readOnly && (
        <Button variant="outline" size="sm" onClick={addRow} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Add Item
        </Button>
      )}
    </div>
  );
}
