import type { ReservationMenuItemApi } from "@/lib/api-integration/reservationEndpoints";

export type ReservationMenuCacheRecord = {
  outletId: number;
  items: ReservationMenuItemApi[];
  updatedAt: string;
};

const DB_NAME = "resto-offline-reservation-menu-v1";
const STORE = "menus";
const DB_VERSION = 1;

const memory = new Map<number, ReservationMenuCacheRecord>();

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

export async function saveReservationMenuCache(
  outletId: number,
  items: ReservationMenuItemApi[],
): Promise<void> {
  const record: ReservationMenuCacheRecord = {
    outletId,
    items,
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

export async function loadReservationMenuCache(
  outletId: number,
): Promise<ReservationMenuCacheRecord | null> {
  if (memory.has(outletId)) return memory.get(outletId) ?? null;
  if (!hasIndexedDb()) return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(outletId);
    req.onsuccess = () => {
      db.close();
      const row = (req.result as ReservationMenuCacheRecord | undefined) ?? null;
      if (row) memory.set(outletId, row);
      resolve(row);
    };
    req.onerror = () => reject(req.error ?? new Error("IDB read failed"));
  });
}
