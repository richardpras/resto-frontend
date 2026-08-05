import { createDeviceUuid } from "@/mobile/offline/createDeviceUuid";
import { getSecureValue, setSecureValue } from "@/mobile/secureStorage";

const MEMBER_MAP_PREFIX = "resto.offline.member.map.";

export function createLocalMemberId(): string {
  return `local-member:${createDeviceUuid()}`;
}

export function isLocalMemberId(id: string): boolean {
  return id.startsWith("local-member:");
}

export async function saveLocalMemberMapping(localMemberRef: string, serverMemberId: number): Promise<void> {
  await setSecureValue(MEMBER_MAP_PREFIX + localMemberRef, String(serverMemberId));
}

export async function loadLocalMemberMapping(localMemberRef: string): Promise<number | null> {
  const raw = await getSecureValue(MEMBER_MAP_PREFIX + localMemberRef);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}
