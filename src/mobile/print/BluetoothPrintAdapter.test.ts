import { beforeEach, describe, expect, it, vi } from "vitest";

const printRaw = vi.fn();
const isEnabled = vi.fn();
const checkPermissions = vi.fn();
const requestPermissions = vi.fn();

vi.mock("@restohub/capacitor-bluetooth-printer", () => ({
  RestoBluetoothPrinter: {
    isEnabled,
    checkPermissions,
    requestPermissions,
    printRaw,
  },
}));

vi.mock("./bluetoothPrinterConfig", () => ({
  getSavedBluetoothAddress: vi.fn(),
}));

describe("BluetoothPrintAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isEnabled.mockResolvedValue({ enabled: true });
    checkPermissions.mockResolvedValue({ granted: true });
    printRaw.mockResolvedValue(undefined);
  });

  it("reports unavailable without saved address", async () => {
    const { getSavedBluetoothAddress } = await import("./bluetoothPrinterConfig");
    vi.mocked(getSavedBluetoothAddress).mockResolvedValue(null);

    const { getBluetoothPrintAdapter } = await import("./BluetoothPrintAdapter");
    const adapter = getBluetoothPrintAdapter();
    adapter.setOutletId(5);
    await expect(adapter.isAvailable()).resolves.toBe(false);
  });

  it("prints ESC/POS document to saved Bluetooth address", async () => {
    const { getSavedBluetoothAddress } = await import("./bluetoothPrinterConfig");
    vi.mocked(getSavedBluetoothAddress).mockResolvedValue("AA:BB:CC:DD:EE:FF");

    const { getBluetoothPrintAdapter } = await import("./BluetoothPrintAdapter");
    const adapter = getBluetoothPrintAdapter();
    adapter.setOutletId(5);
    adapter.resetAvailability();

    const result = await adapter.printDocument({ lines: [{ text: "TEST" }] });
    expect(result).toEqual({ ok: true });
    expect(printRaw).toHaveBeenCalledWith(
      expect.objectContaining({ address: "AA:BB:CC:DD:EE:FF", data: expect.any(String) }),
    );
  });
});
