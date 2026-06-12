import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Open Bills source badge", () => {
  it("uses OrderSourceBadge in cashier open bill rows", () => {
    const source = readFileSync(resolve(process.cwd(), "src/pages/Cashier.tsx"), "utf8");
    expect(source).toContain('data-testid="open-bill-source-badge"');
    expect(source).toContain("OrderSourceBadge");
    expect(source).toContain("order.orderSource");
  });
});
