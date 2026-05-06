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
  /** Master floor table id when assigned */
  tableId?: string;
  tableName?: string;
  /** Display label / legacy QR text */
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

/** Build POS/store table roster from master rows + active local orders */
export function deriveRuntimeFloorTables(
  masters: { id: number; name: string; capacity: number | null; status: string }[],
  orders: Order[],
): Table[] {
  return masters
    .filter((m) => m.status === "active")
    .map((m) => {
      const open = orders.find(
        (o) =>
          o.tableId === String(m.id) && o.status !== "completed" && o.status !== "cancelled",
      );
      let status: Table["status"] = "available";
      let orderId: string | undefined;
      if (open) {
        orderId = open.id;
        status =
          open.paymentStatus === "paid" || open.paymentStatus === "partial"
            ? "waiting-payment"
            : "occupied";
      }
      return {
        id: String(m.id),
        name: m.name,
        seats: m.capacity ?? 4,
        status,
        orderId,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

type OrderStore = {
  orders: Order[];
  tables: Table[];
  replaceFloorTables: (tables: Table[]) => void;
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
  tables: [],
  replaceFloorTables: (tables) => set({ tables }),
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
