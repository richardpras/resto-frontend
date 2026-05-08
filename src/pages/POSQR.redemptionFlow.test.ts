import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const posSource = readFileSync(path.resolve(__dirname, "POS.tsx"), "utf-8");
const qrSource = readFileSync(path.resolve(__dirname, "QROrder.tsx"), "utf-8");

describe("POS + QR store-wired redemption flows", () => {
  it("wires POS loyalty redemption through loyalty store", () => {
    expect(posSource).toMatch(/useLoyaltyStore\(\(s\)\s*=>\s*s\.enqueueRedemption\)/);
    expect(posSource).toMatch(/applyPointsRedemption/);
    expect(posSource).toMatch(/Gift Card \/ Store Credit/);
  });

  it("wires QR loyalty redemption through loyalty store", () => {
    expect(qrSource).toMatch(/useLoyaltyStore\(\(s\)\s*=>\s*s\.enqueueRedemption\)/);
    expect(qrSource).toMatch(/replayFingerprint:\s*`qr-/);
    expect(qrSource).toMatch(/Gift Card \/ Store Credit/);
  });
});
