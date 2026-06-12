import { ApiHttpError } from "@/lib/api-integration/client";

export type PosPaymentFailurePayload = {
  orderId?: number | string;
  orderCode?: string;
  message: string;
};

export function parsePosPaymentFailure(error: unknown): PosPaymentFailurePayload | null {
  if (!(error instanceof ApiHttpError)) {
    return null;
  }

  const body = error.body;
  if (!body || typeof body !== "object") {
    return null;
  }

  const record = body as Record<string, unknown>;
  const orderId = record.orderId ?? record.order_id;
  const orderCode = record.orderCode ?? record.order_code;

  if (orderId === undefined && orderCode === undefined) {
    return null;
  }

  return {
    orderId: orderId as number | string | undefined,
    orderCode: typeof orderCode === "string" ? orderCode : undefined,
    message: typeof record.message === "string" ? record.message : error.message,
  };
}

export function paymentFailureRecoveryMessage(orderCode?: string | null): string {
  if (orderCode) {
    return `Payment failed. Order ${orderCode} has been saved as an open bill. Please review and continue payment from Open Bills.`;
  }
  return "Payment failed. The order has been saved as an open bill. Please review and continue payment from Open Bills.";
}
