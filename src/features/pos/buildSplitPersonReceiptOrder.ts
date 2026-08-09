import type { Order, OrderItem, SplitPerson } from "@/stores/orderStore";

/**
 * Build a customer-receipt view scoped to one split guest (native Bluetooth/Sunmi).
 * Equal split: proportional line shares from totalDue. By-item: assigned lines only.
 */
export function buildSplitPersonReceiptOrder(
  order: Order,
  person: Pick<SplitPerson, "label" | "items" | "payments" | "totalDue">,
  splitMethod: "equal" | "by-item",
): Order {
  const due = Math.max(0, person.totalDue);

  let items: OrderItem[];
  if (splitMethod === "by-item" && person.items.length > 0) {
    items = person.items
      .map((pi) => {
        const line = order.items.find((oi) => String(oi.id) === pi.itemId);
        if (!line) return null;
        return { ...line, qty: pi.qty, notes: line.notes || "" };
      })
      .filter((row): row is OrderItem => row !== null);
  } else {
    const orderSubtotal =
      order.subtotal > 0 ? order.subtotal : order.items.reduce((s, l) => s + l.price * l.qty, 0) || 1;
    const share = due / orderSubtotal;
    items = order.items
      .map((line) => {
        const lineTotal = line.price * line.qty;
        const amount = Math.round(lineTotal * share * 100) / 100;
        const qty = line.qty > 0 ? Math.round(line.qty * share * 1000) / 1000 : 0;
        if (amount <= 0 || qty <= 0) return null;
        return { ...line, qty, notes: line.notes || "" };
      })
      .filter((row): row is OrderItem => row !== null);
    if (items.length === 0 && order.items.length > 0) {
      items = [{ ...order.items[0], qty: 1, price: due, notes: order.items[0].notes || "" }];
    }
  }

  const subtotal = items.reduce((s, l) => s + l.price * l.qty, 0);
  const taxRatio = order.subtotal > 0 ? Math.min(1, subtotal / order.subtotal) : 1;
  const tax = Math.round((order.tax || 0) * taxRatio * 100) / 100;

  return {
    ...order,
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    tax,
    total: due,
    balanceDue: 0,
    paymentStatus: "paid",
    discountAmount: 0,
    payments: person.payments.map((p) => ({ ...p })),
    splitBill: {
      method: splitMethod === "by-item" ? "by-item" : "equal",
      persons: [
        {
          label: person.label,
          items: person.items.map((it) => ({ ...it })),
          payments: person.payments.map((p) => ({ ...p })),
          totalDue: due,
        },
      ],
    },
  };
}
