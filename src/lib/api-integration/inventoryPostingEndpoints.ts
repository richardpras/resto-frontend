import { apiRequest as request } from "./client";

export type InventoryPostingHealth = {
  outletId: number | null;
  pendingPostings: number;
  reviewRequiredPostings: number;
  failedPostings: number;
  processedPostings?: number;
  openIncidents: number;
  openVariances?: number;
  stockVarianceTotal: number;
  postingSuccessRate?: number;
  pendingConsumptionValue?: number;
  negativeStockCount?: number;
  severity: "healthy" | "warning" | "critical";
  enforcementMode: "strict" | "warning" | "deferred";
};

export type InventoryConsumptionQueueRow = {
  id: number;
  outletId: number;
  orderId: number;
  orderCode: string;
  status: string;
  failureReason?: string | null;
  payload?: Record<string, unknown>;
  createdAt?: string | null;
  processedAt?: string | null;
  orderTotal?: number | null;
};

export type InventoryConsumptionPostResult = {
  processed: number;
  reviewRequired: number;
  failed: number;
  totalCogs: number;
};

export async function getInventoryPostingHealth(outletId: number): Promise<InventoryPostingHealth> {
  const res = await request<{ data: InventoryPostingHealth }>(
    `/inventory/posting-health?outletId=${outletId}`,
  );
  return res.data;
}

export async function getInventoryConsumptionQueue(
  outletId: number,
  status?: string,
): Promise<InventoryConsumptionQueueRow[]> {
  const params = new URLSearchParams({ outletId: String(outletId) });
  if (status) params.set("status", status);
  const res = await request<{ data: InventoryConsumptionQueueRow[] }>(
    `/inventory/consumption/queue?${params.toString()}`,
  );
  return res.data;
}

export async function postInventoryConsumption(outletId: number): Promise<InventoryConsumptionPostResult> {
  const res = await request<{ data: InventoryConsumptionPostResult }>("/inventory/consumption/post", {
    method: "POST",
    body: JSON.stringify({ outletId }),
  });
  return res.data;
}
