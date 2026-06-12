import { ApiHttpError } from "@/lib/api-integration/client";

export type StockShortageLine = {
  menuItemId: number;
  name: string;
  requested: number;
  available: number;
  outletId: number;
};

export type PosStockErrorPayload = {
  code: "INSUFFICIENT_STOCK";
  message: string;
  stock: StockShortageLine[];
  recoverable: boolean;
  orderId: number | null;
  orderCode: string | null;
};

export function dedupeStockShortageLines(stock: StockShortageLine[]): StockShortageLine[] {
  const byMenuItem = new Map<number, StockShortageLine>();
  for (const row of stock) {
    const existing = byMenuItem.get(row.menuItemId);
    if (!existing || row.available < existing.available) {
      byMenuItem.set(row.menuItemId, row);
    }
  }
  return Array.from(byMenuItem.values());
}

export function parsePosStockError(error: unknown): PosStockErrorPayload | null {
  if (!(error instanceof ApiHttpError) || error.status !== 422) {
    return null;
  }
  const body = error.body;
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const record = body as Record<string, unknown>;
  if (record.code !== "INSUFFICIENT_STOCK") {
    return null;
  }
  const stockRaw = (record.errors as { stock?: unknown } | undefined)?.stock;
  const stock = Array.isArray(stockRaw)
    ? stockRaw
        .map((row): StockShortageLine | null => {
          if (typeof row !== "object" || row === null) return null;
          const item = row as Record<string, unknown>;
          return {
            menuItemId: Number(item.menuItemId ?? 0),
            name: String(item.name ?? "Item"),
            requested: Number(item.requested ?? 0),
            available: Number(item.available ?? 0),
            outletId: Number(item.outletId ?? 0),
          };
        })
        .filter((row): row is StockShortageLine => row !== null)
    : [];

  return {
    code: "INSUFFICIENT_STOCK",
    message: typeof record.message === "string" ? record.message : "Some items are out of stock.",
    stock: dedupeStockShortageLines(stock),
    recoverable: record.recoverable !== false,
    orderId: typeof record.orderId === "number" ? record.orderId : null,
    orderCode: typeof record.orderCode === "string" ? record.orderCode : null,
  };
}

export function formatPosStockErrorMessage(payload: PosStockErrorPayload): string {
  const lines = payload.stock.map(
    (row) => `- ${row.name}: requested ${row.requested}, available ${row.available}`,
  );
  const header = "Cannot complete payment.\n\nSome items are out of stock:";
  const footer =
    "\n\nPlease remove item, reduce quantity, or disable stock enforcement in Settings.";
  return `${header}\n${lines.join("\n")}${footer}`;
}

export function formatOpenBillRecoveryMessage(orderCode: string): string {
  return `Order ${orderCode} has been saved as an open bill. Please review and continue payment from Open Bills.`;
}
