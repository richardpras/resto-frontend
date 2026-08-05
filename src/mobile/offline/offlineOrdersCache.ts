/** IndexedDB cache of outlet open/unpaid orders for offline Cashier & Orders. */

export type CachedOpenOrder = Record<string, unknown> & {
  id: string | number;
  paymentStatus?: string;
  outletId?: number | null;
};

function isLocalOrderId(orderId: string): boolean {
  return orderId.startsWith("local:");
}

function isOpenPaymentStatus(status: unknown): boolean {
  return status === "unpaid" || status === "partial";
}

const DB_NAME = "resto-offline-orders-v1";
const STORE = "open_orders";
const DB_VERSION = 1;

const memory = new Map<number, CachedOpenOrder[]>();

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

export async function saveCachedOpenOrders(outletId: number, orders: CachedOpenOrder[]): Promise<void> {
  memory.set(outletId, orders);
  if (!hasIndexedDb()) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
    tx.objectStore(STORE).put(orders, outletId);
  });
}

export async function loadCachedOpenOrders(outletId: number): Promise<CachedOpenOrder[]> {
  if (memory.has(outletId)) return memory.get(outletId) ?? [];
  if (!hasIndexedDb()) return [];
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(outletId);
    req.onsuccess = () => {
      db.close();
      const rows = (req.result as CachedOpenOrder[] | undefined) ?? [];
      memory.set(outletId, rows);
      resolve(rows);
    };
    req.onerror = () => reject(req.error ?? new Error("IDB read failed"));
  });
}

export async function upsertCachedOpenOrder(outletId: number, order: CachedOpenOrder): Promise<void> {
  const rows = await loadCachedOpenOrders(outletId);
  const id = String(order.id);
  const next = [order, ...rows.filter((r) => String(r.id) !== id)];
  await saveCachedOpenOrders(outletId, next);
}

/** Keep unsynced `local:*` open bills when refreshing cache from the server. */
export async function mergeServerOpenOrdersWithLocalCache(
  outletId: number,
  serverOrders: CachedOpenOrder[],
): Promise<CachedOpenOrder[]> {
  const existing = await loadCachedOpenOrders(outletId).catch(() => [] as CachedOpenOrder[]);
  const byId = new Map<string, CachedOpenOrder>();
  for (const row of serverOrders) {
    byId.set(String(row.id), row);
  }
  for (const row of existing) {
    const id = String(row.id);
    if (!isLocalOrderId(id) || !isOpenPaymentStatus(row.paymentStatus)) continue;
    if (!byId.has(id)) byId.set(id, row);
  }
  const merged = Array.from(byId.values());
  await saveCachedOpenOrders(outletId, merged);
  return merged;
}
