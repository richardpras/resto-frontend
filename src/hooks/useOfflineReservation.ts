import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  createReservation,
  type CreateReservationPayload,
  type ReservationApi,
} from "@/lib/api-integration/reservationEndpoints";
import { isNativePosShell } from "@/mobile/platform";
import { shaFingerprint } from "@/hooks/useOfflinePos";
import {
  createLocalReservationNumericId,
  createLocalReservationRef,
  saveLocalReservationMapping,
} from "@/mobile/offline/offlineReservationMapping";
import { upsertLocalReservationInCache } from "@/mobile/offline/offlineReservationCacheDb";
import { loadReservationMenuCache } from "@/mobile/offline/offlineReservationMenuDb";
import { useOfflineSyncStore } from "@/stores/offlineSyncStore";
import { useReservationStore } from "@/stores/reservationStore";

const TERMINAL_OP = {
  RESERVATION_CREATE: "reservation.create",
} as const;

function estimateRequiredDeposit(items: CreateReservationPayload["items"], menuPrices: Map<number, number>): number {
  const subtotal = items.reduce((sum, line) => {
    const price = menuPrices.get(line.menuItemId) ?? 0;
    return sum + price * line.qty;
  }, 0);
  return Math.round(subtotal * 0.5);
}

function buildOptimisticReservation(
  localNumericId: number,
  localRef: string,
  payload: CreateReservationPayload,
  requiredDepositAmount: number,
): ReservationApi {
  const code = `L-RSV-${localRef.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}`;
  return {
    id: localNumericId,
    outletId: payload.outletId,
    tableId: null,
    reservationCode: code,
    customerName: payload.customerName,
    customerPhone: payload.customerPhone ?? null,
    memberId: payload.memberId ?? null,
    partySize: payload.partySize,
    reservationAt: payload.reservationAt,
    confirmedAt: null,
    checkedInAt: null,
    seatedAt: null,
    completedAt: null,
    cancelledAt: null,
    noShowAt: null,
    linkedOrderId: null,
    serviceStartedAt: null,
    status: "pending_deposit",
    source: "staff",
    requiredDepositAmount,
    approvedDepositAmount: null,
    depositRejectionReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function useOfflineReservation(outletId: number | null) {
  const { t } = useTranslation("ops");
  const isOnline = useOfflineSyncStore((s) => s.isOnline);
  const enqueueReplayableOperation = useOfflineSyncStore((s) => s.enqueueReplayableOperation);
  const flushQueueForOutlet = useOfflineSyncStore((s) => s.flushQueueForOutlet);
  const upsertLocalRow = useReservationStore((s) => s.upsertLocalRow);
  const isOfflineMode = !isOnline && isNativePosShell();

  const createReservationWithOffline = useCallback(
    async (payload: CreateReservationPayload): Promise<ReservationApi> => {
      if (!isOfflineMode || !outletId) {
        return createReservation(payload);
      }

      const menuCache = await loadReservationMenuCache(outletId);
      if (!menuCache || menuCache.items.length === 0) {
        throw new Error(
          t("reservations.offlineMenuRequired", {
            defaultValue: "Connect once to download the reservation menu for offline booking.",
          }),
        );
      }

      const priceMap = new Map(menuCache.items.map((item) => [Number(item.id), item.price]));
      const localRef = createLocalReservationRef();
      const localNumericId = createLocalReservationNumericId();
      const requiredDeposit = estimateRequiredDeposit(payload.items, priceMap);
      const optimistic = buildOptimisticReservation(localNumericId, localRef, payload, requiredDeposit);
      const offlinePayload = {
        ...payload,
        clientLocalRef: localRef,
      };

      const fp = await shaFingerprint([
        TERMINAL_OP.RESERVATION_CREATE,
        localRef,
        JSON.stringify(offlinePayload),
      ]);

      await saveLocalReservationMapping({
        localRef,
        localNumericId,
        reservationCode: optimistic.reservationCode,
      });

      await enqueueReplayableOperation({
        outletId,
        fingerprint: fp,
        operationType: TERMINAL_OP.RESERVATION_CREATE,
        payload: offlinePayload as unknown as Record<string, unknown>,
      });

      await upsertLocalReservationInCache(outletId, optimistic);
      upsertLocalRow(optimistic);

      return optimistic;
    },
    [enqueueReplayableOperation, isOfflineMode, outletId, t, upsertLocalRow],
  );

  const flushReservationQueue = useCallback(async () => {
    if (!outletId || outletId < 1 || !isOnline) return;
    await flushQueueForOutlet(outletId);
  }, [flushQueueForOutlet, isOnline, outletId]);

  return {
    isOfflineMode,
    isOnline,
    createReservationWithOffline,
    flushReservationQueue,
  };
}
