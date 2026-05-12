import type { OrderPaymentPayload } from "@/lib/api-integration/endpoints";
import type { Order, OrderItem, SplitPerson } from "@/stores/orderStore";
import { toApiPaymentMethod } from "@/features/pos/paymentMethodUtils";

type AllocRow = { orderItemId: number; qty: number; amount: number };

/** Scale line allocation amounts so they sum to `paymentAmount` (tax/discount share) while keeping qty. */
function scaleAllocationRowsToPaymentAmount(allocations: AllocRow[], paymentAmount: number): AllocRow[] {
  const sum = allocations.reduce((s, a) => s + a.amount, 0);
  if (allocations.length === 0 || sum <= 0) return allocations;
  const target = Math.round(paymentAmount);
  if (Math.abs(sum - target) <= 0.02) return allocations;
  const scaled = allocations.map((a) => ({
    ...a,
    amount: Math.floor((a.amount * target) / sum),
  }));
  let diff = target - scaled.reduce((s, a) => s + a.amount, 0);
  const order = scaled.map((a, i) => ({ i, w: a.amount })).sort((a, b) => b.w - a.w);
  let k = 0;
  while (diff > 0 && order.length > 0) {
    const i = order[k % order.length].i;
    scaled[i] = { ...scaled[i], amount: scaled[i].amount + 1 };
    diff--;
    k++;
  }
  const asc = [...order].sort((a, b) => a.w - b.w);
  k = 0;
  while (diff < 0 && k < 10000) {
    const i = asc[k % asc.length].i;
    if (scaled[i].amount > 0) {
      scaled[i] = { ...scaled[i], amount: scaled[i].amount - 1 };
      diff++;
    }
    k++;
  }
  return scaled;
}

/**
 * Builds payment rows for split-bill settlement (POS new order or Cashier existing order).
 * `priceLines` are usually cart lines or order lines — same menu `id` keys as `person.items[].itemId`.
 */
export function buildSplitPaymentsPayload(
  order: Pick<Order, "items">,
  splitPersons: SplitPerson[],
  splitMethod: "equal" | "by-item",
  priceLines: Array<Pick<OrderItem, "id" | "price" | "qty">>,
): OrderPaymentPayload[] {
  const out: OrderPaymentPayload[] = [];
  for (const person of splitPersons) {
    for (const p of person.payments) {
      const base: OrderPaymentPayload = {
        method: toApiPaymentMethod(p.method),
        amount: p.amount,
        paidAt: p.paidAt instanceof Date ? p.paidAt.toISOString() : new Date(p.paidAt).toISOString(),
      };
      if (splitMethod === "by-item" && person.items.length > 0) {
        const allocations: { orderItemId: number; qty: number; amount: number }[] = [];
        for (const it of person.items) {
          const line = order.items.find((oi) => String(oi.id) === it.itemId);
          const ci = priceLines.find((c) => c.id === it.itemId);
          if (!line?.orderItemId || !ci) continue;
          const amount = ci.price * it.qty;
          allocations.push({
            orderItemId: Number(line.orderItemId),
            qty: it.qty,
            amount,
          });
        }
        let finalAlloc = allocations;
        const sumAlloc = allocations.reduce((s, a) => s + a.amount, 0);
        if (allocations.length > 0 && sumAlloc > 0 && Math.abs(sumAlloc - p.amount) > 0.02) {
          finalAlloc = scaleAllocationRowsToPaymentAmount(allocations, p.amount);
        }
        const sumFinal = finalAlloc.reduce((s, a) => s + a.amount, 0);
        if (finalAlloc.length > 0 && Math.abs(sumFinal - p.amount) <= 0.02) {
          out.push({ ...base, allocations: finalAlloc });
        } else {
          out.push(base);
        }
      } else {
        out.push(base);
      }
    }
  }
  return out;
}
