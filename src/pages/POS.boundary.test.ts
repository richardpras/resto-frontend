import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Phase 2 regression: POS.tsx must orchestrate orders through orderStore actions,
 * never reaching into api-integration order endpoints directly. Menu/floor-table
 * fetches are out of Phase 2 scope and may continue using react-query.
 */
describe("POS.tsx ↔ orderStore boundary regression", () => {
  const posSource = readFileSync(
    path.resolve(__dirname, "POS.tsx"),
    "utf-8",
  );

  const forbiddenOrderApiSymbols = [
    "createOrder",
    "addOrderPayments",
    "updateOrder",
    "getOrder",
    "listOrders",
    "listOrdersWithMeta",
  ];

  for (const symbol of forbiddenOrderApiSymbols) {
    it(`does not import \`${symbol}\` from @/lib/api-integration`, () => {
      const fromApiIntegration = new RegExp(
        `import[^;]*\\b${symbol}\\b[^;]*from\\s+["'][^"']*api-integration[^"']*["']`,
        "s",
      );
      expect(posSource).not.toMatch(fromApiIntegration);
    });
  }

  it("calls store-level order actions instead of api-integration helpers", () => {
    expect(posSource).toMatch(/createOrderRemote\s*\(/);
    expect(posSource).toMatch(/addOrderPaymentsRemote\s*\(/);
    expect(posSource).toMatch(/fetchOrderRemote\s*\(/);
  });

  it("exposes order async lifecycle through useOrderStore", () => {
    expect(posSource).toMatch(/useOrderStore\(\(s\)\s*=>\s*s\.createOrderRemote\)/);
    expect(posSource).toMatch(/useOrderStore\(\(s\)\s*=>\s*s\.fetchOrder\)/);
    expect(posSource).toMatch(/useOrderStore\(\(s\)\s*=>\s*s\.addOrderPaymentsRemote\)/);
  });
});
