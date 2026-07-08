import { Preferences } from "@capacitor/preferences";
import { isCapacitorNative } from "@/mobile/platform";

const SECURE_PREFIX = "resto.secure.";

async function nativeGet(key: string): Promise<string | null> {
  const { value } = await Preferences.get({ key: SECURE_PREFIX + key });
  return value ?? null;
}

async function nativeSet(key: string, value: string): Promise<void> {
  await Preferences.set({ key: SECURE_PREFIX + key, value });
}

async function nativeRemove(key: string): Promise<void> {
  await Preferences.remove({ key: SECURE_PREFIX + key });
}

function webGet(key: string): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(SECURE_PREFIX + key);
}

function webSet(key: string, value: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(SECURE_PREFIX + key, value);
}

function webRemove(key: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(SECURE_PREFIX + key);
}

export async function getSecureValue(key: string): Promise<string | null> {
  if (isCapacitorNative()) return nativeGet(key);
  return webGet(key);
}

export async function setSecureValue(key: string, value: string): Promise<void> {
  if (isCapacitorNative()) await nativeSet(key, value);
  else webSet(key, value);
}

export async function removeSecureValue(key: string): Promise<void> {
  if (isCapacitorNative()) await nativeRemove(key);
  else webRemove(key);
}
