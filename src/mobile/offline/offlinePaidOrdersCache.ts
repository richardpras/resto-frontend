/** IndexedDB cache of paid outlet orders (rolling 24h) for offline Orders detail + reprint. */

export type CachedPaidOrder = Record<string, unknown> & {
  id: string | number;
  paymentStatus?: string;
  outletId?: number | null;
  createdAt?: string | null;
  /** Client stamp when written/hydrated into this cache. */
  cachedAt?: string;
  /** Best-effort paid timestamp (last payment paidAt when known). */
  paidAt?: string | null;
};

export const PAID_ORDERS_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const DB_NAME = "resto-offline-paid-orders-v1";
const STORE = "paid_orders";
const DB_VERSION = 1;

const memory = new Map<number, CachedPaidOrder[]>();

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

function paymentPaidAt(order: CachedPaidOrder): string | null {
  if (typeof order.paidAt === "string" && order.paidAt.trim() !== "") return order.paidAt;
  const payments = Array.isArray(order.payments) ? order.payments : [];
  let latest: string | null = null;
  for (const raw of payments) {
    if (!raw || typeof raw !== "object") continue;
    const paidAt = (raw as { paidAt?: unknown }).paidAt;
    if (typeof paidAt !== "string" || paidAt.trim() === "") continue;
    if (!latest || Date.parse(paidAt) > Date.parse(latest)) latest = paidAt;
  }
  return latest;
}

/** Age key for rolling 24h prune: paidAt ?? createdAt ?? cachedAt. */
export function paidOrderRetentionMs(order: CachedPaidOrder, nowMs = Date.now()): number | null {
  const candidates = [
    paymentPaidAt(order),
    typeof order.createdAt === "string" ? order.createdAt : null,
    typeof order.cachedAt === "string" ? order.cachedAt : null,
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const ms = Date.parse(raw);
    if (Number.isFinite(ms)) return nowMs - ms;
  }
  return null;
}

export function isPaidOrderWithinRetention(
  order: CachedPaidOrder,
  maxAgeMs = PAID_ORDERS_MAX_AGE_MS,
  nowMs = Date.now(),
): boolean {
  const age = paidOrderRetentionMs(order, nowMs);
  if (age == null) return true;
  return age <= maxAgeMs;
}

function pruneRows(
  rows: CachedPaidOrder[],
  maxAgeMs = PAID_ORDERS_MAX_AGE_MS,
  nowMs = Date.now(),
): CachedPaidOrder[] {
  return rows.filter((row) => isPaidOrderWithinRetention(row, maxAgeMs, nowMs));
}

function withCacheMeta(order: CachedPaidOrder, cachedAt = new Date().toISOString()): CachedPaidOrder {
  const paidAt = paymentPaidAt(order);
  return {
    ...order,
    cachedAt,
    paidAt: paidAt ?? order.paidAt ?? null,
  };
}

export async function saveCachedPaidOrders(outletId: number, orders: CachedPaidOrder[]): Promise<void> {
  const pruned = pruneRows(orders);
  memory.set(outletId, pruned);
  if (!hasIndexedDb()) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
    tx.objectStore(STORE).put(pruned, outletId);
  });
}

export async function loadCachedPaidOrders(outletId: number): Promise<CachedPaidOrder[]> {
  let rows: CachedPaidOrder[];
  if (memory.has(outletId)) {
    rows = memory.get(outletId) ?? [];
  } else if (!hasIndexedDb()) {
    rows = [];
  } else {
    const db = await openDb();
    rows = await new Promise<CachedPaidOrder[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(outletId);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as CachedPaidOrder[] | undefined) ?? []);
      };
      req.onerror = () => reject(req.error ?? new Error("IDB read failed"));
    });
  }
  const pruned = pruneRows(rows);
  if (pruned.length !== rows.length) {
    await saveCachedPaidOrders(outletId, pruned);
  } else {
    memory.set(outletId, pruned);
  }
  return pruned;
}

export async function upsertCachedPaidOrder(outletId: number, order: CachedPaidOrder): Promise<void> {
  const rows = await loadCachedPaidOrders(outletId);
  const id = String(order.id);
  const next = [withCacheMeta(order), ...rows.filter((r) => String(r.id) !== id)];
  await saveCachedPaidOrders(outletId, next);
}

export async function pruneCachedPaidOrders(
  outletId: number,
  maxAgeMs = PAID_ORDERS_MAX_AGE_MS,
): Promise<CachedPaidOrder[]> {
  const rows = await loadCachedPaidOrders(outletId);
  const pruned = pruneRows(rows, maxAgeMs);
  if (pruned.length !== rows.length) {
    await saveCachedPaidOrders(outletId, pruned);
  }
  return pruned;
}

/** Merge server-hydrated paid rows; server/newer cachedAt wins per id; then prune 24h. */
export async function mergeHydratedPaidOrders(
  outletId: number,
  serverOrders: CachedPaidOrder[],
): Promise<CachedPaidOrder[]> {
  const existing = await loadCachedPaidOrders(outletId).catch(() => [] as CachedPaidOrder[]);
  const byId = new Map<string, CachedPaidOrder>();
  for (const row of existing) {
    byId.set(String(row.id), row);
  }
  const stamp = new Date().toISOString();
  for (const row of serverOrders) {
    byId.set(String(row.id), withCacheMeta(row, stamp));
  }
  const merged = Array.from(byId.values());
  await saveCachedPaidOrders(outletId, merged);
  return pruneRows(merged);
}

export async function findCachedPaidOrder(
  outletId: number,
  orderId: string,
): Promise<CachedPaidOrder | null> {
  const rows = await loadCachedPaidOrders(outletId);
  return rows.find((r) => String(r.id) === orderId) ?? null;
}
