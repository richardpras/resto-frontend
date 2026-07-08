import { beforeEach, describe, expect, it, vi } from "vitest";

const sunmiAvailable = vi.fn();
const bluetoothAvailable = vi.fn();
const sunmiSetOutlet = vi.fn();
const bluetoothSetOutlet = vi.fn();
const bluetoothReset = vi.fn();

vi.mock("@/mobile/platform", () => ({
  isNativeAndroid: () => true,
}));

vi.mock("./SunmiPrintAdapter", () => ({
  getSunmiPrintAdapter: () => ({
    isAvailable: sunmiAvailable,
    printDocument: vi.fn(),
  }),
}));

vi.mock("./BluetoothPrintAdapter", () => ({
  getBluetoothPrintAdapter: () => ({
    isAvailable: bluetoothAvailable,
    setOutletId: bluetoothSetOutlet,
    resetAvailability: bluetoothReset,
    printDocument: vi.fn(),
  }),
}));

describe("resolveNativePrintPort", () => {
  beforeEach(() => {
    vi.resetModules();
    sunmiAvailable.mockReset();
    bluetoothAvailable.mockReset();
    bluetoothSetOutlet.mockReset();
    bluetoothReset.mockReset();
  });

  it("prefers Sunmi when built-in printer is available", async () => {
    sunmiAvailable.mockResolvedValue(true);
    bluetoothAvailable.mockResolvedValue(true);

    const { resolveNativePrintPort } = await import("./resolvePrintPort");
    const port = await resolveNativePrintPort(7);
    expect(bluetoothSetOutlet).toHaveBeenCalledWith(7);
    expect(await port.isAvailable()).toBe(true);
    expect(sunmiAvailable).toHaveBeenCalled();
  });

  it("falls back to Bluetooth when Sunmi is unavailable", async () => {
    sunmiAvailable.mockResolvedValue(false);
    bluetoothAvailable.mockResolvedValue(true);

    const { resolveNativePrintPort } = await import("./resolvePrintPort");
    const port = await resolveNativePrintPort(3);
    expect(await port.isAvailable()).toBe(true);
    expect(bluetoothAvailable).toHaveBeenCalled();
  });

  it("detects printer kind", async () => {
    sunmiAvailable.mockResolvedValue(false);
    bluetoothAvailable.mockResolvedValue(true);

    const { detectNativePrinterKind } = await import("./resolvePrintPort");
    await expect(detectNativePrinterKind(1)).resolves.toBe("bluetooth");
  });
});
