import type { InventoryItemApi, StockMovementApi } from "@/lib/api-integration/inventoryEndpoints";
import type { InventoryItem, StockMovement } from "@/stores/inventoryStore";

export function mapInventoryItemApiToStore(item: InventoryItemApi): InventoryItem {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    stock: item.stock,
    min: item.min,
    unit: item.unit,
    price: item.price ?? undefined,
    notes: item.notes ?? undefined,
  };
}

export function mapStockMovementApiToStore(row: StockMovementApi): StockMovement {
  return {
    id: String(row.id),
    inventoryItemId: String(row.inventory_item_id),
    outletId: row.outlet_id ?? null,
    inventoryItemName: row.inventory_item_name ?? null,
    type: row.type,
    quantity: row.quantity,
    sourceType: row.source_type,
    sourceId: row.source_id ?? null,
    createdAt: row.created_at ?? null,
  };
}
