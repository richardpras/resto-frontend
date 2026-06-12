import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Order history source column", () => {
  it("shows source badge column in orders explorer", () => {
    const source = readFileSync(resolve(process.cwd(), "src/pages/OrdersExplorer.tsx"), "utf8");
    expect(source).toContain('data-testid="order-history-source"');
    expect(source).toContain("OrderSourceBadge");
  });
});

describe("Order source search", () => {
  it("supports QRO source code in order list search placeholder", () => {
    const source = readFileSync(resolve(process.cwd(), "src/pages/OrdersExplorer.tsx"), "utf8");
    expect(source).toContain("Search code or QRO source");
  });

  it("passes search param to QR order list API", () => {
    const source = readFileSync(resolve(process.cwd(), "src/lib/api-integration/qrOrderEndpoints.ts"), "utf8");
    expect(source).toContain('query.set("search"');
  });
});
