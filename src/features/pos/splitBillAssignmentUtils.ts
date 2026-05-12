import type { SplitPerson } from "@/stores/orderStore";

/** Sum of `itemId` qty on all persons except `personIdx`. */
export function qtyAssignedByOthers(persons: SplitPerson[], personIdx: number, itemId: string): number {
  return persons.reduce((sum, p, i) => {
    if (i === personIdx) return sum;
    const it = p.items.find((x) => x.itemId === itemId);
    return sum + (it?.qty ?? 0);
  }, 0);
}

/** Max qty this person can carry for this line without exceeding `lineQty` across the group. */
export function maxQtyForPersonOnLine(
  persons: SplitPerson[],
  personIdx: number,
  itemId: string,
  lineQty: number,
): number {
  return Math.max(0, lineQty - qtyAssignedByOthers(persons, personIdx, itemId));
}

/** Every order/cart line has exactly its qty fully assigned across persons. */
export function byItemFullyAllocated(
  persons: SplitPerson[],
  lines: Array<{ id: string; qty: number }>,
): boolean {
  return lines.every((line) => {
    const id = String(line.id);
    const assigned = persons.reduce((s, p) => s + (p.items.find((it) => it.itemId === id)?.qty ?? 0), 0);
    return assigned === line.qty;
  });
}
