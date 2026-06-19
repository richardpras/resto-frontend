import { describe, expect, it } from "vitest";
import { sanitizeMoneyInput, sanitizeQuantityInput } from "./numericInput";

describe("sanitizeQuantityInput", () => {
  it("normalizes leading zeros", () => {
    expect(sanitizeQuantityInput("02")).toBe(2);
    expect(sanitizeQuantityInput("007")).toBe(7);
  });

  it("handles empty and zero", () => {
    expect(sanitizeQuantityInput("")).toBe(0);
    expect(sanitizeQuantityInput("0")).toBe(0);
  });

  it("accepts decimals", () => {
    expect(sanitizeQuantityInput("10.5")).toBe(10.5);
  });
});

describe("sanitizeMoneyInput", () => {
  it("normalizes leading zeros", () => {
    expect(sanitizeMoneyInput("02")).toBe(2);
    expect(sanitizeMoneyInput("05000")).toBe(5000);
  });

  it("handles empty", () => {
    expect(sanitizeMoneyInput("")).toBe(0);
  });

  it("accepts decimals", () => {
    expect(sanitizeMoneyInput("10.5")).toBe(10.5);
  });
});
