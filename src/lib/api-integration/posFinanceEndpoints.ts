import { apiRequest as request } from "./client";

type MessageEnvelope<T> = { message?: string; data: T };

export type ShiftCloseResult = {
  journalId?: number | string | null;
  postedOrders?: number;
  batchKey?: string;
  [key: string]: unknown;
};

export async function postShiftClose(payload: {
  tenantId?: number;
  outletId?: number;
  cashAccountCode?: string;
  revenueAccountCode?: string;
  cogsAccountCode?: string;
  inventoryAccountCode?: string;
}): Promise<ShiftCloseResult> {
  const response = await request<MessageEnvelope<ShiftCloseResult>>("/orders/shift-close", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}
