import { getSecureValue, setSecureValue } from "@/mobile/secureStorage";

const KEY_PREFIX = "bluetoothPrinter.outlet.";
const AUTOCUT_PREFIX = "bluetoothPrinter.autoCut.outlet.";

export type BluetoothPrinterConfig = {
  address: string;
  autoCut: boolean;
};

export function bluetoothPrinterStorageKey(outletId: number): string {
  return `${KEY_PREFIX}${outletId}`;
}

function bluetoothAutoCutStorageKey(outletId: number): string {
  return `${AUTOCUT_PREFIX}${outletId}`;
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

/** Default true — printers without a cutter ignore ESC/POS cut commands. */
export async function getBluetoothAutoCut(outletId: number | null): Promise<boolean> {
  if (!outletId || outletId < 1) return true;
  const raw = await getSecureValue(bluetoothAutoCutStorageKey(outletId));
  if (raw == null || raw.trim() === "") return true;
  return raw.trim() !== "0" && raw.trim().toLowerCase() !== "false";
}

export async function saveBluetoothAutoCut(outletId: number, autoCut: boolean): Promise<void> {
  await setSecureValue(bluetoothAutoCutStorageKey(outletId), autoCut ? "1" : "0");
}

export function isValidMacAddress(value: string): boolean {
  return /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(value.trim());
}
