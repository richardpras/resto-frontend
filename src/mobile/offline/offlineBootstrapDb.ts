/** IndexedDB cache for POS offline bootstrap snapshots. */

import type { PosSessionApi } from "@/lib/api-integration/posSessionEndpoints";

export type OfflineBootstrapSnapshot = {
  generatedAt: string;
  schemaVersion: number;
  outletId: number;
  merchant: Record<string, unknown>;
  system: Record<string, unknown>;
  outletTaxRules: unknown[];
  menuItems: { data: unknown[]; meta: Record<string, unknown> };
  tables: unknown[];
  checkoutMethods: unknown[];
  receiptSettings: Record<string, unknown>;
  thermalPaperWidth: "58mm" | "80mm";
  /** Present from schemaVersion >= 2 */
  posSession?: PosSessionApi | null;
  defaultCashFloat?: number | null;
  /** Phase 2+ optional caches */
  openOrders?: unknown[];
  inventoryItems?: unknown[];
  activeStocktake?: unknown | null;
};

const DB_NAME = "resto-offline-bootstrap-v1";
const STORE = "snapshots";
const DB_VERSION = 1;

const memoryFallback = new Map<number, OfflineBootstrapSnapshot>();

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

export async function saveOfflineBootstrap(snapshot: OfflineBootstrapSnapshot): Promise<void> {
  memoryFallback.set(snapshot.outletId, snapshot);
  if (!hasIndexedDb()) return;

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error("IDB transaction error"));
    tx.objectStore(STORE).put(snapshot, snapshot.outletId);
  });
}

export async function loadOfflineBootstrap(outletId: number): Promise<OfflineBootstrapSnapshot | null> {
  if (memoryFallback.has(outletId)) {
    return memoryFallback.get(outletId) ?? null;
  }
  if (!hasIndexedDb()) return null;

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(outletId);
    req.onsuccess = () => {
      db.close();
      const row = (req.result as OfflineBootstrapSnapshot | undefined) ?? null;
      if (row) memoryFallback.set(outletId, row);
      resolve(row);
    };
    req.onerror = () => reject(req.error ?? new Error("IDB read failed"));
  });
}

export async function clearOfflineBootstrap(outletId: number): Promise<void> {
  memoryFallback.delete(outletId);
  if (!hasIndexedDb()) return;

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error("IDB transaction error"));
    tx.objectStore(STORE).delete(outletId);
  });
}

/** Patch menu item availability inside a cached bootstrap snapshot (sold-out). */
export async function patchBootstrapMenuAvailability(
  outletId: number,
  menuItemId: number | string,
  available: boolean,
): Promise<OfflineBootstrapSnapshot | null> {
  const snap = await loadOfflineBootstrap(outletId);
  if (!snap) return null;
  const data = Array.isArray(snap.menuItems?.data) ? [...snap.menuItems.data] : [];
  const idStr = String(menuItemId);
  let changed = false;
  const nextData = data.map((row) => {
    if (!row || typeof row !== "object") return row;
    const id = (row as { id?: unknown }).id;
    if (String(id) !== idStr) return row;
    changed = true;
    return { ...(row as Record<string, unknown>), available };
  });
  if (!changed) return snap;
  const next: OfflineBootstrapSnapshot = {
    ...snap,
    menuItems: { ...snap.menuItems, data: nextData },
  };
  await saveOfflineBootstrap(next);
  return next;
}

export function isBootstrapFresh(snapshot: OfflineBootstrapSnapshot | null, maxAgeHours = 24): boolean {
  if (!snapshot?.generatedAt) return false;
  const generated = new Date(snapshot.generatedAt).getTime();
  if (!Number.isFinite(generated)) return false;
  return Date.now() - generated < maxAgeHours * 60 * 60 * 1000;
}
