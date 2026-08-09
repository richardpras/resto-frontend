import { createDeviceUuid } from "@/mobile/offline/createDeviceUuid";
import { getSecureValue, setSecureValue } from "@/mobile/secureStorage";

const RSV_MAP_PREFIX = "resto.offline.rsv.map.";
const RSV_BY_ID_PREFIX = "resto.offline.rsv.byid.";

export type ReservationMapEntry = {
  localRef: string;
  localNumericId: number;
  reservationCode: string;
  serverReservationId?: number;
  linkedOrderId?: number | null;
};

function mapKey(localRef: string): string {
  return RSV_MAP_PREFIX + localRef;
}

function byIdKey(localNumericId: number): string {
  return RSV_BY_ID_PREFIX + String(localNumericId);
}

export function createLocalReservationRef(): string {
  return `local:rsv-${createDeviceUuid()}`;
}

export function isLocalReservationRef(value: string): boolean {
  return value.startsWith("local:rsv-");
}

/** Negative temp ids for optimistic calendar rows (never collide with server ids). */
export function createLocalReservationNumericId(): number {
  return -Math.abs(Date.now() % 1_000_000_000) - Math.floor(Math.random() * 1000);
}

export function isLocalReservationNumericId(id: number): boolean {
  return Number.isFinite(id) && id < 0;
}

export async function saveLocalReservationMapping(entry: ReservationMapEntry): Promise<void> {
  await setSecureValue(mapKey(entry.localRef), JSON.stringify(entry));
  await setSecureValue(byIdKey(entry.localNumericId), entry.localRef);
}

export async function loadLocalReservationMapping(localRef: string): Promise<ReservationMapEntry | null> {
  const raw = await getSecureValue(mapKey(localRef));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ReservationMapEntry;
  } catch {
    return null;
  }
}

export async function loadLocalReservationMappingByNumericId(
  localNumericId: number,
): Promise<ReservationMapEntry | null> {
  const localRef = await getSecureValue(byIdKey(localNumericId));
  if (!localRef) return null;
  return loadLocalReservationMapping(localRef);
}

export async function updateLocalReservationMappingServerIds(
  localRef: string,
  serverReservationId: number,
  linkedOrderId: number | null,
): Promise<ReservationMapEntry | null> {
  const existing = await loadLocalReservationMapping(localRef);
  if (!existing) return null;
  const next: ReservationMapEntry = {
    ...existing,
    serverReservationId,
    linkedOrderId,
  };
  await saveLocalReservationMapping(next);
  return next;
}
