/**
 * Local verifiers for screen lock when API is unreachable.
 * Never stores raw PIN/password — only keyed hashes per user id.
 */
import { getSecureValue, removeSecureValue, setSecureValue } from "@/mobile/secureStorage";

const PIN_PREFIX = "screen-pin-verifier.";
const PASSWORD_PREFIX = "screen-password-verifier.";

function pinKey(userId: string): string {
  return `${PIN_PREFIX}${userId}`;
}

function passwordKey(userId: string): string {
  return `${PASSWORD_PREFIX}${userId}`;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashMaterial(payload: string): Promise<string> {
  const data = new TextEncoder().encode(payload);
  if (typeof crypto !== "undefined" && crypto.subtle?.digest) {
    const digest = await crypto.subtle.digest("SHA-256", data);
    return `sha256:${toHex(digest)}`;
  }
  let h = 2166136261;
  for (let i = 0; i < payload.length; i += 1) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fnv:${(h >>> 0).toString(16)}`;
}

/** Deterministic local verifier material (not the server bcrypt hash). */
export async function hashScreenPinForLocalUnlock(userId: string, pin: string): Promise<string> {
  return hashMaterial(`resto-screen-pin:v1:${userId}:${pin}`);
}

export async function hashPasswordForLocalUnlock(userId: string, password: string): Promise<string> {
  return hashMaterial(`resto-screen-password:v1:${userId}:${password}`);
}

export async function cacheScreenPinVerifier(userId: string, pin: string): Promise<void> {
  if (!userId || pin.length < 4) return;
  const hash = await hashScreenPinForLocalUnlock(userId, pin);
  await setSecureValue(pinKey(userId), hash);
}

/** Cached at login so lock screen can unlock offline even before the first PIN unlock. */
export async function cachePasswordVerifier(userId: string, password: string): Promise<void> {
  if (!userId || !password) return;
  const hash = await hashPasswordForLocalUnlock(userId, password);
  await setSecureValue(passwordKey(userId), hash);
}

export async function clearScreenPinVerifier(userId: string | null | undefined): Promise<void> {
  if (!userId) return;
  await removeSecureValue(pinKey(userId));
}

export async function clearPasswordVerifier(userId: string | null | undefined): Promise<void> {
  if (!userId) return;
  await removeSecureValue(passwordKey(userId));
}

export async function clearAllLocalUnlockVerifiers(userId: string | null | undefined): Promise<void> {
  await clearScreenPinVerifier(userId);
  await clearPasswordVerifier(userId);
}

export async function verifyScreenPinLocally(userId: string, pin: string): Promise<boolean> {
  if (!userId || pin.length < 4) return false;
  const stored = await getSecureValue(pinKey(userId));
  if (!stored) return false;
  const hash = await hashScreenPinForLocalUnlock(userId, pin);
  return stored === hash;
}

export async function verifyPasswordLocally(userId: string, password: string): Promise<boolean> {
  if (!userId || !password) return false;
  const stored = await getSecureValue(passwordKey(userId));
  if (!stored) return false;
  const hash = await hashPasswordForLocalUnlock(userId, password);
  return stored === hash;
}

export async function hasCachedScreenPinVerifier(userId: string): Promise<boolean> {
  if (!userId) return false;
  const stored = await getSecureValue(pinKey(userId));
  return typeof stored === "string" && stored.length > 0;
}

export async function hasCachedPasswordVerifier(userId: string): Promise<boolean> {
  if (!userId) return false;
  const stored = await getSecureValue(passwordKey(userId));
  return typeof stored === "string" && stored.length > 0;
}
