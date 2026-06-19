import { create } from "zustand";

export type ReservationPosDraftSession = {
  sessionType: "reservation";
  reservationCode: string;
};

export type ReservationPosLoadPayload = {
  reservationId: number;
  reservationCode: string;
  outletId: number;
  linkedOrderId: string;
  linkedOrderCode?: string | null;
  tableId: number | null;
  tableName?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  memberId?: number | null;
  memberNo?: string | null;
  memberName?: string | null;
  loyaltyAccountId?: string | null;
};

type ReservationPosBridgeState = {
  draftSession: ReservationPosDraftSession | null;
  loadPayload: ReservationPosLoadPayload | null;
  setFromOpenInPos: (draftSession: ReservationPosDraftSession, loadPayload: ReservationPosLoadPayload) => void;
  clear: () => void;
};

export const useReservationPosBridgeStore = create<ReservationPosBridgeState>((set) => ({
  draftSession: null,
  loadPayload: null,
  setFromOpenInPos: (draftSession, loadPayload) => set({ draftSession, loadPayload }),
  clear: () => set({ draftSession: null, loadPayload: null }),
}));
