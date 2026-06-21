import { describe, expect, it } from "vitest";
import { buildPrinterPayload, normalizePrinterForForm } from "./printerFormUtils";
import type { Printer } from "@/domain/settingsDomainTypes";

const base: Printer = {
  id: "p1",
  name: "Kitchen",
  printerType: "kitchen",
  connection: "lan",
  outletId: 1,
};

describe("normalizePrinterForForm", () => {
  it("maps shared connection from bluetoothDevice and ip", () => {
    const result = normalizePrinterForForm({
      ...base,
      connection: "shared",
      bluetoothDevice: "\\\\server\\share",
      ip: "EPSON-TM-T82",
    });
    expect(result.sharePath).toBe("\\\\server\\share");
    expect(result.sharePrinterName).toBe("EPSON-TM-T82");
  });

  it("maps usb connection from bluetoothDevice", () => {
    const result = normalizePrinterForForm({
      ...base,
      connection: "usb",
      bluetoothDevice: "USB001",
    });
    expect(result.devicePath).toBe("USB001");
  });

  it("extracts bluetooth MAC from bluetoothDevice", () => {
    const result = normalizePrinterForForm({
      ...base,
      connection: "bluetooth",
      bluetoothDevice: "AA:BB:CC:DD:EE:FF",
    });
    expect(result.bluetoothAddress).toBe("AA:BB:CC:DD:EE:FF");
  });

  it("splits lan host:port into ip and port", () => {
    const result = normalizePrinterForForm({
      ...base,
      connection: "lan",
      ip: "192.168.1.10:9100",
    });
    expect(result.ip).toBe("192.168.1.10");
    expect(result.port).toBe(9100);
  });
});

describe("buildPrinterPayload", () => {
  it("round-trips shared fields to storage columns", () => {
    const payload = buildPrinterPayload({
      ...base,
      connection: "shared",
      sharePath: "\\\\server\\share",
      sharePrinterName: "ReceiptPrinter",
    });
    expect(payload.bluetoothDevice).toBe("\\\\server\\share");
    expect(payload.ip).toBe("ReceiptPrinter");
  });

  it("round-trips thermalPaperWidth", () => {
    const payload = buildPrinterPayload({
      ...base,
      thermalPaperWidth: "80mm",
    });
    expect(payload.thermalPaperWidth).toBe("80mm");
  });
});

describe("normalizePrinterForForm thermalPaperWidth", () => {
  it("defaults missing thermalPaperWidth to 58mm", () => {
    const result = normalizePrinterForForm(base);
    expect(result.thermalPaperWidth).toBe("58mm");
  });
});
