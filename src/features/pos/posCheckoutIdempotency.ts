export function createCheckoutAttemptId(scope: string): string {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `pos-checkout-${scope}-${suffix}`;
}

export function qrCheckoutIdempotencyKey(qrOrderRequestId: string | number): string {
  return `pos-qr-checkout-${qrOrderRequestId}`;
}

export function resolveCheckoutIdempotencyKey(input: {
  currentOrderId?: string | null;
  qrOrderRequestId?: string | number | null;
  scope?: string;
}): string {
  if (input.currentOrderId) {
    return `pos-checkout-order-${input.currentOrderId}`;
  }
  if (input.qrOrderRequestId) {
    return qrCheckoutIdempotencyKey(input.qrOrderRequestId);
  }
  return createCheckoutAttemptId(input.scope ?? "pay-now");
}
