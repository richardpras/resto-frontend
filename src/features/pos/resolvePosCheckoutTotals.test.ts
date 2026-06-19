import { describe, expect, it } from "vitest";
import type { Order } from "@/stores/orderStore";
import { orderHasServerCheckoutDiscount, resolvePosCheckoutTotals } from "./resolvePosCheckoutTotals";

const baseOrder: Order = {
  id: "1",
  code: "ORD-1",
  source: "pos",
  orderType: "Takeaway",
  items: [],
  subtotal: 250000,
  tax: 22500,
  total: 247500,
  discountAmount: 25000,
  balanceDue: 247500,
  status: "confirmed",
  paymentStatus: "unpaid",
  payments: [],
  customerName: "Guest",
  customerPhone: "",
  tableNumber: "",
  createdAt: new Date(),
  promotion: {
    promotionId: "1",
    promotionCode: "SAVE10",
    promotionName: "Save 10%",
    discountType: "percentage_order",
    discountValue: 10,
    discountAmount: 25000,
  },
  promotionDiscount: 25000,
};

describe("resolvePosCheckoutTotals", () => {
  it("uses server totals when promotion is applied", () => {
    const result = resolvePosCheckoutTotals({
      cartSubtotal: 250000,
      clientTax: 25000,
      clientBaseTotal: 275000,
      clientDiscount: 0,
      appliedGiftCard: 0,
      appliedPointsValue: 0,
      order: baseOrder,
    });

    expect(result.source).toBe("server");
    expect(result.total).toBe(247500);
    expect(result.discount).toBe(25000);
    expect(result.tax).toBe(22500);
  });

  it("subtracts gift card from server balance", () => {
    const result = resolvePosCheckoutTotals({
      cartSubtotal: 250000,
      clientTax: 22500,
      clientBaseTotal: 247500,
      clientDiscount: 25000,
      appliedGiftCard: 50000,
      appliedPointsValue: 0,
      order: baseOrder,
    });

    expect(result.total).toBe(197500);
  });

  it("falls back to client totals without server discount", () => {
    const result = resolvePosCheckoutTotals({
      cartSubtotal: 100000,
      clientTax: 10000,
      clientBaseTotal: 110000,
      clientDiscount: 0,
      appliedGiftCard: 0,
      appliedPointsValue: 0,
      order: null,
    });

    expect(result.source).toBe("client");
    expect(result.total).toBe(110000);
  });

  it("detects server checkout discount from voucher", () => {
    expect(orderHasServerCheckoutDiscount({
      ...baseOrder,
      promotion: null,
      promotionDiscount: undefined,
      voucher: {
        id: "1",
        memberVoucherId: "2",
        voucherCode: "VIP",
        discountType: "percentage",
        discountValue: 10,
        discountAmount: 25000,
      },
      voucherDiscount: 25000,
    })).toBe(true);
  });
});
