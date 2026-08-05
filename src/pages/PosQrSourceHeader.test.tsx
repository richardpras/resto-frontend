import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("POS QR source header", () => {
  it("shows QR badge when linked from QR order, without direct POS chrome bar", () => {
    const source = readFileSync(resolve(process.cwd(), "src/pages/POS.tsx"), "utf8");
    expect(source).toContain('data-testid="pos-qr-order-badge"');
    expect(source).toContain("linkedOrderId");
    expect(source).not.toContain('data-testid="pos-direct-source-badge"');
  });
});
