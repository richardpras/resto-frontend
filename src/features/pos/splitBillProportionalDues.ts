import type { SplitPerson } from "@/stores/orderStore";

/** Sum of line price × qty for the whole order/cart (pre-tax menu subtotal). */
export function catalogSubtotalFromLines(lines: Array<{ id: string; price: number; qty: number }>): number {
  return lines.reduce((s, l) => s + l.price * l.qty, 0);
}

/** Each person's assigned line subtotals (pre-tax). */
export function personItemSubtotals(
  persons: Array<Pick<SplitPerson, "items">>,
  lines: Array<{ id: string; price: number; qty: number }>,
): number[] {
  return persons.map((p) =>
    p.items.reduce((s, it) => {
      const line = lines.find((l) => String(l.id) === it.itemId);
      return s + (line ? line.price * it.qty : 0);
    }, 0),
  );
}

/**
 * Split `total` into integer shares proportional to `weights` (largest remainder).
 * Sum of result equals `total` when `sum(weights) > 0`.
 */
export function allocateProportionalIntegerShares(weights: number[], total: number): number[] {
  const W = weights.reduce((a, b) => a + b, 0);
  const target = Math.round(total);
  if (target <= 0 || W <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (w / W) * target);
  const floors = exact.map((x) => Math.floor(x));
  let diff = target - floors.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac);
  const out = [...floors];
  let k = 0;
  while (diff > 0 && order.length > 0) {
    out[order[k % order.length].i] += 1;
    diff--;
    k++;
  }
  const asc = [...order].sort((a, b) => a.frac - b.frac);
  k = 0;
  while (diff < 0 && k < 10000) {
    const i = asc[k % asc.length].i;
    if (out[i] > 0) {
      out[i] -= 1;
      diff++;
    }
    k++;
  }
  return out;
}

/**
 * By-item: line totals are pre-tax; `balanceDue` / cart `total` includes tax & discounts.
 * When every unit is assigned, scale each person's `totalDue` so they sum to `balanceTarget`.
 * Until then, keep raw line subtotals so the UI shows progress toward full allocation.
 */
export function applyByItemTotalDuesWithTaxScale<T extends Pick<SplitPerson, "items" | "totalDue">>(
  persons: T[],
  lines: Array<{ id: string; price: number; qty: number }>,
  balanceTarget: number,
  fullyAllocated: boolean,
): T[] {
  const raw = personItemSubtotals(persons, lines);
  if (!fullyAllocated || balanceTarget <= 0) {
    return persons.map((p, i) => ({ ...p, totalDue: raw[i] }));
  }
  const target = Math.round(balanceTarget);
  const scaled = allocateProportionalIntegerShares(raw, target);
  return persons.map((p, i) => ({ ...p, totalDue: scaled[i] }));
}
