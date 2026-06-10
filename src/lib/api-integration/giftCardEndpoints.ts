import { apiRequest as request } from "./client";

type SuccessEnvelope<T> = {
  success?: boolean;
  message?: string;
  data: T;
};

export type GiftCardIssuanceApi = {
  id?: number | string;
  code?: string;
  instrumentType?: string;
  initialAmount?: number;
  remainingAmount?: number;
  status?: string;
  currency?: string;
  expiresAt?: string | null;
  outletId?: number;
  [key: string]: unknown;
};

export async function issueGiftCard(payload: {
  outletId: number;
  instrumentType: "gift_card" | "store_credit";
  code: string;
  initialAmount: number;
  currency?: string;
  expiresAt?: string;
  idempotencyKey: string;
  meta?: Record<string, unknown>;
}): Promise<{ idempotent: boolean; issuance: GiftCardIssuanceApi }> {
  const response = await request<SuccessEnvelope<{ idempotent: boolean; issuance: GiftCardIssuanceApi }>>("/gift-cards/issue", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function checkGiftCard(outletId: number, code: string): Promise<GiftCardIssuanceApi> {
  const response = await request<SuccessEnvelope<GiftCardIssuanceApi>>(
    `/gift-cards/${encodeURIComponent(code)}?outletId=${encodeURIComponent(String(outletId))}`,
  );
  return response.data;
}

export type GiftCardRedemptionSettlementApi = {
  id?: number;
  issuanceId?: number;
  outletId?: number;
  idempotencyKey?: string;
  settlementReference?: string | null;
  paymentTransactionId?: number | null;
  redeemedAmount?: number;
  status?: string;
  redeemedAt?: string | null;
  settledAt?: string | null;
  [key: string]: unknown;
};

export async function redeemGiftCard(payload: {
  outletId: number;
  code: string;
  amount: number;
  idempotencyKey: string;
  referenceType?: string;
  referenceId?: string;
  meta?: Record<string, unknown>;
}): Promise<{
  idempotent: boolean;
  issuance: GiftCardIssuanceApi;
  settlement: GiftCardRedemptionSettlementApi;
}> {
  const response = await request<
    SuccessEnvelope<{
      idempotent: boolean;
      issuance: GiftCardIssuanceApi;
      settlement: GiftCardRedemptionSettlementApi;
    }>
  >("/gift-cards/redeem", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function settleGiftCardRedemptions(payload: {
  outletId: number;
  idempotencyKey: string;
  settlementReference: string;
  settlementStatus: "pending" | "settled" | "failed" | "reversed";
  redeemSettlementIds: number[];
  paymentTransactionId?: number;
  meta?: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const response = await request<SuccessEnvelope<Record<string, unknown>>>("/gift-cards/settlements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}
