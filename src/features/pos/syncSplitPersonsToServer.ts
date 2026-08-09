import type { OrderSplitApi, OrderSplitItemPayload, OrderSplitPayload } from "@/lib/api-integration/endpoints";
import { apiRequest } from "@/lib/api-integration/client";
import type { Order, OrderItem, SplitPerson } from "@/stores/orderStore";

export type SplitSyncPersonPayload = {
  splitType: OrderSplitPayload["splitType"];
  label: string;
  items: Array<OrderSplitItemPayload & { clientItemId?: string }>;
};

function resolveProvisionalOrderItemId(line: OrderItem, idx: number): number {
  const n = line.orderItemId != null ? Number(line.orderItemId) : NaN;
  if (Number.isFinite(n) && n > 0) return n;
  // Offline local lines have no server order_item id yet — provisional negative id + clientItemId.
  return -(idx + 1);
}

/**
 * Build server split item rows from UI split persons.
 * Equal split: allocate each order line proportionally by person totalDue share.
 * Offline-safe: lines without orderItemId still emit rows with clientItemId for terminal replay.
 */
export function buildSplitSyncPersons(
  order: Pick<Order, "items" | "subtotal" | "balanceDue" | "total">,
  splitPersons: SplitPerson[],
  splitMethod: "equal" | "by-item",
): SplitSyncPersonPayload[] {
  const balanceDue = order.balanceDue ?? order.total;
  const indexedLines = order.items.map((line, idx) => ({
    line,
    idx,
    orderItemId: resolveProvisionalOrderItemId(line, idx),
  }));

  if (splitMethod === "by-item") {
    return splitPersons.map((person) => ({
      splitType: "by_item" as const,
      label: person.label,
      items: person.items
        .map((it) => {
          const hit = indexedLines.find(({ line }) => String(line.id) === it.itemId);
          if (!hit) return null;
          return {
            orderItemId: hit.orderItemId > 0 ? hit.orderItemId : 0,
            clientItemId: String(hit.line.id),
            qty: it.qty,
            amount: Math.round(hit.line.price * it.qty * 100) / 100,
          };
        })
        .filter((row): row is OrderSplitItemPayload & { clientItemId: string } => row !== null),
    }));
  }

  const personTotals = splitPersons.map((p) => Math.max(0, p.totalDue));
  const sumPersonTotals = personTotals.reduce((s, v) => s + v, 0) || balanceDue || 1;

  return splitPersons.map((person, personIdx) => {
    const share = personTotals[personIdx] / sumPersonTotals;
    const items: Array<OrderSplitItemPayload & { clientItemId?: string }> = [];

    for (const { line, orderItemId } of indexedLines) {
      const lineTotal = line.price * line.qty;
      const amount = Math.round(lineTotal * share * 100) / 100;
      const qty = line.qty > 0 ? Math.round(line.qty * share * 1000) / 1000 : 0;
      if (amount <= 0 || qty <= 0) continue;
      items.push({
        orderItemId: orderItemId > 0 ? orderItemId : 0,
        clientItemId: String(line.id),
        qty,
        amount,
      });
    }

    if (items.length === 0 && indexedLines.length > 0) {
      const first = indexedLines[0];
      items.push({
        orderItemId: first.orderItemId > 0 ? first.orderItemId : 0,
        clientItemId: String(first.line.id),
        qty: 1,
        amount: Math.max(0.01, person.totalDue),
      });
    }

    return {
      splitType: "by_person" as const,
      label: person.label,
      items,
    };
  });
}

export async function syncOrderSplitsRemote(
  orderId: string,
  persons: SplitSyncPersonPayload[],
  options?: { idempotencyKey?: string; expectedUpdatedAt?: string },
): Promise<OrderSplitApi[]> {
  const res = await apiRequest<{ data: OrderSplitApi[] }>(`/orders/${orderId}/splits/sync`, {
    method: "POST",
    body: JSON.stringify({
      persons,
      idempotencyKey: options?.idempotencyKey,
      expectedUpdatedAt: options?.expectedUpdatedAt,
    }),
  });
  return res.data ?? [];
}

/**
 * Sync UI split persons to server order_splits and attach serverSplitId per person.
 */
export async function syncSplitPersonsToServer(
  orderId: string,
  order: Pick<Order, "items" | "subtotal" | "balanceDue" | "total">,
  splitPersons: SplitPerson[],
  splitMethod: "equal" | "by-item",
  options?: { idempotencyKey?: string },
): Promise<SplitPerson[]> {
  const persons = buildSplitSyncPersons(order, splitPersons, splitMethod);
  const splits = await syncOrderSplitsRemote(orderId, persons, {
    idempotencyKey: options?.idempotencyKey ?? `split-sync-${orderId}-${Date.now()}`,
  });

  return splitPersons.map((person, idx) => ({
    ...person,
    serverSplitId: splits[idx]?.id,
  }));
}

export function buildSplitPaymentForPerson(
  person: SplitPerson,
  method: string,
  amount: number,
  order: Pick<Order, "items">,
  splitMethod: "equal" | "by-item",
  paidAt: string,
): import("@/lib/api-integration/endpoints").OrderPaymentPayload {
  const base = {
    method,
    amount,
    paidAt,
    orderSplitId: person.serverSplitId,
  };

  // Offline local splits use negative ids; by-item allocations need server orderItemId.
  if (splitMethod !== "by-item" || person.items.length === 0 || person.serverSplitId == null || person.serverSplitId === 0) {
    return base;
  }

  const allocations = person.items
    .map((it) => {
      const line = order.items.find((oi) => String(oi.id) === it.itemId);
      if (!line?.orderItemId) return null;
      const orderItemId = Number(line.orderItemId);
      if (!Number.isFinite(orderItemId) || orderItemId < 1) return null;
      return {
        orderItemId,
        qty: it.qty,
        amount: Math.round(line.price * it.qty * 100) / 100,
      };
    })
    .filter((row): row is { orderItemId: number; qty: number; amount: number } => row !== null);

  if (allocations.length === 0) {
    return base;
  }

  return { ...base, allocations };
}
