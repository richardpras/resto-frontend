import type { PaymentTransactionApi, PaymentTransactionStatus } from "@/lib/api-integration/paymentEndpoints";

export type PaymentTransaction = {
  id: string;
  orderId: string | null;
  outletId: number | null;
  method: string;
  amount: number;
  status: PaymentTransactionStatus;
  checkoutUrl: string;
  qrString: string;
  deeplinkUrl: string;
  vaNumber: string;
  expiresAt: Date | null;
  expiryTime: Date | null;
  paidAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  providerMetadataSnapshot: Record<string, unknown> | null;
  payloadSnapshot: Record<string, unknown> | null;
};

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function mapPaymentTransactionApiToModel(row: PaymentTransactionApi): PaymentTransaction {
  const expiresAt = parseDate(row.expiresAt ?? row.expires_at ?? row.expiryTime ?? row.expiry_time);
  return {
    id: String(row.id),
    orderId:
      row.orderId === undefined && row.order_id === undefined
        ? null
        : String(row.orderId ?? row.order_id),
    outletId: row.outletId ?? row.outlet_id ?? null,
    method: row.method,
    amount: row.amount,
    status: row.status,
    checkoutUrl: row.checkoutUrl ?? row.checkout_url ?? "",
    qrString: row.qrString ?? row.qr_string ?? "",
    deeplinkUrl: row.deeplinkUrl ?? row.deeplink_url ?? "",
    vaNumber: row.vaNumber ?? row.va_number ?? "",
    expiresAt,
    expiryTime: expiresAt,
    paidAt: parseDate(row.paidAt ?? row.paid_at),
    createdAt: parseDate(row.createdAt ?? row.created_at),
    updatedAt: parseDate(row.updatedAt ?? row.updated_at),
    providerMetadataSnapshot:
      row.providerMetadataSnapshot ?? row.provider_metadata_snapshot ?? null,
    payloadSnapshot: row.payloadSnapshot ?? row.payload_snapshot ?? null,
  };
}

export function getPaymentTransactionIdFromSearchParams(params: URLSearchParams): string {
  return (
    params.get("transaction") ??
    params.get("transaction_id") ??
    params.get("payment_transaction_id") ??
    params.get("tx") ??
    params.get("id") ??
    ""
  );
}
