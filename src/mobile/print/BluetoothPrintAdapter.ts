import { RestoBluetoothPrinter } from "@restohub/capacitor-bluetooth-printer";
import { encodeDocumentBase64 } from "./CloudPrintAdapter";
import type { EscPosDocument } from "./escposBuilder";
import { getSavedBluetoothAddress } from "./bluetoothPrinterConfig";
import type { PrintPort, PrintResult } from "./PrintPort";

export class BluetoothPrintAdapter implements PrintPort {
  private outletId: number | null = null;
  private available: boolean | null = null;

  setOutletId(outletId: number | null): void {
    if (this.outletId !== outletId) {
      this.outletId = outletId;
      this.available = null;
    }
  }

  resetAvailability(): void {
    this.available = null;
  }

  async isAvailable(): Promise<boolean> {
    if (this.available !== null) return this.available;
    try {
      const [{ enabled }, address] = await Promise.all([
        RestoBluetoothPrinter.isEnabled(),
        getSavedBluetoothAddress(this.outletId),
      ]);
      this.available = Boolean(enabled && address);
      return this.available;
    } catch {
      this.available = false;
      return false;
    }
  }

  async printDocument(document: EscPosDocument): Promise<PrintResult> {
    const address = await getSavedBluetoothAddress(this.outletId);
    if (!address) {
      return { ok: false, error: "Bluetooth printer not configured" };
    }

    try {
      const { granted } = await RestoBluetoothPrinter.checkPermissions();
      if (!granted) {
        const requested = await RestoBluetoothPrinter.requestPermissions();
        if (!requested.granted) {
          return { ok: false, error: "Bluetooth permission denied" };
        }
      }

      const { enabled } = await RestoBluetoothPrinter.isEnabled();
      if (!enabled) {
        return { ok: false, error: "Bluetooth is disabled" };
      }

      const base64 = await encodeDocumentBase64(document);
      await RestoBluetoothPrinter.printRaw({ address, data: base64 });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Bluetooth print failed",
      };
    }
  }
}

let bluetoothAdapter: BluetoothPrintAdapter | null = null;

export function getBluetoothPrintAdapter(): BluetoothPrintAdapter {
  if (!bluetoothAdapter) bluetoothAdapter = new BluetoothPrintAdapter();
  return bluetoothAdapter;
}

export async function ensureBluetoothPermissions(): Promise<boolean> {
  try {
    const { granted } = await RestoBluetoothPrinter.checkPermissions();
    if (granted) return true;
    const requested = await RestoBluetoothPrinter.requestPermissions();
    return requested.granted;
  } catch {
    return false;
  }
}

export async function listPairedBluetoothPrinters() {
  const ok = await ensureBluetoothPermissions();
  if (!ok) return [];
  const { devices } = await RestoBluetoothPrinter.listPairedDevices();
  return devices;
}
