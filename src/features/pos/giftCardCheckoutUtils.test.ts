import { describe, expect, it } from "vitest";
import {
  buildGiftCardRedeemIdempotencyKey,
  giftCardCheckErrorMessage,
  resolveGiftCardApplyAmount,
} from "./giftCardCheckoutUtils";

describe("giftCardCheckoutUtils", () => {
  it("builds stable redeem idempotency keys per order and code", () => {
    expect(buildGiftCardRedeemIdempotencyKey("42", " gc-abc ")).toBe("pos-gift-redeem-42-GC-ABC");
  });

  it("caps applied amount by available balance and order total", () => {
    expect(resolveGiftCardApplyAmount(0, 50000, 11000)).toBe(11000);
    expect(resolveGiftCardApplyAmount(20000, 15000, 11000)).toBe(11000);
    expect(resolveGiftCardApplyAmount(8000, 15000, 11000)).toBe(8000);
  });

  it("maps issuance validation errors for operator messaging", () => {
    expect(giftCardCheckErrorMessage({ status: "expired", balanceAmount: 1000 })).toMatch(/expired/i);
    expect(giftCardCheckErrorMessage({ status: "inactive", balanceAmount: 1000 })).toMatch(/not active/i);
    expect(giftCardCheckErrorMessage({ status: "active", balanceAmount: 0 })).toMatch(/insufficient/i);
    expect(giftCardCheckErrorMessage({ status: "active", balanceAmount: 5000 })).toBeNull();
  });
});
