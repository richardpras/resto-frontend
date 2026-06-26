import { describe, expect, it } from "vitest";
import { computeOrderTax } from "./computeOrderTax";
import type { Tax } from "@/domain/settingsDomainTypes";

const baseRule: Tax = {
  id: "tax-default",
  name: "PB1",
  type: "percentage",
  value: 10,
  applyDineIn: true,
  applyTakeaway: true,
  inclusive: false,
  status: "active",
};

describe("computeOrderTax", () => {
  it("returns zero tax when applyTax is false", () => {
    const result = computeOrderTax({
      rules: [baseRule],
      orderType: "Dine-in",
      subtotal: 100000,
      discount: 0,
      applyTax: false,
    });
    expect(result.tax).toBe(0);
    expect(result.total).toBe(100000);
  });

  it("applies exclusive percentage tax after discount", () => {
    const result = computeOrderTax({
      rules: [baseRule],
      orderType: "Dine-in",
      subtotal: 100000,
      discount: 10000,
      applyTax: true,
    });
    expect(result.tax).toBe(9000);
    expect(result.total).toBe(99000);
  });

  it("stacks multiple matching taxes", () => {
    const rules: Tax[] = [
      baseRule,
      { ...baseRule, id: "tax-service", name: "Service", value: 5 },
    ];
    const result = computeOrderTax({
      rules,
      orderType: "Dine-in",
      subtotal: 100000,
      discount: 0,
      applyTax: true,
    });
    expect(result.tax).toBe(15500);
    expect(result.taxLines).toHaveLength(2);
  });

  it("respects effective date window", () => {
    const result = computeOrderTax({
      rules: [{ ...baseRule, effectiveFrom: "2099-01-01" }],
      orderType: "Dine-in",
      subtotal: 100000,
      discount: 0,
      applyTax: true,
      asOfDate: "2026-06-22",
    });
    expect(result.tax).toBe(0);
  });
});
