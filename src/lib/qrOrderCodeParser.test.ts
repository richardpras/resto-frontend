import { describe, expect, it } from "vitest";
import { parseQrOrderCode } from "./qrOrderCodeParser";

describe("parseQrOrderCode", () => {
  it("parses standard QRO- codes", () => {
    expect(parseQrOrderCode("QRO-ABCDEF1234")).toBe("QRO-ABCDEF1234");
  });

  it("parses codes without hyphen after QRO", () => {
    expect(parseQrOrderCode("QROABCDEF1234")).toBe("QRO-ABCDEF1234");
  });

  it("parses order URLs", () => {
    expect(parseQrOrderCode("https://example.com/qr/order/QRO-TESTCODE01")).toBe("QRO-TESTCODE01");
  });

  it("parses demo lifecycle order codes", () => {
    expect(parseQrOrderCode("DEMO-SUNSET-QRO-ADJUSTED")).toBe("DEMO-SUNSET-QRO-ADJUSTED");
    expect(parseQrOrderCode("https://example.com/qr/order/DEMO-MOUNTAIN-QRO-COOKING")).toBe(
      "DEMO-MOUNTAIN-QRO-COOKING",
    );
  });

  it("rejects invalid input", () => {
    expect(parseQrOrderCode("")).toBeNull();
    expect(parseQrOrderCode("QR-123")).toBeNull();
  });
});
