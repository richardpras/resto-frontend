import { describe, expect, it } from "vitest";
import {
  filterMenuCostRows,
  paginateRows,
  sortMenuCostRows,
  type MenuCostRow,
} from "./useMenuCostCatalog";

const sampleRows: MenuCostRow[] = [
  {
    menuItemId: "1",
    menuItemName: "Burger",
    category: "Mains",
    sellingPrice: 100000,
    foodCost: 40000,
    contributionMargin: 60000,
    marginPercent: 60,
    classification: "HIGH",
    lastUpdated: null,
  },
  {
    menuItemId: "2",
    menuItemName: "Salad",
    category: "Sides",
    sellingPrice: 50000,
    foodCost: 30000,
    contributionMargin: 20000,
    marginPercent: 40,
    classification: "MEDIUM",
    lastUpdated: null,
  },
  {
    menuItemId: "3",
    menuItemName: "Soup",
    category: "Mains",
    sellingPrice: 45000,
    foodCost: 35000,
    contributionMargin: 10000,
    marginPercent: 22,
    classification: "LOW",
    lastUpdated: null,
  },
];

describe("menu cost catalog helpers", () => {
  it("filters by search and category", () => {
    const filtered = filterMenuCostRows(sampleRows, "bur", "Mains");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.menuItemId).toBe("1");
  });

  it("sorts by margin percent descending", () => {
    const sorted = sortMenuCostRows(sampleRows, "marginPercent", true);
    expect(sorted.map((r) => r.menuItemId)).toEqual(["1", "2", "3"]);
  });

  it("paginates rows", () => {
    const page = paginateRows(sampleRows, 2, 2);
    expect(page.total).toBe(3);
    expect(page.lastPage).toBe(2);
    expect(page.rows).toHaveLength(1);
    expect(page.rows[0]?.menuItemId).toBe("3");
  });
});
