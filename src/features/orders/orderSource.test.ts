import { describe, expect, it } from "vitest";
import { formatOrderSourceLabel, orderSourceBadgeClass } from "./orderSource";

describe("orderSource helpers", () => {
  it("formats QR order source with code", () => {
    expect(
      formatOrderSourceLabel({
        type: "qr_order",
        label: "QR Order",
        code: "QRO-ABC123",
        id: 12,
      }),
    ).toBe("QR Order QRO-ABC123");
  });

  it("formats direct POS source", () => {
    expect(
      formatOrderSourceLabel({
        type: "direct_pos",
        label: "Direct POS",
        code: null,
        id: null,
      }),
    ).toBe("Direct POS");
  });

  it("applies badge classes by type", () => {
    expect(orderSourceBadgeClass("qr_order")).toContain("primary");
    expect(orderSourceBadgeClass("direct_pos")).toContain("muted");
  });
});
