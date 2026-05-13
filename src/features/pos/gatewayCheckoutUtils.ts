import type { Order } from "@/stores/orderStore";
import type { PaymentTransactionStatus } from "@/lib/api-integration/paymentEndpoints";
import type { OrderPaymentPayload } from "@/lib/api-integration/endpoints";
import type { CreatePaymentTransactionPayload } from "@/lib/api-integration/paymentEndpoints";

const TERMINAL_GATEWAY_STATUSES: PaymentTransactionStatus[] = ["paid", "failed", "expired", "cancelled"];

export function isTerminalGatewayStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return TERMINAL_GATEWAY_STATUSES.includes(status as PaymentTransactionStatus);
}

export function canReuseCheckoutOrder(
  currentOrderId: string | null,
  order: Order | null | undefined,
): boolean {
  if (!currentOrderId || !order) return false;
  if (String(order.id) !== String(currentOrderId)) return false;
  if (order.status === "cancelled") return false;
  return order.paymentStatus !== "paid";
}

export function gatewayMethodsMatch(left: string, right: string): boolean {
  return left.toLowerCase().trim() === right.toLowerCase().trim();
}

export function shouldBlockDuplicateGatewayAttempt(
  pendingMethod: string | null | undefined,
  selectedApiMethod: string,
): boolean {
  if (!pendingMethod) return false;
  return gatewayMethodsMatch(pendingMethod, selectedApiMethod);
}

export function gatewayRetryLabel(method: string): string {
  return method.toLowerCase() === "qris" ? "Retry QRIS Payment" : "Retry Payment";
}

export function pendingGatewayCheckoutTotal(batch: OrderPaymentPayload[]): number {
  return batch.reduce((sum, row) => sum + row.amount, 0);
}

export function remapSettlementBatchMethod(
  batch: OrderPaymentPayload[],
  method: string,
): OrderPaymentPayload[] {
  const paidAt = new Date().toISOString();
  return batch.map((row) => ({ ...row, method, paidAt }));
}

export function splitPaymentsForGatewayCreate(
  batch: OrderPaymentPayload[],
): CreatePaymentTransactionPayload["splitPayments"] {
  return batch.map((row) => ({
    method: row.method,
    amount: row.amount,
    allocations: row.allocations?.map((allocation) => ({
      orderItemId: allocation.orderItemId,
      qty: allocation.qty,
      amount: allocation.amount,
    })),
  }));
}

export function splitPaymentsFromTransactionSnapshot(
  payloadSnapshot: Record<string, unknown> | null | undefined,
): CreatePaymentTransactionPayload["splitPayments"] | undefined {
  const raw = payloadSnapshot?.splitPayments;
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  return raw as CreatePaymentTransactionPayload["splitPayments"];
}
