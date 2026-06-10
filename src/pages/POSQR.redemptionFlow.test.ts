import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const posSource = readFileSync(path.resolve(__dirname, "POS.tsx"), "utf-8");
const qrSource = readFileSync(path.resolve(__dirname, "QROrder.tsx"), "utf-8");

describe("POS + QR store-wired redemption flows", () => {
  it("wires POS loyalty redemption through loyalty store", () => {
    expect(posSource).toMatch(/useLoyaltyStore\(\(s\)\s*=>\s*s\.enqueueRedemption\)/);
    expect(posSource).toMatch(/applyPointsRedemption/);
    expect(posSource).toMatch(/redeemGiftCardForOrder/);
    expect(posSource).toMatch(/Gift Card \/ Store Credit/);
  });

  it("keeps QR flow cashier-gated without customer payment or redemption hooks", () => {
    expect(qrSource).not.toMatch(/useLoyaltyStore\(\(s\)\s*=>\s*s\.enqueueRedemption\)/);
    expect(qrSource).not.toMatch(/replayFingerprint:\s*`qr-/);
    expect(qrSource).not.toMatch(/Gift Card \/ Store Credit/);
    expect(qrSource).toMatch(/Status: Awaiting Cashier/);
    expect(qrSource).toMatch(/Payment is handled by cashier only\. You cannot pay from this screen\./);
    expect(qrSource).toMatch(/callCashier/);
  });
});
