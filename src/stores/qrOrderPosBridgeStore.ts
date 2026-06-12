import { create } from "zustand";

export type QrOrderPosCartItem = {
  id: string;
  menuItemId: number;
  name: string;
  price: number;
  qty: number;
  emoji?: string | null;
  notes?: string | null;
};

export type QrOrderPosDraftSession = {
  sessionType: "qr_order";
  sourceOrderCode: string;
};

export type QrOrderPosLoadPayload = {
  requestId: string;
  requestCode: string;
  outletId: number;
  tableId: number;
  tableName?: string | null;
  customerName?: string | null;
  linkedOrderId?: string | null;
  linkedOrderCode?: string | null;
  items: QrOrderPosCartItem[];
  subtotal: number;
  tax: number;
  total: number;
};

type QrOrderPosBridgeState = {
  draftSession: QrOrderPosDraftSession | null;
  loadPayload: QrOrderPosLoadPayload | null;
  setFromOpenInPos: (draftSession: QrOrderPosDraftSession, loadPayload: QrOrderPosLoadPayload) => void;
  clear: () => void;
};

export const useQrOrderPosBridgeStore = create<QrOrderPosBridgeState>((set) => ({
  draftSession: null,
  loadPayload: null,
  setFromOpenInPos: (draftSession, loadPayload) => set({ draftSession, loadPayload }),
  clear: () => set({ draftSession: null, loadPayload: null }),
}));
