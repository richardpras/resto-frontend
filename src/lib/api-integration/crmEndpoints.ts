import { apiRequest } from "./client";

type ApiEnvelope<T> = {
  data: T;
  meta?: Record<string, unknown>;
  message?: string;
};

type ApiListEnvelope<T> = {
  data: T[];
  meta?: Record<string, unknown>;
  message?: string;
};

type QueryValue = string | number | boolean | null | undefined;

function withQuery(path: string, query?: Record<string, QueryValue>): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export type CrmApiListResult<TRow> = {
  rows: TRow[];
  meta: Record<string, unknown>;
};

export async function listCustomers(params: {
  outletId: number;
  page?: number;
  perPage?: number;
  search?: string;
}): Promise<CrmApiListResult<Record<string, unknown>>> {
  const response = await apiRequest<ApiListEnvelope<Record<string, unknown>>>(
    withQuery("/crm/customers", {
      outletId: params.outletId,
      page: params.page,
      perPage: params.perPage,
      search: params.search,
    }),
  );
  return { rows: response.data, meta: response.meta ?? {} };
}

export async function getCustomerById(customerId: string): Promise<Record<string, unknown>> {
  const response = await apiRequest<ApiEnvelope<Record<string, unknown>>>(`/crm/customers/${customerId}`);
  return response.data;
}

export async function listLoyaltyTiers(outletId: number): Promise<Record<string, unknown>[]> {
  const response = await apiRequest<ApiListEnvelope<Record<string, unknown>>>(
    withQuery("/crm/loyalty/tiers", { outletId }),
  );
  return response.data;
}

export async function listPointsLedger(params: {
  outletId: number;
  customerId?: string;
  page?: number;
  perPage?: number;
}): Promise<CrmApiListResult<Record<string, unknown>>> {
  const response = await apiRequest<ApiListEnvelope<Record<string, unknown>>>(
    withQuery("/crm/loyalty/points-ledger", {
      outletId: params.outletId,
      customerId: params.customerId,
      page: params.page,
      perPage: params.perPage,
    }),
  );
  return { rows: response.data, meta: response.meta ?? {} };
}

export async function redeemLoyaltyPoints(payload: {
  outletId: number;
  customerId: string;
  pointsUsed: number;
  amountValue: number;
  replayFingerprint?: string;
}): Promise<Record<string, unknown>> {
  const response = await apiRequest<ApiEnvelope<Record<string, unknown>>>("/crm/loyalty/redemptions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function listLoyaltyRedemptions(params: {
  outletId: number;
  customerId?: string;
  page?: number;
  perPage?: number;
}): Promise<CrmApiListResult<Record<string, unknown>>> {
  const response = await apiRequest<ApiListEnvelope<Record<string, unknown>>>(
    withQuery("/crm/loyalty/redemptions", {
      outletId: params.outletId,
      customerId: params.customerId,
      page: params.page,
      perPage: params.perPage,
    }),
  );
  return { rows: response.data, meta: response.meta ?? {} };
}

export async function listGiftCards(params: {
  outletId: number;
  page?: number;
  perPage?: number;
  customerId?: string;
}): Promise<CrmApiListResult<Record<string, unknown>>> {
  const response = await apiRequest<ApiListEnvelope<Record<string, unknown>>>(
    withQuery("/crm/gift-cards", {
      outletId: params.outletId,
      page: params.page,
      perPage: params.perPage,
      customerId: params.customerId,
    }),
  );
  return { rows: response.data, meta: response.meta ?? {} };
}

export async function getCrmDashboardSnapshot(outletId: number): Promise<Record<string, unknown>> {
  const response = await apiRequest<ApiEnvelope<Record<string, unknown>>>(
    withQuery("/crm/dashboard", { outletId }),
  );
  return response.data;
}
