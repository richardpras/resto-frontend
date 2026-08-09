import type { ReservationApi } from "@/lib/api-integration/reservationEndpoints";

export type ReservationListCacheRecord = {
  outletId: number;
  rows: ReservationApi[];
  updatedAt: string;
};

const DB_NAME = "resto-offline-reservations-v1";
const STORE = "lists";
const DB_VERSION = 1;

const memory = new Map<number, ReservationListCacheRecord>();

function hasIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("indexedDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

export async function saveReservationListCache(
  outletId: number,
  rows: ReservationApi[],
): Promise<void> {
  const record: ReservationListCacheRecord = {
    outletId,
    rows,
    updatedAt: new Date().toISOString(),
  };
  memory.set(outletId, record);
  if (!hasIndexedDb()) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
    tx.objectStore(STORE).put(record, outletId);
  });
}

export async function loadReservationListCache(outletId: number): Promise<ReservationListCacheRecord | null> {
  if (memory.has(outletId)) return memory.get(outletId) ?? null;
  if (!hasIndexedDb()) return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(outletId);
    req.onsuccess = () => {
      db.close();
      const row = (req.result as ReservationListCacheRecord | undefined) ?? null;
      if (row) memory.set(outletId, row);
      resolve(row);
    };
    req.onerror = () => reject(req.error ?? new Error("IDB read failed"));
  });
}

/** Merge server/cache rows with unsynced local (negative id) rows. */
export function mergeReservationRowsWithLocal(
  serverOrCached: ReservationApi[],
  localPending: ReservationApi[],
): ReservationApi[] {
  const locals = localPending.filter((r) => r.id < 0);
  const serverIds = new Set(serverOrCached.map((r) => r.id));
  const keepLocals = locals.filter((r) => !serverIds.has(r.id));
  return [...keepLocals, ...serverOrCached];
}

export async function upsertLocalReservationInCache(
  outletId: number,
  row: ReservationApi,
): Promise<void> {
  const existing = (await loadReservationListCache(outletId))?.rows ?? [];
  const without = existing.filter((r) => r.id !== row.id);
  await saveReservationListCache(outletId, [row, ...without]);
}

export async function replaceLocalReservationInCache(
  outletId: number,
  localNumericId: number,
  serverRow: ReservationApi,
): Promise<void> {
  const existing = (await loadReservationListCache(outletId))?.rows ?? [];
  const without = existing.filter((r) => r.id !== localNumericId && r.id !== serverRow.id);
  await saveReservationListCache(outletId, [serverRow, ...without]);
}
