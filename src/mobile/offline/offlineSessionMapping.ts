import { getSecureValue, setSecureValue } from "@/mobile/secureStorage";

const SESSION_MAP_PREFIX = "resto.offline.session.map.";

export function createLocalSessionId(): string {
  return `local-session:${crypto.randomUUID()}`;
}

export function isLocalSessionId(id: number | string): boolean {
  if (typeof id === "string") return id.startsWith("local-session:");
  return id < 0;
}

export async function saveLocalSessionMapping(localSessionRef: string, serverSessionId: number): Promise<void> {
  await setSecureValue(SESSION_MAP_PREFIX + localSessionRef, String(serverSessionId));
}

export async function loadLocalSessionMapping(localSessionRef: string): Promise<number | null> {
  const raw = await getSecureValue(SESSION_MAP_PREFIX + localSessionRef);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Negative numeric ids used in optimistic PosSessionApi.id while offline. */
export function localSessionNumericId(localRef: string): number {
  let hash = 0;
  for (let i = 0; i < localRef.length; i += 1) {
    hash = (hash * 31 + localRef.charCodeAt(i)) | 0;
  }
  const n = Math.abs(hash) % 1_000_000_000;
  return -(n === 0 ? 1 : n);
}
