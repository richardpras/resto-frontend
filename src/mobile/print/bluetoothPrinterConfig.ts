import { getSecureValue, setSecureValue } from "@/mobile/secureStorage";

const KEY_PREFIX = "bluetoothPrinter.outlet.";

export function bluetoothPrinterStorageKey(outletId: number): string {
  return `${KEY_PREFIX}${outletId}`;
}

export async function getSavedBluetoothAddress(outletId: number | null): Promise<string | null> {
  if (!outletId || outletId < 1) return null;
  const raw = await getSecureValue(bluetoothPrinterStorageKey(outletId));
  const trimmed = raw?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export async function saveBluetoothAddress(outletId: number, address: string): Promise<void> {
  await setSecureValue(bluetoothPrinterStorageKey(outletId), address.trim());
}

export function isValidMacAddress(value: string): boolean {
  return /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(value.trim());
}
