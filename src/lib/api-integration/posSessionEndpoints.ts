import { apiRequest as request } from "./client";

type MessageEnvelope<T> = { message?: string; data: T };

export type PosSessionApi = {
  id: number;
  outletId: number;
  openedByUserId: number;
  closedByUserId: number | null;
  status: "open" | "closed";
  openingCash: number;
  closingCash: number | null;
  cashVariance: number | null;
  openedAt: string;
  closedAt: string | null;
  notes: string | null;
};

export async function openPosSession(payload: {
  outletId: number;
  openingCash: number;
  openedAt?: string;
  notes?: string;
}): Promise<PosSessionApi> {
  const response = await request<MessageEnvelope<PosSessionApi>>("/pos-sessions/open", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function closePosSession(
  sessionId: number,
  payload: { closingCash: number; closedAt?: string; notes?: string },
): Promise<PosSessionApi> {
  const response = await request<MessageEnvelope<PosSessionApi>>(`/pos-sessions/${encodeURIComponent(String(sessionId))}/close`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function getCurrentPosSession(outletId: number): Promise<PosSessionApi | null> {
  const response = await request<{ data: PosSessionApi | null }>(
    `/pos-sessions/current?outletId=${encodeURIComponent(String(outletId))}`,
  );
  return response.data;
}
