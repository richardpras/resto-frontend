import type { KitchenReprintLine } from "@/components/orders/KitchenReprintModal";

/** Map POS/Cashier/Order items into kitchen reprint rows (supports offline local ids). */
export function toKitchenReprintLines(
  items: Array<{
    id?: string | number;
    orderItemId?: string | number | null;
    name: string;
    qty: number;
    notes?: string | null;
    category?: string | null;
    station?: string | null;
  }>,
): KitchenReprintLine[] {
  return items.map((it, index) => {
    const rawOrderItemId = it.orderItemId != null ? Number(it.orderItemId) : NaN;
    const orderItemId = Number.isFinite(rawOrderItemId) && rawOrderItemId > 0 ? rawOrderItemId : null;
    const lineKey =
      orderItemId != null
        ? `oi-${orderItemId}`
        : `line-${String(it.id ?? index)}-${index}`;
    return {
      lineKey,
      orderItemId,
      name: it.name,
      qty: it.qty,
      notes: it.notes ?? "",
      category: it.category ?? undefined,
      station: it.station ?? null,
    };
  });
}
