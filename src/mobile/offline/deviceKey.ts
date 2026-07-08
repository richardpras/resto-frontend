import { getSecureValue, setSecureValue } from "@/mobile/secureStorage";

const DEVICE_KEY_PREFIX = "resto.terminal.device.";

function storageDeviceKey(outletId: number): string {
  return `${DEVICE_KEY_PREFIX}${outletId}`;
}

/** Stable per-outlet device identity — secure storage on native, localStorage on web. */
export async function getOrCreateDeviceKeyAsync(outletId: number): Promise<string> {
  const key = storageDeviceKey(outletId);
  let existing = await getSecureValue(key);
  if (!existing) {
    existing = crypto.randomUUID();
    await setSecureValue(key, existing);
  }
  return existing;
}

export function getOrCreateDeviceKeySync(outletId: number): string {
  if (typeof localStorage === "undefined") {
    return `ephemeral-${outletId}`;
  }
  const key = storageDeviceKey(outletId);
  let existing = localStorage.getItem(key);
  if (!existing) {
    existing = crypto.randomUUID();
    localStorage.setItem(key, existing);
  }
  return existing;
}
