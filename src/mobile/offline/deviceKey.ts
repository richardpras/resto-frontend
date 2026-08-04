import { getSecureValue, setSecureValue } from "@/mobile/secureStorage";
import { createDeviceUuid } from "@/mobile/offline/createDeviceUuid";

const DEVICE_KEY_PREFIX = "resto.terminal.device.";

function storageDeviceKey(outletId: number): string {
  return `${DEVICE_KEY_PREFIX}${outletId}`;
}

export { createDeviceUuid };

/** Stable per-outlet device identity — secure storage on native, localStorage on web. */
export async function getOrCreateDeviceKeyAsync(outletId: number): Promise<string> {
  const key = storageDeviceKey(outletId);
  let existing = await getSecureValue(key);
  if (!existing) {
    existing = createDeviceUuid();
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
    existing = createDeviceUuid();
    localStorage.setItem(key, existing);
  }
  return existing;
}
