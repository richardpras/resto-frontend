// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const posSource = readFileSync(resolve(__dirname, "POS.tsx"), "utf8");

describe("POS promo cleanup (PROMOTIONS-CLEANUP-01)", () => {
  it("does not import client promotionStore", () => {
    expect(posSource).not.toContain("promotionStore");
    expect(posSource).not.toContain("getBestPromo");
    expect(posSource).not.toContain("getApplicablePromos");
    expect(posSource).not.toContain("manualPromo");
    expect(posSource).not.toContain("showPromoList");
  });

  it("still supports loyalty voucher discount in totals", () => {
    expect(posSource).toContain("voucherDiscount");
    expect(posSource).toContain("PosDiscountModal");
    expect(posSource).toContain("pos.voucherDiscount");
  });

  it("does not send client promo discountAmount on order create", () => {
    expect(posSource).toContain("buildCartPayload(cart, subtotal, tax, total, 0,");
    expect(posSource).not.toMatch(/buildCartPayload\([^)]*,\s*discount,/);
  });
});
