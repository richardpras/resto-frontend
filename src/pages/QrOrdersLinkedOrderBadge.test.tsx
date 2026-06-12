import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("QrOrders linked order badge", () => {
  it("renders linked POS order line in queue cards", () => {
    const source = readFileSync(resolve(process.cwd(), "src/pages/QROrdersList.tsx"), "utf8");
    expect(source).toContain('data-testid="qr-order-linked-pos"');
    expect(source).toContain("Linked POS Order:");
    expect(source).toContain("Open POS Bill");
  });
});
