import type { QueuedOfflineOperation } from "@/lib/offline/offlineOperationQueue";

/**
 * Build a set of order keys that still have offline sync work pending.
 * Keys are stringified order ids, local:* refs, and offline order codes.
 */
export function collectPendingOrderSyncKeys(ops: QueuedOfflineOperation[]): Set<string> {
  const keys = new Set<string>();
  for (const op of ops) {
    const payload = op.payload ?? {};
    const orderId = payload.orderId;
    if (typeof orderId === "number" && orderId > 0) keys.add(String(orderId));
    if (typeof orderId === "string" && orderId.trim() !== "") keys.add(orderId.trim());

    const localCode = payload.localOrderCode;
    if (typeof localCode === "string" && localCode.trim() !== "") keys.add(localCode.trim());

    const clientRef = payload.clientLocalRef;
    if (typeof clientRef === "string" && clientRef.trim() !== "") keys.add(clientRef.trim());

    const code = payload.code;
    if (typeof code === "string" && code.trim() !== "") keys.add(code.trim());
  }
  return keys;
}

/** True when the order is local-only or has a matching queued offline op. */
export function isOrderPendingSync(
  order: { id: string | number; code?: string | null },
  pendingKeys: Set<string>,
): boolean {
  const id = String(order.id);
  if (id.startsWith("local:")) return true;
  if (pendingKeys.has(id)) return true;
  const code = typeof order.code === "string" ? order.code.trim() : "";
  return code !== "" && pendingKeys.has(code);
}
