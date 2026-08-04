/** Persist daily stocktake count drafts for offline outlets. */

export type StocktakeDraftRecord = {
  outletId: number;
  businessDate: string;
  sessionId: number | null;
  draft: Record<string, { openingQty: string; closingQty: string }>;
  updatedAt: string;
};

const DB_NAME = "resto-offline-stocktake-v1";
const STORE = "drafts";
const DB_VERSION = 1;

function key(outletId: number, businessDate: string): string {
  return `${outletId}:${businessDate}`;
}

const memory = new Map<string, StocktakeDraftRecord>();

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

export async function saveStocktakeDraft(record: StocktakeDraftRecord): Promise<void> {
  const k = key(record.outletId, record.businessDate);
  memory.set(k, record);
  if (!hasIndexedDb()) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
    tx.objectStore(STORE).put(record, k);
  });
}

export async function loadStocktakeDraft(
  outletId: number,
  businessDate: string,
): Promise<StocktakeDraftRecord | null> {
  const k = key(outletId, businessDate);
  if (memory.has(k)) return memory.get(k) ?? null;
  if (!hasIndexedDb()) return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(k);
    req.onsuccess = () => {
      db.close();
      const row = (req.result as StocktakeDraftRecord | undefined) ?? null;
      if (row) memory.set(k, row);
      resolve(row);
    };
    req.onerror = () => reject(req.error ?? new Error("IDB read failed"));
  });
}
