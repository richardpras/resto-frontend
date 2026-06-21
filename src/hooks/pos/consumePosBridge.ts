import type { Dispatch, SetStateAction } from "react";
import type { Member } from "@/stores/memberStore";
import type { Order } from "@/stores/orderStore";
import { useOutletStore } from "@/stores/outletStore";
import { useQrOrderPosBridgeStore } from "@/stores/qrOrderPosBridgeStore";
import { useReservationPosBridgeStore } from "@/stores/reservationPosBridgeStore";
import {
  applyReservationPosPayload,
  type ApplyReservationPosPayloadDeps,
} from "@/components/reservations/applyReservationPosPayload";
import { hydrateCartFromOrder, type PosCartLine } from "@/features/pos/posOpenBillSync";

export type PosBridgeQrContext = {
  requestId: string;
  requestCode: string;
  tableName?: string | null;
  linkedOrderId?: string | null;
} | null;

export type ConsumePosBridgeDeps = {
  activeOutletId: number | null | undefined;
  setQrOrderContext: Dispatch<SetStateAction<PosBridgeQrContext>>;
  setCurrentOrderId: (id: string | null) => void;
  setCart: Dispatch<SetStateAction<PosCartLine[]>>;
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  setSelectedTable: (tableId: string) => void;
  setOrderType: (type: string) => void;
  setSelectedMember: (member: Member | null) => void;
  setActiveReservationId: (id: number | null) => void;
  setActiveReservationLabel: (label: string | null) => void;
  getCartLength: () => number;
  fetchMembers: ApplyReservationPosPayloadDeps["fetchMembers"];
  fetchOrderRemote: (orderId: string) => Promise<Order>;
  onTablesPrefetch?: () => void;
};

type ConsumePosBridgeResult = {
  consumedQr: boolean;
  consumedReservation: boolean;
  prefetchTables: boolean;
};

let registeredConsumer: (() => void) | null = null;
let suppressNextOutletCartReset = false;

export function registerPosBridgeConsumer(consumer: (() => void) | null): void {
  registeredConsumer = consumer;
}

export function triggerPosBridgeConsumer(): void {
  registeredConsumer?.();
}

export function consumeOutletCartResetSuppression(): boolean {
  if (!suppressNextOutletCartReset) return false;
  suppressNextOutletCartReset = false;
  return true;
}

function syncOutletIfNeeded(outletId: number, activeOutletId: number | null | undefined): void {
  if (activeOutletId === outletId) return;
  suppressNextOutletCartReset = true;
  useOutletStore.getState().setActiveOutletContext(outletId);
}

export async function consumePosBridge(deps: ConsumePosBridgeDeps): Promise<ConsumePosBridgeResult> {
  const result: ConsumePosBridgeResult = {
    consumedQr: false,
    consumedReservation: false,
    prefetchTables: false,
  };

  if (typeof deps.activeOutletId !== "number" || deps.activeOutletId < 1) {
    return result;
  }

  const qrState = useQrOrderPosBridgeStore.getState();
  if (qrState.loadPayload && qrState.draftSession) {
    const { loadPayload, clear } = qrState;
    syncOutletIfNeeded(loadPayload.outletId, deps.activeOutletId);

    deps.setQrOrderContext({
      requestId: loadPayload.requestId,
      requestCode: loadPayload.requestCode,
      tableName: loadPayload.tableName,
      linkedOrderId: loadPayload.linkedOrderId ?? null,
    });

    if (loadPayload.linkedOrderId) {
      deps.setCurrentOrderId(loadPayload.linkedOrderId);
      try {
        const order = await deps.fetchOrderRemote(loadPayload.linkedOrderId);
        hydrateCartFromOrder(order, deps.setCart, 0);
      } catch {
        // Order fetch failure is surfaced elsewhere when cashier acts on the bill.
      }
    } else {
      deps.setCart(
        loadPayload.items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          category: "",
          emoji: item.emoji ?? "🍽️",
          qty: item.qty,
          notes: item.notes ?? "",
        })),
      );
    }

    if (loadPayload.customerName) deps.setCustomerName(loadPayload.customerName);
    if (loadPayload.tableId) {
      deps.setSelectedTable(String(loadPayload.tableId));
      result.prefetchTables = true;
    }
    deps.setOrderType("Dine-in");
    clear();
    result.consumedQr = true;
  }

  const reservationState = useReservationPosBridgeStore.getState();
  if (reservationState.loadPayload && reservationState.draftSession) {
    const { loadPayload, clear } = reservationState;
    syncOutletIfNeeded(loadPayload.outletId, deps.activeOutletId);

    await applyReservationPosPayload(loadPayload, {
      setCurrentOrderId: deps.setCurrentOrderId,
      setCustomerName: deps.setCustomerName,
      setCustomerPhone: deps.setCustomerPhone,
      setSelectedTable: deps.setSelectedTable,
      setOrderType: deps.setOrderType,
      setSelectedMember: deps.setSelectedMember,
      setActiveReservationId: deps.setActiveReservationId,
      setCart: deps.setCart,
      getCartLength: deps.getCartLength,
      fetchMembers: deps.fetchMembers,
      fetchOrderRemote: deps.fetchOrderRemote,
      activeOutletId: loadPayload.outletId,
    });
    deps.setActiveReservationLabel(loadPayload.customerName ?? null);
    if (loadPayload.tableId) {
      result.prefetchTables = true;
    }
    clear();
    result.consumedReservation = true;
  }

  if (result.prefetchTables) {
    deps.onTablesPrefetch?.();
  }

  return result;
}
