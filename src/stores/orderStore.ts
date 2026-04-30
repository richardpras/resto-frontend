import { create } from "zustand";
import { useInventoryStore } from "./inventoryStore";

export type OrderItem = {
  orderItemId?: string;
  id: string;
  name: string;
  price: number;
  qty: number;
  emoji: string;
  notes: string;
};

export type PaymentEntry = {
  method: string;
  amount: number;
  paidAt: Date;
  allocations?: { orderItemId: string; qty: number; amount: number }[];
};

export type SplitPerson = {
  label: string;
  items: { itemId: string; qty: number }[];
  payments: PaymentEntry[];
  totalDue: number;
};

export type SplitBillData = {
  method: "equal" | "by-item" | "by-quantity";
  persons: SplitPerson[];
};

export type Order = {
  id: string;
  code: string;
  source: "pos" | "qr";
  orderType: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: "pending" | "confirmed" | "cooking" | "ready" | "completed" | "cancelled";
  paymentStatus: "unpaid" | "partial" | "paid";
  payments: PaymentEntry[];
  customerName: string;
  customerPhone: string;
  tableNumber: string;
  createdAt: Date;
  confirmedAt?: Date;
  splitBill?: SplitBillData;
};

export type Table = {
  id: string;
  name: string;
  seats: number;
  status: "available" | "occupied" | "waiting-payment";
  orderId?: string;
};

const defaultTables: Table[] = Array.from({ length: 12 }, (_, i) => ({
  id: `table-${i + 1}`,
  name: `Table ${i + 1}`,
  seats: i < 4 ? 2 : i < 8 ? 4 : 6,
  status: "available" as const,
}));

type OrderStore = {
  orders: Order[];
  tables: Table[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (id: string, status: Order["status"]) => void;
  confirmOrder: (id: string) => void;
  cancelOrder: (id: string) => void;
  addPayment: (orderId: string, payment: PaymentEntry) => void;
  setSplitBill: (orderId: string, split: SplitBillData) => void;
  addSplitPayment: (orderId: string, personIndex: number, payment: PaymentEntry) => void;
  updateTableStatus: (tableId: string, status: Table["status"], orderId?: string) => void;
};

function calcPaymentStatus(order: Order): Order["paymentStatus"] {
  const totalPaid = order.payments.reduce((s, p) => s + p.amount, 0);
  if (totalPaid >= order.total) return "paid";
  if (totalPaid > 0) return "partial";
  return "unpaid";
}

export const useOrderStore = create<OrderStore>((set) => ({
  orders: [],
  tables: defaultTables,
  addOrder: (order) => set((s) => ({ orders: [order, ...s.orders] })),
  updateOrderStatus: (id, status) =>
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? { ...o, status } : o)),
    })),
  confirmOrder: (id) =>
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === id ? { ...o, status: "confirmed" as const, confirmedAt: new Date() } : o
      ),
    })),
  cancelOrder: (id) =>
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? { ...o, status: "cancelled" as const } : o)),
      tables: s.tables.map((t) => (t.orderId === id ? { ...t, status: "available" as const, orderId: undefined } : t)),
    })),
  addPayment: (orderId, payment) =>
    set((s) => ({
      orders: s.orders.map((o) => {
        if (o.id !== orderId) return o;
        const updated = { ...o, payments: [...o.payments, payment] };
        updated.paymentStatus = calcPaymentStatus(updated);
        if (updated.paymentStatus === "paid") {
          updated.status = "completed";
          // Deduct ingredient stock for each item
          const { deductStock } = useInventoryStore.getState();
          for (const item of updated.items) {
            deductStock(item.id, item.qty);
          }
        }
        return updated;
      }),
    })),
  setSplitBill: (orderId, split) =>
    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId ? { ...o, splitBill: split } : o)),
    })),
  addSplitPayment: (orderId, personIndex, payment) =>
    set((s) => ({
      orders: s.orders.map((o) => {
        if (o.id !== orderId || !o.splitBill) return o;
        const persons = o.splitBill.persons.map((p, i) =>
          i === personIndex ? { ...p, payments: [...p.payments, payment] } : p
        );
        const allPayments = persons.flatMap((p) => p.payments);
        const updated = {
          ...o,
          splitBill: { ...o.splitBill, persons },
          payments: allPayments,
        };
        updated.paymentStatus = calcPaymentStatus(updated);
        if (updated.paymentStatus === "paid") updated.status = "completed";
        return updated;
      }),
    })),
  updateTableStatus: (tableId, status, orderId) =>
    set((s) => ({
      tables: s.tables.map((t) =>
        t.id === tableId ? { ...t, status, orderId: orderId ?? t.orderId } : t
      ),
    })),
}));
