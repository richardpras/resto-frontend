import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("Inventory.tsx store boundary regression", () => {
  const source = readFileSync(path.resolve(__dirname, "Inventory.tsx"), "utf-8");

  it("does not import inventory APIs directly in page layer", () => {
    expect(source).not.toMatch(/from\s+["']@\/lib\/api["']/);
    expect(source).not.toMatch(/from\s+["']@\/lib\/api-integration\/inventoryEndpoints["']/);
  });

  it("calls inventory store orchestration actions", () => {
    expect(source).toMatch(/useInventoryStore\(\(s\)\s*=>\s*s\.fetchInventory\)/);
    expect(source).toMatch(/useInventoryStore\(\(s\)\s*=>\s*s\.fetchStockMovements\)/);
    expect(source).toMatch(/useInventoryStore\(\(s\)\s*=>\s*s\.createItemRemote\)/);
    expect(source).toMatch(/useInventoryStore\(\(s\)\s*=>\s*s\.updateItemRemote\)/);
    expect(source).toMatch(/useInventoryStore\(\(s\)\s*=>\s*s\.deleteItemRemote\)/);
  });
});
