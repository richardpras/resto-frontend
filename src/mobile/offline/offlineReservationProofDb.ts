export type ReservationProofStatus = "queued" | "uploading" | "uploaded" | "failed";

export type ReservationProofRecord = {
  id: string;
  outletId: number;
  localRef: string;
  serverReservationId: number | null;
  fileName: string;
  mime: string;
  blob: Blob;
  status: ReservationProofStatus;
  errorMessage?: string | null;
  updatedAt: string;
};

const DB_NAME = "resto-offline-reservation-proofs-v1";
const STORE = "proofs";
const DB_VERSION = 1;

const memory = new Map<string, ReservationProofRecord>();

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
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("byOutlet", "outletId", { unique: false });
        store.createIndex("byLocalRef", "localRef", { unique: false });
      }
    };
  });
}

export async function saveReservationProof(record: ReservationProofRecord): Promise<void> {
  memory.set(record.id, record);
  if (!hasIndexedDb()) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
    tx.objectStore(STORE).put(record);
  });
}

export async function listReservationProofsForOutlet(outletId: number): Promise<ReservationProofRecord[]> {
  if (!hasIndexedDb()) {
    return Array.from(memory.values()).filter((r) => r.outletId === outletId);
  }
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const index = tx.objectStore(STORE).index("byOutlet");
    const req = index.getAll(outletId);
    req.onsuccess = () => {
      db.close();
      const rows = (req.result as ReservationProofRecord[]) ?? [];
      for (const row of rows) memory.set(row.id, row);
      resolve(rows);
    };
    req.onerror = () => reject(req.error ?? new Error("IDB read failed"));
  });
}

export async function listQueuedReservationProofs(outletId: number): Promise<ReservationProofRecord[]> {
  const rows = await listReservationProofsForOutlet(outletId);
  return rows.filter((r) => r.status === "queued" || r.status === "failed");
}

export async function deleteReservationProof(id: string): Promise<void> {
  memory.delete(id);
  if (!hasIndexedDb()) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error("IDB delete failed"));
    tx.objectStore(STORE).delete(id);
  });
}
