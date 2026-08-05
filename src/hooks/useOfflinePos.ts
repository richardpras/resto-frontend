import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { CreateOrderPayload, OrderPaymentPayload } from "@/lib/api-integration/endpoints";
import { buildSplitSyncPersons } from "@/features/pos/syncSplitPersonsToServer";
import { isNativePosShell } from "@/mobile/platform";
import {
  canOperateOffline,
  getCachedOfflineBootstrap,
  hydrateStoresFromOfflineBootstrap,
  peekOfflineBootstrap,
  runOfflineBootstrap,
  type OfflineBootstrapSnapshot,
} from "@/mobile/offline/offlineBootstrap";
import {
  createLocalOrderId,
  isLocalOrderId,
  loadLocalOrderMapping,
  loadSplitMapping,
  saveLocalOrderMapping,
  saveSplitMapping,
} from "@/mobile/offline/offlineIdMapping";
import { createDeviceUuid } from "@/mobile/offline/createDeviceUuid";
import { upsertCachedOpenOrder, type CachedOpenOrder } from "@/mobile/offline/offlineOrdersCache";
import { useOfflineSyncStore } from "@/stores/offlineSyncStore";
import { useOrderStore, type Order, type SplitPerson } from "@/stores/orderStore";

const TERMINAL_OP = {
  ORDER_CREATE: "order.create",
  ORDER_SPLITS_SYNC: "order.splits.sync",
  ORDER_ADD_PAYMENTS: "order.add_payments",
} as const;

async function shaFingerprint(parts: string[]): Promise<string> {
  const raw = parts.join("|");
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return `fp-${raw}`;
}

function localOrderFromPayload(localId: string, payload: CreateOrderPayload): Order {
  const now = new Date();
  const items = payload.items.map((item, idx) => ({
    id: item.id,
    orderItemId: undefined as string | undefined,
    name: item.name,
    emoji: item.emoji,
    qty: item.qty,
    price: item.price,
    notes: item.notes,
    lineIndex: idx,
  }));
  return {
    id: localId,
    code: payload.code,
    outletId: payload.outletId,
    source: payload.source,
    orderType: payload.orderType,
    status: payload.status,
    paymentStatus: payload.paymentStatus,
    subtotal: payload.subtotal,
    tax: payload.tax,
    total: payload.total,
    applyTax: payload.applyTax,
    items,
    payments: [],
    createdAt: now,
    confirmedAt: payload.confirmedAt ? new Date(payload.confirmedAt) : now,
    tableId: payload.tableId,
    tableName: payload.tableNumber,
    customerName: payload.customerName,
    customerPhone: payload.customerPhone,
    memberId: payload.memberId,
    splitBill: payload.splitBill as Order["splitBill"],
    balanceDue: payload.total,
  };
}

function toCachedOpenOrder(order: Order): CachedOpenOrder {
  return {
    id: order.id,
    code: order.code,
    outletId: order.outletId ?? null,
    tableId: order.tableId ?? null,
    tableName: order.tableName ?? "",
    tableNumber: order.tableName ?? "",
    customerName: order.customerName ?? "",
    source: order.source,
    orderType: order.orderType,
    status: order.status,
    paymentStatus: order.paymentStatus,
    subtotal: order.subtotal,
    tax: order.tax,
    total: order.total,
    balanceDue: order.balanceDue ?? order.total,
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : String(order.createdAt ?? ""),
    items: order.items.map((item, idx) => ({
      id: Number.isFinite(Number(item.orderItemId)) ? Number(item.orderItemId) : idx + 1,
      name: item.name,
      qty: item.qty,
      price: item.price,
      notes: item.notes,
    })),
    payments: order.payments.map((p, idx) => ({
      id: `local-pay-${order.id}-${idx}`,
      method: p.method,
      amount: p.amount,
      paidAt: p.paidAt instanceof Date ? p.paidAt.toISOString() : String(p.paidAt ?? new Date().toISOString()),
    })),
  };
}

async function persistLocalOpenOrder(outletId: number, order: Order): Promise<void> {
  useOrderStore.getState().addOrder(order);
  await upsertCachedOpenOrder(outletId, toCachedOpenOrder(order)).catch(() => undefined);
}

export type UseOfflinePosOptions = {
  outletId: number | null | undefined;
  tenantId: number;
  createOrderRemote: (payload: CreateOrderPayload) => Promise<{ order: Order; resumed: boolean }>;
  addOrderPaymentsRemote: (
    id: string,
    payments: OrderPaymentPayload[],
    extra?: { idempotencyKey?: string },
  ) => Promise<Order>;
  fetchOrderRemote: (id: string) => Promise<Order>;
};

export function useOfflinePos({
  outletId,
  tenantId,
  createOrderRemote,
  addOrderPaymentsRemote,
  fetchOrderRemote,
}: UseOfflinePosOptions) {
  const { t } = useTranslation("ops");
  const isOnline = useOfflineSyncStore((s) => s.isOnline);
  const enqueueReplayableOperation = useOfflineSyncStore((s) => s.enqueueReplayableOperation);
  const flushQueueForOutlet = useOfflineSyncStore((s) => s.flushQueueForOutlet);

  const [bootstrap, setBootstrap] = useState<OfflineBootstrapSnapshot | null>(() => {
    if (!outletId || outletId < 1) return null;
    return peekOfflineBootstrap(outletId);
  });
  const [bootstrapLoading, setBootstrapLoading] = useState(false);

  const isOfflineMode = !isOnline && isNativePosShell();
  const bootstrapReady = canOperateOffline(bootstrap);

  const refreshBootstrapCache = useCallback(async () => {
    if (!outletId || outletId < 1) {
      setBootstrap(null);
      return;
    }
    const cached = await getCachedOfflineBootstrap(outletId);
    if (cached) {
      hydrateStoresFromOfflineBootstrap(cached);
    }
    setBootstrap(cached);
  }, [outletId]);

  useEffect(() => {
    void refreshBootstrapCache();
  }, [refreshBootstrapCache]);

  const performBootstrap = useCallback(async () => {
    if (!outletId || outletId < 1) return null;
    setBootstrapLoading(true);
    try {
      const snapshot = await runOfflineBootstrap({ outletId, tenantId, perPage: 500 });
      setBootstrap(snapshot);
      toast.success(t("mobile.offlineBootstrapReady", { defaultValue: "Offline data ready for this outlet." }));
      return snapshot;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bootstrap failed");
      return null;
    } finally {
      setBootstrapLoading(false);
    }
  }, [outletId, tenantId, t]);

  const createOrderWithOffline = useCallback(
    async (payload: CreateOrderPayload): Promise<{ order: Order; resumed: boolean }> => {
      if (!isOfflineMode || !outletId) {
        return createOrderRemote(payload);
      }
      if (!bootstrapReady) {
        throw new Error(t("mobile.connectToBootstrap", { defaultValue: "Connect to the internet once to prepare offline shift." }));
      }

      const localId = createLocalOrderId();
      const offlineCode = `L${createDeviceUuid().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
      // Local/offline POS sessions use negative ids — strip so server auto-links open session on replay.
      const { posSessionId, ...restPayload } = payload as CreateOrderPayload & { posSessionId?: number };
      const safePayload =
        typeof posSessionId === "number" && posSessionId > 0
          ? { ...restPayload, posSessionId }
          : restPayload;
      const offlinePayload = { ...safePayload, code: offlineCode, clientLocalRef: localId };
      const localOrder = localOrderFromPayload(localId, offlinePayload);
      const fp = await shaFingerprint([TERMINAL_OP.ORDER_CREATE, localId, JSON.stringify(offlinePayload)]);

      await saveLocalOrderMapping(localId, offlineCode, undefined, {});

      await enqueueReplayableOperation({
        outletId,
        fingerprint: fp,
        operationType: TERMINAL_OP.ORDER_CREATE,
        payload: offlinePayload as unknown as Record<string, unknown>,
      });

      await persistLocalOpenOrder(outletId, localOrder);

      return { order: localOrder, resumed: false };
    },
    [bootstrapReady, createOrderRemote, enqueueReplayableOperation, isOfflineMode, outletId, t],
  );

  const syncSplitsWithOffline = useCallback(
    async (
      orderId: string,
      order: Pick<Order, "items" | "subtotal" | "balanceDue" | "total">,
      splitPersons: SplitPerson[],
      splitMethod: "equal" | "by-item",
    ): Promise<SplitPerson[]> => {
      if (!isOfflineMode || !outletId || !isLocalOrderId(orderId)) {
        const { syncSplitPersonsToServer } = await import("@/features/pos/syncSplitPersonsToServer");
        return syncSplitPersonsToServer(orderId, order, splitPersons, splitMethod);
      }

      const mapping = await loadLocalOrderMapping(orderId);
      const serverOrderId = mapping?.serverOrderId ?? 0;
      const localOrderCode = mapping?.localOrderCode;

      const persons = buildSplitSyncPersons(order, splitPersons, splitMethod).map((person) => ({
        ...person,
        items: person.items.map((item) => {
          const clientLine = order.items.find(
            (oi) => oi.orderItemId != null && Number(oi.orderItemId) === item.orderItemId,
          );
          const clientItemId = clientLine?.id ?? String(item.orderItemId);
          const mappedServerItemId = mapping?.itemMap[String(clientItemId)];
          return {
            ...item,
            clientItemId: String(clientItemId),
            orderItemId: mappedServerItemId ?? item.orderItemId,
          };
        }),
      }));

      const fp = await shaFingerprint([TERMINAL_OP.ORDER_SPLITS_SYNC, orderId, JSON.stringify(persons)]);
      await enqueueReplayableOperation({
        outletId,
        fingerprint: fp,
        operationType: TERMINAL_OP.ORDER_SPLITS_SYNC,
        payload: {
          orderId: serverOrderId > 0 ? serverOrderId : 0,
          localOrderCode: localOrderCode ?? undefined,
          persons,
          idempotencyKey: `split-sync-${orderId}`,
        },
      });

      const splitMap: Record<number, number> = {};
      splitPersons.forEach((_, idx) => {
        splitMap[idx] = -(idx + 1);
      });
      await saveSplitMapping(orderId, splitMap);

      return splitPersons.map((person, idx) => ({
        ...person,
        serverSplitId: splitMap[idx],
      }));
    },
    [enqueueReplayableOperation, isOfflineMode, outletId, t],
  );

  const addPaymentsWithOffline = useCallback(
    async (
      orderId: string,
      payments: OrderPaymentPayload[],
      extra?: { idempotencyKey?: string },
    ): Promise<Order> => {
      if (!isOfflineMode || !outletId || !isLocalOrderId(orderId)) {
        return addOrderPaymentsRemote(orderId, payments, extra);
      }

      const mapping = await loadLocalOrderMapping(orderId);
      const splitMap = await loadSplitMapping(orderId);
      const serverOrderId = mapping?.serverOrderId;
      const localOrderCode = mapping?.localOrderCode;

      const normalizedPayments = payments.map((payment) => {
        const splitId = payment.orderSplitId;
        if (splitId != null && splitId < 0) {
          const idx = Math.abs(splitId) - 1;
          const resolved = splitMap[idx];
          return resolved && resolved > 0 ? { ...payment, orderSplitId: resolved } : payment;
        }
        return payment;
      });

      const fp = await shaFingerprint([
        TERMINAL_OP.ORDER_ADD_PAYMENTS,
        orderId,
        JSON.stringify(normalizedPayments),
        extra?.idempotencyKey ?? "",
      ]);

      await enqueueReplayableOperation({
        outletId,
        fingerprint: fp,
        operationType: TERMINAL_OP.ORDER_ADD_PAYMENTS,
        payload: {
          orderId: serverOrderId ?? 0,
          localOrderCode: localOrderCode ?? undefined,
          payments: normalizedPayments,
          idempotencyKey: extra?.idempotencyKey,
        },
      });

      const fromStore = useOrderStore.getState().orders.find((o) => o.id === orderId) ?? null;
      const existing = fromStore ?? (await fetchOrderRemote(orderId).catch(() => null));
      const paidAmount = payments.reduce((s, p) => s + p.amount, 0);
      const base = existing ?? localOrderFromPayload(orderId, {
        tenantId,
        outletId,
        code: localOrderCode ?? "OFFLINE",
        source: "pos",
        orderType: "Dine-in",
        status: "confirmed",
        paymentStatus: "partial",
        items: [],
        subtotal: 0,
        tax: 0,
        total: paidAmount,
        payments: [],
      } as CreateOrderPayload);

      const nextPayments = [
        ...base.payments,
        ...payments.map((p) => ({
          method: p.method,
          amount: p.amount,
          paidAt: p.paidAt ? new Date(p.paidAt) : new Date(),
          tenderedAmount: p.tenderedAmount ?? null,
          changeAmount: p.changeAmount ?? null,
        })),
      ];
      const totalPaid = nextPayments.reduce((s, p) => s + p.amount, 0);
      const updated: Order = {
        ...base,
        payments: nextPayments,
        paymentStatus: totalPaid >= base.total ? "paid" : "partial",
        balanceDue: Math.max(0, base.total - totalPaid),
      };
      await persistLocalOpenOrder(outletId, updated);
      return updated;
    },
    [addOrderPaymentsRemote, enqueueReplayableOperation, fetchOrderRemote, isOfflineMode, outletId, t, tenantId],
  );

  const isGatewayBlockedOffline = useCallback(
    (method: string, checkoutMethods: { code: string; type?: string }[]): boolean => {
      if (!isOfflineMode) return false;
      const match = checkoutMethods.find((m) => m.code === method);
      const type = match?.type ?? method;
      return type !== "cash" && type !== "static_qris" && method !== "cash" && method !== "static_qris";
    },
    [isOfflineMode],
  );

  const manualSync = useCallback(async () => {
    if (!outletId || outletId < 1) return;
    await flushQueueForOutlet(outletId);
  }, [flushQueueForOutlet, outletId]);

  return {
    isOfflineMode,
    isNativeShell: isNativePosShell(),
    bootstrap,
    bootstrapReady,
    bootstrapLoading,
    showOfflineBlocker: isOfflineMode && !bootstrapReady,
    performBootstrap,
    refreshBootstrapCache,
    createOrderWithOffline,
    syncSplitsWithOffline,
    addPaymentsWithOffline,
    isGatewayBlockedOffline,
    manualSync,
    offlineMenuItems: bootstrap?.menuItems?.data ?? [],
    offlineTables: bootstrap?.tables ?? [],
    offlineCheckoutMethods: bootstrap?.checkoutMethods ?? [],
  };
}

// re-export for tests
export { shaFingerprint };
