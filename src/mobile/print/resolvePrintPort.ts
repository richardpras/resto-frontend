import { isNativeAndroid } from "@/mobile/platform";
import { getBluetoothPrintAdapter } from "./BluetoothPrintAdapter";
import { getCloudPrintAdapter } from "./CloudPrintAdapter";
import { getSunmiPrintAdapter } from "./SunmiPrintAdapter";
import type { PrintPort } from "./PrintPort";

let cachedPort: PrintPort | null = null;
let cachedOutletId: number | null = null;

/**
 * Native Android print chain: Sunmi built-in → Bluetooth ESC/POS → unavailable stub.
 */
export async function resolveNativePrintPort(outletId: number | null): Promise<PrintPort> {
  if (cachedPort && cachedOutletId === outletId) {
    return cachedPort;
  }

  const bluetooth = getBluetoothPrintAdapter();
  bluetooth.setOutletId(outletId);

  if (!isNativeAndroid()) {
    cachedPort = getCloudPrintAdapter();
    cachedOutletId = outletId;
    return cachedPort;
  }

  const sunmi = getSunmiPrintAdapter();
  if (await sunmi.isAvailable()) {
    cachedPort = sunmi;
    cachedOutletId = outletId;
    return sunmi;
  }

  if (await bluetooth.isAvailable()) {
    cachedPort = bluetooth;
    cachedOutletId = outletId;
    return bluetooth;
  }

  cachedPort = bluetooth;
  cachedOutletId = outletId;
  return bluetooth;
}

export function resetNativePrintPortCache(): void {
  cachedPort = null;
  cachedOutletId = null;
  getSunmiPrintAdapter();
  getBluetoothPrintAdapter().resetAvailability();
}

export type NativePrinterKind = "sunmi" | "bluetooth" | "none";

export async function detectNativePrinterKind(outletId: number | null): Promise<NativePrinterKind> {
  if (!isNativeAndroid()) return "none";

  const sunmi = getSunmiPrintAdapter();
  if (await sunmi.isAvailable()) return "sunmi";

  const bluetooth = getBluetoothPrintAdapter();
  bluetooth.setOutletId(outletId);
  if (await bluetooth.isAvailable()) return "bluetooth";

  return "none";
}
