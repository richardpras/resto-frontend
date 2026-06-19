import type { Member } from "@/stores/memberStore";
import { useMemberStore } from "@/stores/memberStore";
import type { Order } from "@/stores/orderStore";
import { hydrateCartFromOrder, type PosCartLine } from "@/features/pos/posOpenBillSync";
import type { ReservationPosLoadPayload } from "@/stores/reservationPosBridgeStore";

export type ApplyReservationPosPayloadDeps = {
  setCurrentOrderId: (id: string) => void;
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  setSelectedTable: (tableId: string) => void;
  setOrderType: (type: string) => void;
  setSelectedMember: (member: Member | null) => void;
  setActiveReservationId?: (id: number | null) => void;
  setCart?: (items: PosCartLine[]) => void;
  getCartLength?: () => number;
  fetchMembers: (opts: { outletId: number; force?: boolean }) => Promise<void>;
  fetchOrderRemote: (orderId: string) => Promise<Order>;
  activeOutletId: number | null | undefined;
};

export async function applyReservationPosPayload(
  loadPayload: ReservationPosLoadPayload,
  deps: ApplyReservationPosPayloadDeps,
): Promise<void> {
  const {
    setCurrentOrderId,
    setCustomerName,
    setCustomerPhone,
    setSelectedTable,
    setOrderType,
    setSelectedMember,
    setActiveReservationId,
    setCart,
    getCartLength,
    fetchMembers,
    fetchOrderRemote,
    activeOutletId,
  } = deps;

  setCurrentOrderId(loadPayload.linkedOrderId);
  if (loadPayload.customerName) setCustomerName(loadPayload.customerName);
  if (loadPayload.customerPhone) setCustomerPhone(loadPayload.customerPhone);
  if (loadPayload.tableId) setSelectedTable(String(loadPayload.tableId));
  setOrderType("Dine-in");
  setActiveReservationId?.(loadPayload.reservationId);

  if (loadPayload.memberId && typeof activeOutletId === "number") {
    try {
      await fetchMembers({ outletId: activeOutletId, force: true });
      const fromStore = useMemberStore.getState().members.find((m) => m.id === String(loadPayload.memberId));
      if (fromStore) {
        setSelectedMember(fromStore);
      } else {
        setSelectedMember({
          id: String(loadPayload.memberId),
          name: loadPayload.memberName ?? loadPayload.customerName ?? "",
          phone: loadPayload.customerPhone ?? "",
          memberNo: loadPayload.memberNo ?? undefined,
          loyaltyAccountId: loadPayload.loyaltyAccountId ?? undefined,
          points: 0,
          status: "active",
          createdAt: new Date().toISOString(),
        });
      }
    } catch {
      // Member hydration is best-effort; order still carries memberId.
    }
  } else {
    setSelectedMember(null);
  }

  try {
    const order = await fetchOrderRemote(loadPayload.linkedOrderId);
    if (setCart) {
      hydrateCartFromOrder(order, setCart, getCartLength?.() ?? 0);
    }
  } catch {
    // Order fetch failure is surfaced when cashier acts on the bill.
  }
}
