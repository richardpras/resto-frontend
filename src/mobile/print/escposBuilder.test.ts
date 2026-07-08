import { describe, expect, it } from "vitest";
import { centerText, dividerLine, encodeEscPos, padLine, thermalWidthChars } from "@/mobile/print/escposBuilder";

describe("escposBuilder", () => {
  it("uses 32 columns for 58mm paper", () => {
    expect(thermalWidthChars("58mm")).toBe(32);
    expect(dividerLine("58mm")).toBe("-".repeat(32));
  });

  it("pads left and right on one line", () => {
    expect(padLine("Cash", "10.000", 20)).toBe("Cash          10.000");
  });

  it("centers text", () => {
    expect(centerText("POS", 10)).toBe("   POS");
  });

  it("encodes lines with cut command", () => {
    const bytes = encodeEscPos({
      lines: [{ text: "Hello", align: "center", bold: true }],
      cut: true,
    });
    expect(bytes.length).toBeGreaterThan(10);
    expect(bytes[bytes.length - 1]).toBe(0x01);
  });
});
