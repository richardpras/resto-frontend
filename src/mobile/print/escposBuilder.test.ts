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
    // Ends with partial cut GS V 1
    expect(bytes[bytes.length - 1]).toBe(0x01);
    expect(bytes[bytes.length - 2]).toBe(0x56);
    expect(bytes[bytes.length - 3]).toBe(0x1d);
  });

  it("omits cut when disabled", () => {
    const bytes = encodeEscPos({
      lines: [{ text: "Hello" }],
      cut: false,
    });
    const asArray = Array.from(bytes);
    const hasPartialCut =
      asArray.some((_, i) => asArray[i] === 0x1d && asArray[i + 1] === 0x56 && asArray[i + 2] === 0x01);
    expect(hasPartialCut).toBe(false);
  });
});
