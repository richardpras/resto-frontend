import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInventoryStore } from "@/stores/inventoryStore";
import { sanitizeMoneyInput, sanitizeQuantityInput } from "@/lib/numericInput";
import { useErpTranslation } from "@/i18n/useErpTranslation";
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
  const { t } = useErpTranslation();
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

  const colCount =
    2 +
    (showPrComparison ? 2 : 0) +
    1 +
    (showPrice ? 2 : 0) +
    (showReceiving ? 1 : 0) +
    (showNotes ? 1 : 0) +
    (readOnly ? 0 : 1);

  return (
    <div className="space-y-2">
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[240px]">{t("purchases.itemTable.item")}</TableHead>
              <TableHead className="w-24">{t("purchases.itemTable.qty")}</TableHead>
              {showPrComparison ? <TableHead className="w-24">{t("purchases.itemTable.prQty")}</TableHead> : null}
              {showPrComparison ? <TableHead className="w-24">{t("purchases.itemTable.remaining")}</TableHead> : null}
              <TableHead className="w-20">{t("purchases.itemTable.unit")}</TableHead>
              {showPrice ? <TableHead className="w-28">{t("purchases.itemTable.price")}</TableHead> : null}
              {showPrice ? <TableHead className="w-28">{t("purchases.itemTable.subtotal")}</TableHead> : null}
              {showReceiving ? <TableHead className="w-28">{t("purchases.itemTable.received")}</TableHead> : null}
              {showNotes ? <TableHead>{t("purchases.itemTable.notes")}</TableHead> : null}
              {!readOnly ? <TableHead className="w-12" aria-label={t("purchases.shared.actions")} /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center py-8 text-muted-foreground">
                  {t("purchases.itemTable.empty")}
                </TableCell>
              </TableRow>
            ) : null}
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
                        <SelectValue placeholder={t("purchases.itemTable.selectItem")} />
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
                      type="text"
                      inputMode="decimal"
                      min={0}
                      className="h-9 w-20"
                      value={item.qty === 0 ? "0" : String(item.qty)}
                      onChange={(e) => updateRow(idx, "qty", sanitizeQuantityInput(e.target.value))}
                    />
                  )}
                </TableCell>
                {showPrComparison ? (
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{item.isFromPr ? (item.requestedQty ?? 0) : "-"}</span>
                  </TableCell>
                ) : null}
                {showPrComparison ? (
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{item.isFromPr ? (item.prRemainingQty ?? 0) : "-"}</span>
                  </TableCell>
                ) : null}
                <TableCell>
                  <span className="text-sm text-muted-foreground">{item.unit || "—"}</span>
                </TableCell>
                {showPrice ? (
                  <TableCell>
                    {readOnly ? (
                      <span className="text-sm">{item.price.toLocaleString()}</span>
                    ) : (
                      <Input
                        type="text"
                        inputMode="decimal"
                        min={0}
                        className="h-9 w-24"
                        value={item.price === 0 ? "0" : String(item.price)}
                        onChange={(e) => updateRow(idx, "price", sanitizeMoneyInput(e.target.value))}
                      />
                    )}
                  </TableCell>
                ) : null}
                {showPrice ? (
                  <TableCell>
                    <span className="text-sm font-medium">
                      {(item.qty * item.price).toLocaleString()}
                    </span>
                  </TableCell>
                ) : null}
                {showReceiving ? (
                  <TableCell>
                    <Input
                      type="text"
                      inputMode="decimal"
                      min={0}
                      className="h-9 w-24"
                      value={String(receivedQtyMap?.[item.inventoryItemId] ?? 0)}
                      onChange={(e) => onReceivedQtyChange?.(idx, sanitizeQuantityInput(e.target.value))}
                    />
                  </TableCell>
                ) : null}
                {showNotes ? (
                  <TableCell>
                    {readOnly ? (
                      <span className="text-sm text-muted-foreground">{item.notes}</span>
                    ) : (
                      <Input
                        className="h-9"
                        value={item.notes ?? ""}
                        onChange={(e) => updateRow(idx, "notes", e.target.value)}
                        placeholder={t("purchases.shared.optional")}
                      />
                    )}
                  </TableCell>
                ) : null}
                {!readOnly ? (
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRow(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!readOnly ? (
        <Button variant="outline" size="sm" onClick={addRow} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> {t("purchases.itemTable.addItem")}
        </Button>
      ) : null}
    </div>
  );
}
