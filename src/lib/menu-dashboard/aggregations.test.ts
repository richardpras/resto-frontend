import { describe, expect, it } from "vitest";
import { aggregateQuadrants, healthBandLabel } from "./aggregations";
import type { EngineeringMatrixItem } from "@/lib/api-integration/menuDashboardEndpoints";

const items: EngineeringMatrixItem[] = [
  {
    menuItemId: "1",
    menuItemName: "Star Burger",
    quantitySold: 10,
    popularityPercent: 30,
    contributionMargin: 20000,
    marginPercent: 50,
    classification: "STAR",
  },
  {
    menuItemId: "2",
    menuItemName: "Dog Soup",
    quantitySold: 2,
    popularityPercent: 5,
    contributionMargin: 5000,
    marginPercent: 25,
    classification: "DOG",
  },
];

describe("menu dashboard aggregations", () => {
  it("aggregates quadrant stats", () => {
    const result = aggregateQuadrants(items);
    expect(result.STAR.count).toBe(1);
    expect(result.DOG.count).toBe(1);
    expect(result.STAR.totalMargin).toBe(200000);
    expect(result.DOG.totalMargin).toBe(10000);
  });

  it("maps health band labels", () => {
    expect(healthBandLabel("excellent")).toBe("Excellent");
    expect(healthBandLabel("critical")).toBe("Critical");
  });
});
