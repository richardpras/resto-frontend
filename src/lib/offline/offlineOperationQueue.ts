/** Local durable queue for replayable POS operations (IndexedDB in browser, memory fallback when IDB absent). */

export type QueuedOfflineOperation = {
  id: string;
  outletId: number;
  fingerprint: string;
  operationType: string;
  payload: Record<string, unknown>;
  clientOccurredAt: string | null;
  createdAt: string;
  retryCount: number;
  lastConflictHint?: string | null;
};

const DB_NAME = "resto-offline-sync-v1";
const STORE = "operations";
const DB_VERSION = 1;

const memoryFallback: Map<string, QueuedOfflineOperation> = new Map();

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
        store.createIndex("by_outlet", "outletId", { unique: false });
      }
    };
  });
}

export async function queueOfflineOperationDraft(
  draft: Omit<QueuedOfflineOperation, "id" | "createdAt" | "retryCount">,
): Promise<void> {
  const id = crypto.randomUUID();
  const row: QueuedOfflineOperation = {
    ...draft,
    id,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  if (!hasIndexedDb()) {
    memoryFallback.set(`${draft.outletId}:${draft.fingerprint}`, row);
    return;
  }

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error("IDB transaction error"));
    tx.objectStore(STORE).put(row);
  });
}

export async function listQueuedOperationsForOutlet(outletId: number): Promise<QueuedOfflineOperation[]> {
  if (!hasIndexedDb()) {
    return [...memoryFallback.values()]
      .filter((op) => op.outletId === outletId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const idx = tx.objectStore(STORE).index("by_outlet");
    const req = idx.getAll(IDBKeyRange.only(outletId));
    req.onsuccess = () => {
      db.close();
      const rows = (req.result as QueuedOfflineOperation[]).slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      resolve(rows);
    };
    req.onerror = () => reject(req.error ?? new Error("IDB read failed"));
  });
}

async function deleteById(id: string): Promise<void> {
  if (!hasIndexedDb()) {
    for (const [key, val] of memoryFallback.entries()) {
      if (val.id === id) memoryFallback.delete(key);
    }
    return;
  }
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error("IDB transaction error"));
    tx.objectStore(STORE).delete(id);
  });
}

/** Remove queued rows whose fingerprints are listed (typically after confirmed server replay). */
export async function removeQueuedOperationsByFingerprints(outletId: number, fingerprints: Set<string>): Promise<void> {
  const rows = await listQueuedOperationsForOutlet(outletId);
  const targets = rows.filter((r) => fingerprints.has(r.fingerprint));
  for (const r of targets) {
    await deleteById(r.id);
  }
}

export function countMemoryQueueForTests(outletId: number): number {
  return [...memoryFallback.values()].filter((o) => o.outletId === outletId).length;
}

export function clearMemoryQueueForTests(): void {
  memoryFallback.clear();
}
