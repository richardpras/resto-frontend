import { describe, expect, it } from "vitest";
import { formatPreviewColumns, resolveReceiptPreviewWidthCh } from "./receiptPreviewUtils";
import type { Printer } from "@/domain/settingsDomainTypes";

const printers: Printer[] = [
  {
    id: "p1",
    name: "Cashier",
    printerType: "cashier",
    connection: "lan",
    outletId: 1,
    thermalPaperWidth: "58mm",
    printerProfileId: 1,
  },
  {
    id: "p2",
    name: "Wide Cashier",
    printerType: "cashier",
    connection: "lan",
    outletId: 2,
    thermalPaperWidth: "80mm",
    printerProfileId: 2,
  },
];

describe("resolveReceiptPreviewWidthCh", () => {
  it("returns 32 for 58mm cashier printer", () => {
    expect(resolveReceiptPreviewWidthCh(1, printers)).toBe(32);
  });

  it("returns 42 for 80mm cashier printer", () => {
    expect(resolveReceiptPreviewWidthCh(2, printers)).toBe(42);
  });

  it("defaults to 32 when no cashier printer", () => {
    expect(resolveReceiptPreviewWidthCh(99, printers)).toBe(32);
  });
});

describe("formatPreviewColumns", () => {
  it("pads left and right values to width", () => {
    const line = formatPreviewColumns("Order", "ORD-1", 20);
    expect(line.length).toBe(20);
    expect(line.startsWith("Order")).toBe(true);
    expect(line.endsWith("ORD-1")).toBe(true);
  });
});
