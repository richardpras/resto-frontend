import { apiRequest as request } from "./client";

/**
 * Optional override: must match a `providers` key on the API (`config/payments.php`).
 * If unset, omit `provider` on `POST /payment-transactions` so the API uses `PAYMENT_DEFAULT_PROVIDER` from server `.env`.
 */
function paymentProviderFromVite(): string | undefined {
  const v = import.meta.env.VITE_PAYMENT_DEFAULT_PROVIDER;
  if (typeof v !== "string" || v.trim() === "") return undefined;
  return v.trim().toLowerCase();
}

function randomSuffix(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 14);
}

/** Stable per-checkout references required by `POST /payment-transactions` (Laravel validation). */
export function makePaymentCorrelationIds(orderId: string | number): {
  externalReference: string;
  idempotencyKey: string;
} {
  const ts = Date.now();
  const r = randomSuffix();
  const o = String(orderId);
  return {
    externalReference: `resto-order-${o}-${ts}-${r}`,
    idempotencyKey: `idem-order-${o}-${ts}-${r}`,
  };
}

/**
 * Maps POS / order `method` strings to API `paymentMethod` (`StorePaymentTransactionRequest` enum).
 */
export function mapOrderMethodToGatewayPaymentMethod(method: string): string | undefined {
  const m = method.toLowerCase().trim();
  if (m === "cash") return undefined;
  if (m === "qris") return "qris";
  if (m === "ewallet") return "ewallet";
  if (m === "bank_transfer" || m === "transfer") return "bank_transfer";
  if (m === "card") return "cashless";
  if (m === "mixed") return "qris";
  return "ewallet";
}

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
  /** If omitted, generated (unique per attempt). */
  externalReference?: string;
  /** If omitted, generated (unique per attempt). */
  idempotencyKey?: string;
  currency?: string;
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
  const generated = makePaymentCorrelationIds(payload.orderId);
  const externalReference = payload.externalReference ?? generated.externalReference;
  const idempotencyKey = payload.idempotencyKey ?? generated.idempotencyKey;
  const explicitProvider = payload.provider?.trim();
  const providerToSend =
    explicitProvider && explicitProvider.length > 0
      ? explicitProvider.toLowerCase()
      : paymentProviderFromVite();
  const paymentMethod = mapOrderMethodToGatewayPaymentMethod(payload.method);

  const payloadSnapshot: Record<string, unknown> = {};
  if (payload.splitPayments && payload.splitPayments.length > 0) {
    payloadSnapshot.splitPayments = payload.splitPayments;
  }
  if (payload.providerMetadata && Object.keys(payload.providerMetadata).length > 0) {
    payloadSnapshot.clientProviderMetadata = payload.providerMetadata;
  }

  const body: Record<string, unknown> = {
    orderId: payload.orderId,
    outletId: payload.outletId,
    externalReference,
    idempotencyKey,
    amount: payload.amount,
    currency: payload.currency ?? "IDR",
  };
  if (providerToSend) {
    body.provider = providerToSend;
  }
  if (paymentMethod) {
    body.paymentMethod = paymentMethod;
  }
  if (Object.keys(payloadSnapshot).length > 0) {
    body.payloadSnapshot = payloadSnapshot;
  }

  const response = await request<{ data: PaymentTransactionApi; message?: string }>(
    "/payment-transactions",
    {
      method: "POST",
      body: JSON.stringify(body),
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

export async function expirePaymentTransaction(
  id: string,
  options: PaymentRequestOptions = {},
): Promise<PaymentTransactionApi> {
  const response = await request<{ data: PaymentTransactionApi }>(`/payment-transactions/${id}/expire`, {
    method: "POST",
    signal: options.signal,
    headers: options.headers,
  });
  return response.data;
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

export async function simulateSandboxXenditPaidTransaction(
  id: string,
  options: PaymentRequestOptions = {},
): Promise<PaymentTransactionApi> {
  const response = await request<{ data: PaymentTransactionApi }>(`/payments/xendit/simulate-paid/${id}`, {
    method: "POST",
    signal: options.signal,
    headers: options.headers,
  });
  return response.data;
}

export async function simulateViaXenditProvider(
  id: string,
  options: PaymentRequestOptions = {},
): Promise<PaymentTransactionApi> {
  const response = await request<{ data: PaymentTransactionApi }>(`/payments/xendit/simulate-provider/${id}`, {
    method: "POST",
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
