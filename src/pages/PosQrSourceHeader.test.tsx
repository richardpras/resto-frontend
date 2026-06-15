import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("POS QR source header", () => {
  it("shows QR badge and direct POS fallback", () => {
    const source = readFileSync(resolve(process.cwd(), "src/pages/POS.tsx"), "utf8");
    expect(source).toContain('data-testid="pos-qr-order-badge"');
    expect(source).toContain('data-testid="pos-direct-source-badge"');
    expect(source).toContain("pos.directPos");
    expect(source).toContain("linkedOrderId");
  });
});
