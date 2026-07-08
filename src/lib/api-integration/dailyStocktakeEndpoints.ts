import { apiRequest as request } from "./client";

export type DailyStocktakeStatus = "draft" | "pending_approval" | "posted" | "cancelled";

export type DailyStocktakeLine = {
  id: number;
  ingredientId: string;
  ingredientName?: string | null;
  ingredientUnit?: string | null;
  previousClosingQty: number;
  openingQty: number | null;
  closingQty: number | null;
  purchasesQty: number;
  theoreticalUsageQty: number;
  overnightVarianceQty: number;
  operationalVarianceQty: number;
  unitCost: number;
};

export type DailyStocktakeSession = {
  id: number;
  outletId: number;
  businessDate: string;
  status: DailyStocktakeStatus;
  openingSubmittedAt?: string | null;
  closingSubmittedAt?: string | null;
  postedAt?: string | null;
  notes?: string | null;
  lines?: DailyStocktakeLine[];
};

export type DailyStocktakeCountInput = {
  ingredientId: number;
  openingQty?: number;
  closingQty?: number;
};

export async function listDailyStocktakeSessions(
  outletId: number,
  from?: string,
  to?: string,
): Promise<DailyStocktakeSession[]> {
  const params = new URLSearchParams({ outletId: String(outletId) });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const res = await request<{ data: DailyStocktakeSession[] }>(`/inventory/daily-stocktake?${params.toString()}`);
  return res.data;
}

export async function createDailyStocktakeSession(
  outletId: number,
  businessDate: string,
): Promise<DailyStocktakeSession> {
  const res = await request<{ data: DailyStocktakeSession }>("/inventory/daily-stocktake", {
    method: "POST",
    body: JSON.stringify({ outletId, businessDate }),
  });
  return res.data;
}

export async function getDailyStocktakeSession(sessionId: number): Promise<DailyStocktakeSession> {
  const res = await request<{ data: DailyStocktakeSession }>(`/inventory/daily-stocktake/${sessionId}`);
  return res.data;
}

export async function saveDailyStocktakeOpening(
  sessionId: number,
  lines: DailyStocktakeCountInput[],
): Promise<DailyStocktakeSession> {
  const res = await request<{ data: DailyStocktakeSession }>(`/inventory/daily-stocktake/${sessionId}/opening`, {
    method: "PATCH",
    body: JSON.stringify({ lines }),
  });
  return res.data;
}

export async function saveDailyStocktakeClosing(
  sessionId: number,
  lines: DailyStocktakeCountInput[],
): Promise<DailyStocktakeSession> {
  const res = await request<{ data: DailyStocktakeSession }>(`/inventory/daily-stocktake/${sessionId}/closing`, {
    method: "PATCH",
    body: JSON.stringify({ lines }),
  });
  return res.data;
}

export async function submitDailyStocktake(sessionId: number): Promise<DailyStocktakeSession> {
  const res = await request<{ data: DailyStocktakeSession }>(`/inventory/daily-stocktake/${sessionId}/submit`, {
    method: "POST",
  });
  return res.data;
}

export async function approveDailyStocktake(sessionId: number): Promise<DailyStocktakeSession> {
  const res = await request<{ data: DailyStocktakeSession }>(`/inventory/daily-stocktake/${sessionId}/approve`, {
    method: "POST",
  });
  return res.data;
}

export async function cancelDailyStocktake(sessionId: number): Promise<DailyStocktakeSession> {
  const res = await request<{ data: DailyStocktakeSession }>(`/inventory/daily-stocktake/${sessionId}/cancel`, {
    method: "POST",
  });
  return res.data;
}
