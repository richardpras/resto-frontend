import { describe, expect, it } from "vitest";
import { ApiHttpError } from "@/lib/api-integration/client";
import { dedupeStockShortageLines, formatPosStockErrorMessage, parsePosStockError } from "./posStockError";

describe("posStockError", () => {
  it("parses structured insufficient stock payload", () => {
    const error = new ApiHttpError(422, "Some items are out of stock.", {
      message: "Some items are out of stock.",
      code: "INSUFFICIENT_STOCK",
      errors: {
        stock: [
          { menuItemId: 1, name: "Nasi Goreng", requested: 2, available: 0, outletId: 3 },
        ],
      },
      recoverable: true,
      orderId: 1024,
      orderCode: "POS-ABC123",
    });

    const parsed = parsePosStockError(error);
    expect(parsed?.orderCode).toBe("POS-ABC123");
    expect(parsed?.stock[0]?.name).toBe("Nasi Goreng");
    expect(formatPosStockErrorMessage(parsed!)).toContain("Nasi Goreng");
    expect(parsed?.stock).toHaveLength(1);
  });

  it("dedupes repeated menu item stock rows", () => {
    const deduped = dedupeStockShortageLines([
      { menuItemId: 1, name: "Nasi Goreng", requested: 1, available: 0, outletId: 3 },
      { menuItemId: 1, name: "Nasi Goreng", requested: 1, available: 0, outletId: 3 },
      { menuItemId: 8, name: "Latte", requested: 2, available: 0, outletId: 3 },
    ]);
    expect(deduped).toHaveLength(2);
  });
});
