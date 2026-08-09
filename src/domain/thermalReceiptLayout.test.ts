import { describe, expect, it } from "vitest";
import {
  buildCustomerReceiptLines,
  buildSettingsReceiptPreviewSnapshot,
  formatThermalColumns,
  formatThermalMoney,
} from "./thermalReceiptLayout";

describe("thermalReceiptLayout", () => {
  it("formats money like settings preview (en-US 2 decimals)", () => {
    expect(formatThermalMoney(15000)).toBe("15,000.00");
    expect(formatThermalMoney(-5000)).toBe("-5,000.00");
  });

  it("pads columns to width", () => {
    const line = formatThermalColumns("Order", "ORD-1", 20);
    expect(line.length).toBe(20);
    expect(line.startsWith("Order")).toBe(true);
    expect(line.endsWith("ORD-1")).toBe(true);
  });

  it("matches settings preview structure", () => {
    const lines = buildCustomerReceiptLines(
      buildSettingsReceiptPreviewSnapshot({
        outletName: "Mountain Cafe",
        header: "Welcome",
        footer: "Thank you",
        showTaxBreakdown: true,
      }),
      32,
    );
    const texts = lines.map((l) => l.text);
    expect(texts).toContain("Mountain Cafe");
    expect(texts).toContain("Welcome");
    const titleIdx = texts.indexOf("Mountain Cafe");
    const headerIdx = texts.indexOf("Welcome");
    expect(titleIdx).toBeGreaterThanOrEqual(0);
    expect(headerIdx).toBe(titleIdx + 1);
    expect(texts.slice(headerIdx + 1).some((t) => !t.trim())).toBe(true);
    expect(texts).toContain("Item A");
    expect(texts.some((t) => t.includes("1 x 15,000.00"))).toBe(true);
    expect(texts.some((t) => t.includes("Promo (SAVE10)"))).toBe(true);
    expect(texts.some((t) => t.includes("PB1 10%"))).toBe(true);
    expect(texts.some((t) => t.startsWith("TOTAL"))).toBe(true);
    expect(texts).toContain("Thank you");
  });
});
