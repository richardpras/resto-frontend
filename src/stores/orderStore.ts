import { create } from "zustand";
import { ApiHttpError } from "@/lib/api-integration/client";
import {
  addOrderPayments as apiAddOrderPayments,
  createOrderSplit as apiCreateOrderSplit,
  createOrder as apiCreateOrder,
  getOrder as apiGetOrder,
  listOrderPayments as apiListOrderPayments,
  listOrdersWithMeta as apiListOrdersWithMeta,
  updateOrderSplit as apiUpdateOrderSplit,
  updateOrder as apiUpdateOrder,
  type CreateOrderPayload,
  type ListOrdersMeta,
  type ListOrdersParams,
  type OrderApi,
  type OrderPaymentPayload,
  type OrderSplitPayload,
  type UpdateOrderPayload,
} from "@/lib/api-integration/endpoints";
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
  /** Phase 2 lifecycle metadata */
  serviceMode?: "dine_in" | "takeaway" | null;
  orderChannel?: "dine_in" | "takeaway" | "qr" | null;
  posSessionId?: number | null;
  kitchenStatus?: string;
  outletId?: number | null;
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

/** Adapter — backend `OrderApi` → frontend `Order` */
export function orderApiToStoreOrder(o: OrderApi): Order {
  return {
    id: String(o.id),
    code: o.code,
    source: o.source,
    orderType: o.orderType,
    items: o.items.map((it) => ({
      orderItemId: it.orderItemId,
      id: String(it.id),
      name: it.name,
      price: it.price,
      qty: it.qty,
      emoji: it.emoji ?? "",
      notes: typeof it.notes === "string" ? it.notes : "",
    })),
    subtotal: o.subtotal,
    tax: o.tax,
    total: o.total,
    status: o.status,
    paymentStatus: o.paymentStatus,
    payments: o.payments.map((p) => ({
      method: p.method,
      amount: p.amount,
      paidAt: p.paidAt ? new Date(p.paidAt) : new Date(),
      allocations: p.allocations?.map((a) => ({
        orderItemId: String(a.orderItemId),
        qty: a.qty,
        amount: a.amount,
      })),
    })),
    customerName: o.customerName ?? "",
    customerPhone: o.customerPhone ?? "",
    tableId: o.tableId != null ? String(o.tableId) : undefined,
    tableName: o.tableName ?? undefined,
    tableNumber: o.tableNumber ?? "",
    createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
    confirmedAt: o.confirmedAt ? new Date(o.confirmedAt) : undefined,
    splitBill: o.splitBill as Order["splitBill"],
    serviceMode: o.serviceMode ?? null,
    orderChannel: o.orderChannel ?? null,
    posSessionId: o.posSessionId ?? null,
    kitchenStatus: typeof o.kitchenStatus === "string" ? o.kitchenStatus : undefined,
    outletId: o.outletId ?? null,
  };
}

type OrderStore = {
  orders: Order[];
  tables: Table[];
  // Async lifecycle state
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  pagination: ListOrdersMeta | null;
  lastSyncAt: string | null;
  lastListParams: ListOrdersParams | null;
  splitDrafts: Record<string, OrderSplitPayload>;
  paymentDrafts: Record<string, { method: string; amount: number }[]>;

  // Local state mutators (kept so the UI hierarchy stays unchanged)
  replaceFloorTables: (tables: Table[]) => void;
  addOrder: (order: Order) => void;
  updateOrderStatus: (id: string, status: Order["status"]) => void;
  confirmOrder: (id: string) => void;
  cancelOrder: (id: string) => void;
  addPayment: (orderId: string, payment: PaymentEntry) => void;
  setSplitBill: (orderId: string, split: SplitBillData) => void;
  addSplitPayment: (orderId: string, personIndex: number, payment: PaymentEntry) => void;
  updateTableStatus: (tableId: string, status: Table["status"], orderId?: string) => void;

  // Phase 2 async actions — components call these instead of api-integration directly
  fetchOrders: (params?: ListOrdersParams) => Promise<Order[]>;
  fetchOrder: (id: string) => Promise<Order>;
  createOrderRemote: (payload: CreateOrderPayload) => Promise<Order>;
  updateOrderRemote: (id: string, payload: UpdateOrderPayload) => Promise<Order>;
  addOrderPaymentsRemote: (
    id: string,
    payments: OrderPaymentPayload[],
    extra?: { cashAccountCode?: string; revenueAccountCode?: string },
  ) => Promise<Order>;
  createOrderSplitRemote: (orderId: string, payload: OrderSplitPayload) => Promise<Order>;
  updateOrderSplitRemote: (
    orderId: string,
    splitId: number,
    payload: Partial<OrderSplitPayload>,
  ) => Promise<Order>;
  listOrderPaymentsRemote: (orderId: string) => Promise<Order["payments"]>;
  setSplitDraft: (orderId: string, payload: OrderSplitPayload) => void;
  setPaymentDraft: (orderId: string, drafts: { method: string; amount: number }[]) => void;
  getPaymentSummary: (orderId: string) => {
    orderTotal: number;
    allocatedTotal: number;
    remainingBalance: number;
  };
  revalidateOrders: () => Promise<Order[] | null>;
  resetAsync: () => void;
};

function calcPaymentStatus(order: Order): Order["paymentStatus"] {
  const totalPaid = order.payments.reduce((s, p) => s + p.amount, 0);
  if (totalPaid >= order.total) return "paid";
  if (totalPaid > 0) return "partial";
  return "unpaid";
}

function mapApiError(error: unknown): string {
  if (error instanceof ApiHttpError) return error.message;
  if (error instanceof Error) return error.message;
  return "Order request failed";
}

function upsertOrder(orders: Order[], next: Order): Order[] {
  const idx = orders.findIndex((o) => o.id === next.id);
  if (idx === -1) return [next, ...orders];
  const copy = orders.slice();
  copy[idx] = next;
  return copy;
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: [],
  tables: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
  pagination: null,
  lastSyncAt: null,
  lastListParams: null,
  splitDrafts: {},
  paymentDrafts: {},

  replaceFloorTables: (tables) => set({ tables }),
  addOrder: (order) => set((s) => ({ orders: upsertOrder(s.orders, order) })),
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
      tables: s.tables.map((t) =>
        t.orderId === id ? { ...t, status: "available" as const, orderId: undefined } : t,
      ),
    })),
  addPayment: (orderId, payment) =>
    set((s) => ({
      orders: s.orders.map((o) => {
        if (o.id !== orderId) return o;
        const updated = { ...o, payments: [...o.payments, payment] };
        updated.paymentStatus = calcPaymentStatus(updated);
        if (updated.paymentStatus === "paid") {
          updated.status = "completed";
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

  fetchOrders: async (params) => {
    set({ isLoading: true, error: null, lastListParams: params ?? null });
    try {
      const result = await apiListOrdersWithMeta(params);
      const mapped = result.orders.map(orderApiToStoreOrder);
      set({
        orders: mapped,
        pagination: result.meta,
        lastSyncAt: new Date().toISOString(),
      });
      return mapped;
    } catch (error) {
      const message = mapApiError(error);
      set({ error: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchOrder: async (id) => {
    set({ isSubmitting: true, error: null });
    try {
      const apiOrder = await apiGetOrder(id);
      const mapped = orderApiToStoreOrder(apiOrder);
      set((s) => ({
        orders: upsertOrder(s.orders, mapped),
        lastSyncAt: new Date().toISOString(),
      }));
      return mapped;
    } catch (error) {
      const message = mapApiError(error);
      set({ error: message });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  createOrderRemote: async (payload) => {
    set({ isSubmitting: true, error: null });
    try {
      const apiOrder = await apiCreateOrder(payload);
      const mapped = orderApiToStoreOrder(apiOrder);
      set((s) => ({
        orders: upsertOrder(s.orders, mapped),
        lastSyncAt: new Date().toISOString(),
      }));
      return mapped;
    } catch (error) {
      const message = mapApiError(error);
      set({ error: message });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updateOrderRemote: async (id, payload) => {
    set({ isSubmitting: true, error: null });
    try {
      const apiOrder = await apiUpdateOrder(id, payload);
      const mapped = orderApiToStoreOrder(apiOrder);
      set((s) => ({
        orders: upsertOrder(s.orders, mapped),
        lastSyncAt: new Date().toISOString(),
      }));
      return mapped;
    } catch (error) {
      const message = mapApiError(error);
      set({ error: message });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  addOrderPaymentsRemote: async (id, payments, extra) => {
    set({ isSubmitting: true, error: null });
    try {
      const apiOrder = await apiAddOrderPayments(id, {
        payments,
        ...(extra?.cashAccountCode ? { cashAccountCode: extra.cashAccountCode } : {}),
        ...(extra?.revenueAccountCode ? { revenueAccountCode: extra.revenueAccountCode } : {}),
      });
      const mapped = orderApiToStoreOrder(apiOrder);
      set((s) => ({
        orders: upsertOrder(s.orders, mapped),
        lastSyncAt: new Date().toISOString(),
      }));
      void get().revalidateOrders();
      return mapped;
    } catch (error) {
      const message = mapApiError(error);
      set({ error: message });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  createOrderSplitRemote: async (orderId, payload) => {
    set({ isSubmitting: true, error: null });
    try {
      await apiCreateOrderSplit(orderId, payload);
      const apiOrder = await apiGetOrder(orderId);
      const mapped = orderApiToStoreOrder(apiOrder);
      set((s) => ({
        orders: upsertOrder(s.orders, mapped),
        lastSyncAt: new Date().toISOString(),
        splitDrafts: { ...s.splitDrafts, [orderId]: payload },
      }));
      void get().revalidateOrders();
      return mapped;
    } catch (error) {
      const message = mapApiError(error);
      set({ error: message });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updateOrderSplitRemote: async (orderId, splitId, payload) => {
    set({ isSubmitting: true, error: null });
    try {
      await apiUpdateOrderSplit(orderId, splitId, payload);
      const apiOrder = await apiGetOrder(orderId);
      const mapped = orderApiToStoreOrder(apiOrder);
      set((s) => ({
        orders: upsertOrder(s.orders, mapped),
        lastSyncAt: new Date().toISOString(),
        splitDrafts: s.splitDrafts[orderId]
          ? {
              ...s.splitDrafts,
              [orderId]: { ...s.splitDrafts[orderId], ...payload },
            }
          : s.splitDrafts,
      }));
      void get().revalidateOrders();
      return mapped;
    } catch (error) {
      const message = mapApiError(error);
      set({ error: message });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  listOrderPaymentsRemote: async (orderId) => {
    set({ isSubmitting: true, error: null });
    try {
      const payments = await apiListOrderPayments(orderId);
      set((s) => ({
        orders: s.orders.map((o) =>
          o.id === orderId
            ? {
                ...o,
                payments: payments.map((p) => ({
                  method: p.method,
                  amount: p.amount,
                  paidAt: p.paidAt ? new Date(p.paidAt) : new Date(),
                  allocations: p.allocations?.map((a) => ({
                    orderItemId: String(a.orderItemId),
                    qty: a.qty,
                    amount: a.amount,
                  })),
                })),
              }
            : o
        ),
        lastSyncAt: new Date().toISOString(),
      }));
      return get().orders.find((o) => o.id === orderId)?.payments ?? [];
    } catch (error) {
      const message = mapApiError(error);
      set({ error: message });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  setSplitDraft: (orderId, payload) =>
    set((s) => ({ splitDrafts: { ...s.splitDrafts, [orderId]: payload } })),

  setPaymentDraft: (orderId, drafts) =>
    set((s) => ({ paymentDrafts: { ...s.paymentDrafts, [orderId]: drafts } })),

  getPaymentSummary: (orderId) => {
    const state = get();
    const order = state.orders.find((o) => o.id === orderId);
    const orderTotal = order?.total ?? 0;
    const allocatedTotal = (state.paymentDrafts[orderId] ?? []).reduce((sum, p) => sum + p.amount, 0);

    return {
      orderTotal,
      allocatedTotal,
      remainingBalance: Math.max(0, orderTotal - allocatedTotal),
    };
  },

  revalidateOrders: async () => {
    const params = get().lastListParams;
    if (params === null) return null;
    return get().fetchOrders(params);
  },

  resetAsync: () =>
    set({
      isLoading: false,
      isSubmitting: false,
      error: null,
      pagination: null,
      lastSyncAt: null,
      lastListParams: null,
      splitDrafts: {},
      paymentDrafts: {},
    }),
}));
