import type {
  SplitItemAllocation,
  SplitOrderItem,
  SplitPaymentLine,
  SplitPerson,
} from "./splitPaymentTypes";

export function buildSplitOrderItems(
  items: Array<{ id: string; name: string; qty: number; price: number }>
): SplitOrderItem[] {
  return items.map((item) => ({
    orderItemId: item.id,
    name: item.name,
    qty: item.qty,
    unitPrice: item.price,
  }));
}

export function createSplitPersons(count: number): SplitPerson[] {
  return Array.from({ length: count }, (_, index) => ({
    label: `Person ${index + 1}`,
    allocations: [],
    totalDue: 0,
    paidTotal: 0,
  }));
}

export function getTotalAllocatedQty(persons: SplitPerson[], orderItemId: string): number {
  return persons.reduce((total, person) => {
    const allocation = person.allocations.find((line) => line.orderItemId === orderItemId);
    return total + (allocation?.qty ?? 0);
  }, 0);
}

export function clampAllocationQty(nextQty: number, maxQty: number): number {
  if (!Number.isFinite(nextQty)) return 0;
  if (nextQty < 0) return 0;
  if (nextQty > maxQty) return maxQty;
  return Math.floor(nextQty);
}

export function buildAllocationAmount(qty: number, unitPrice: number): number {
  return Math.max(0, qty) * unitPrice;
}

export function upsertPersonAllocation(
  person: SplitPerson,
  orderItem: SplitOrderItem,
  qty: number
): SplitPerson {
  const safeQty = Math.max(0, Math.floor(qty));
  const nextAllocations = person.allocations.filter((line) => line.orderItemId !== orderItem.orderItemId);
  if (safeQty > 0) {
    nextAllocations.push({
      orderItemId: orderItem.orderItemId,
      qty: safeQty,
      amount: buildAllocationAmount(safeQty, orderItem.unitPrice),
    });
  }

  const totalDue = nextAllocations.reduce((sum, line) => sum + line.amount, 0);
  return { ...person, allocations: nextAllocations, totalDue };
}

export function calculatePaidTotal(payments: Array<{ amount: number }>): number {
  return payments.reduce((sum, payment) => sum + Math.max(0, payment.amount), 0);
}

export function calculateRemaining(totalDue: number, paidTotal: number): number {
  return Math.max(0, totalDue - paidTotal);
}

export function sumAllocationAmount(allocations: SplitItemAllocation[]): number {
  return allocations.reduce((sum, allocation) => sum + Math.max(0, allocation.amount), 0);
}

export function clampPaymentAmount(amount: number, outstanding: number): number {
  if (!Number.isFinite(amount)) return 0;
  if (outstanding <= 0) return 0;
  return Math.max(0, Math.min(Math.floor(amount), Math.floor(outstanding)));
}

export function createPaymentAllocations(
  allocations: SplitItemAllocation[],
  paymentAmount: number
): SplitItemAllocation[] {
  const maxAllocatable = sumAllocationAmount(allocations);
  const remainingAmount = clampPaymentAmount(paymentAmount, maxAllocatable);
  if (remainingAmount <= 0) return [];

  let rollingRemaining = remainingAmount;
  const nextAllocations: SplitItemAllocation[] = [];
  for (const allocation of allocations) {
    if (rollingRemaining <= 0) break;
    const coveredAmount = Math.min(Math.max(0, allocation.amount), rollingRemaining);
    if (coveredAmount <= 0) continue;
    nextAllocations.push({
      orderItemId: allocation.orderItemId,
      qty: allocation.qty,
      amount: coveredAmount,
    });
    rollingRemaining -= coveredAmount;
  }
  return nextAllocations;
}

export function toSplitPaymentLine(
  method: string,
  amount: number,
  allocations: SplitItemAllocation[],
  paidAt: Date = new Date()
): SplitPaymentLine {
  return {
    method,
    amount,
    allocations,
    paidAt: paidAt.toISOString(),
  };
}
