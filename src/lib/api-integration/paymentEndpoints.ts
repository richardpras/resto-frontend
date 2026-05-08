import { apiRequest as request } from "./client";

export type PaymentTransactionStatus =
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled";

export type PaymentTransactionApi = {
  id: string | number;
  orderId?: string | number | null;
  order_id?: string | number | null;
  outletId?: number | null;
  outlet_id?: number | null;
  method: string;
  amount: number;
  status: PaymentTransactionStatus;
  checkoutUrl?: string | null;
  checkout_url?: string | null;
  qrString?: string | null;
  qr_string?: string | null;
  deeplinkUrl?: string | null;
  deeplink_url?: string | null;
  va_number?: string | null;
  vaNumber?: string | null;
  expiresAt?: string | null;
  expires_at?: string | null;
  expiryTime?: string | null;
  expiry_time?: string | null;
  provider?: string | null;
  providerMetadataSnapshot?: Record<string, unknown> | null;
  provider_metadata_snapshot?: Record<string, unknown> | null;
  payloadSnapshot?: Record<string, unknown> | null;
  payload_snapshot?: Record<string, unknown> | null;
  paid_at?: string | null;
  paidAt?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
};

export type CreatePaymentTransactionPayload = {
  orderId: string | number;
  outletId?: number;
  method: string;
  amount: number;
  provider?: string;
  providerMetadata?: Record<string, unknown>;
  splitPayments?: {
    method: string;
    amount: number;
    allocations?: { orderItemId: string | number; qty: number; amount: number }[];
  }[];
};

type PaymentRequestOptions = {
  signal?: AbortSignal;
  headers?: HeadersInit;
};

export async function createPaymentTransaction(
  payload: CreatePaymentTransactionPayload,
  options: PaymentRequestOptions = {},
): Promise<PaymentTransactionApi> {
  const response = await request<{ data: PaymentTransactionApi; message?: string }>(
    "/payment-transactions",
    {
      method: "POST",
      body: JSON.stringify({
        orderId: payload.orderId,
        outletId: payload.outletId,
        method: payload.method,
        amount: payload.amount,
        ...(payload.provider ? { provider: payload.provider } : {}),
        ...(payload.providerMetadata ? { providerMetadata: payload.providerMetadata } : {}),
        ...(payload.splitPayments ? { splitPayments: payload.splitPayments } : {}),
      }),
      signal: options.signal,
      headers: options.headers,
    },
  );
  return response.data;
}

export async function getPaymentTransaction(
  id: string,
  options: PaymentRequestOptions = {},
): Promise<PaymentTransactionApi> {
  const response = await request<{ data: PaymentTransactionApi }>(`/payment-transactions/${id}`, {
    signal: options.signal,
    headers: options.headers,
  });
  return response.data;
}

export async function expirePaymentTransaction(id: string): Promise<PaymentTransactionApi> {
  const current = await getPaymentTransaction(id);
  return { ...current, status: "expired" };
}

export async function reconcilePaymentTransaction(
  id: string,
  options: PaymentRequestOptions = {},
): Promise<PaymentTransactionApi> {
  const response = await request<{ data: PaymentTransactionApi }>("/payment-transactions/reconcile", {
    method: "POST",
    body: JSON.stringify({ transactionId: id }),
    signal: options.signal,
    headers: options.headers,
  });
  return response.data;
}

export async function postPaymentWebhook(
  provider: string,
  payload: Record<string, unknown>,
  options: PaymentRequestOptions = {},
): Promise<PaymentTransactionApi> {
  const response = await request<{ data: PaymentTransactionApi }>(`/payment-webhooks/${provider}`, {
    method: "POST",
    body: JSON.stringify(payload),
    signal: options.signal,
    headers: options.headers,
  });
  return response.data;
}
