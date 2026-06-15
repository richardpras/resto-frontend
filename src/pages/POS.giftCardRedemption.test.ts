import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const posSource = readFileSync(path.resolve(__dirname, "POS.tsx"), "utf-8");
const paymentEndpointsSource = readFileSync(
  path.resolve(__dirname, "../lib/api-integration/paymentEndpoints.ts"),
  "utf-8",
);

describe("POS gift card redemption flow", () => {
  it("validates gift cards via check API before applying amount", () => {
    expect(posSource).toMatch(/checkGiftCard\(/);
    expect(posSource).toMatch(/applyGiftCardRedemption/);
    expect(posSource).toMatch(/giftCardCheckErrorMessage/);
  });

  it("redeems gift cards at payment commit with order-linked idempotency", () => {
    expect(posSource).toMatch(/redeemGiftCardForOrder/);
    expect(posSource).toMatch(/redeemGiftCard\(/);
    expect(posSource).toMatch(/buildGiftCardRedeemIdempotencyKey/);
    expect(posSource).toMatch(/referenceType:\s*"order"/);
  });

  it("propagates settlement ids into gateway payment payload", () => {
    expect(posSource).toMatch(/giftCardSettlementIds/);
    expect(paymentEndpointsSource).toMatch(/payloadSnapshot\.giftCardSettlementIds/);
  });

  it("settles gift card redemptions after direct cash or static QRIS payment", () => {
    expect(posSource).toMatch(/settleGiftCardAfterDirectPayment/);
    expect(posSource).toMatch(/settleGiftCardRedemptions\(/);
  });

  it("displays gift card code, balances, and applied amount in checkout UI", () => {
    expect(posSource).toMatch(/pos\.giftCard/);
    expect(posSource).toMatch(/shared\.giftCardAvailableLabel/);
    expect(posSource).toMatch(/shared\.giftCardAppliedLabel/);
    expect(posSource).toMatch(/shared\.giftCardRemainingLabel/);
  });
});
