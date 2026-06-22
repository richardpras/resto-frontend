import { apiRequest as request } from "./client";

type MessageEnvelope<T> = { message?: string; data: T };

export type PosSessionDrawerReconciliation = {
  openingCash: number;
  cashSales: number;
  cashRefunds: number;
  cashExpenses: number;
  cashIn: number;
  cashOut: number;
  expected: number;
  actual?: number | null;
  variance?: number | null;
  status?: string;
  limitations?: string[];
};

export type PosSessionClosePreview = {
  sessionId: number;
  outletId: number;
  defaultCashFloat: number;
  drawerReconciliation: PosSessionDrawerReconciliation;
};

export type PosSessionApi = {
  id: number;
  outletId: number;
  openedByUserId: number;
  closedByUserId: number | null;
  status: "open" | "closed";
  openingCash: number;
  closingCash: number | null;
  expectedCash: number | null;
  actualCash: number | null;
  cashVariance: number | null;
  openedAt: string;
  closedAt: string | null;
  notes: string | null;
};

export async function openPosSession(payload: {
  outletId: number;
  openingCash?: number;
  openedAt?: string;
  notes?: string;
}): Promise<PosSessionApi> {
  const response = await request<MessageEnvelope<PosSessionApi>>("/pos-sessions/open", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function getPosSessionClosePreview(sessionId: number): Promise<PosSessionClosePreview> {
  const response = await request<{ data: PosSessionClosePreview }>(
    `/pos-sessions/${encodeURIComponent(String(sessionId))}/close-preview`,
  );
  return response.data;
}

export async function closePosSession(
  sessionId: number,
  payload: { actualCash: number; closedAt?: string; notes?: string },
): Promise<PosSessionApi> {
  const response = await request<MessageEnvelope<PosSessionApi>>(`/pos-sessions/${encodeURIComponent(String(sessionId))}/close`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function getCurrentPosSession(
  outletId: number,
): Promise<{ session: PosSessionApi | null; defaultCashFloat: number }> {
  const response = await request<{ data: PosSessionApi | null; meta?: { defaultCashFloat?: number } }>(
    `/pos-sessions/current?outletId=${encodeURIComponent(String(outletId))}`,
  );
  return {
    session: response.data,
    defaultCashFloat: Number(response.meta?.defaultCashFloat ?? 500000),
  };
}
