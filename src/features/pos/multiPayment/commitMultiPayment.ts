import type { PaymentTransactionApi } from "@/lib/api-integration/paymentEndpoints";
import type { OrderPaymentPayload } from "@/lib/api-integration/endpoints";
import type { OutletPaymentMethodConfigApi } from "@/lib/api-integration/outletPaymentMethodEndpoints";
import type { Order } from "@/stores/orderStore";
import { splitPaymentsForGatewayCreate } from "@/features/pos/gatewayCheckoutUtils";
import type { PaymentDraftLine } from "./multiPaymentTypes";
import {
  draftLinesToPaymentPayload,
  partitionDraftByCapability,
  resolveGatewayTransactionMethod,
  validateFullSettlement,
} from "./multiPaymentUtils";

export type CommitMultiPaymentDeps = {
  orderId: string;
  outletId: number;
  balanceDue: number;
  draftLines: PaymentDraftLine[];
  checkoutMethods: OutletPaymentMethodConfigApi[];
  addOrderPaymentsRemote: (
    orderId: string,
    payments: OrderPaymentPayload[],
    options?: { idempotencyKey?: string },
  ) => Promise<Order>;
  paymentCreateTransaction: (payload: {
    orderId: string;
    outletId: number;
    method: string;
    amount: number;
    splitPayments?: ReturnType<typeof splitPaymentsForGatewayCreate>;
    giftCardSettlementIds?: number[];
  }) => Promise<PaymentTransactionApi>;
  buildPaymentPayload?: (method: string, amount: number) => OrderPaymentPayload;
  idempotencyKey?: string;
  giftCardSettlementIds?: number[];
};

export type CommitMultiPaymentResult =
  | { outcome: "completed"; order: Order }
  | {
      outcome: "gateway_pending";
      transaction: PaymentTransactionApi;
      gatewayPayments: OrderPaymentPayload[];
      orderAfterImmediate?: Order;
    }
  | {
      outcome: "manual_qris_pending";
      manualQrisPayments: OrderPaymentPayload[];
      pendingGatewayLines?: PaymentDraftLine[];
      orderAfterImmediate?: Order;
    };

function toPayload(
  lines: PaymentDraftLine[],
  buildPaymentPayload?: (method: string, amount: number) => OrderPaymentPayload,
): OrderPaymentPayload[] {
  if (buildPaymentPayload) {
    return lines.map((line) => buildPaymentPayload(line.method, line.amount));
  }
  return draftLinesToPaymentPayload(lines);
}

export async function commitMultiPayment(
  deps: CommitMultiPaymentDeps,
): Promise<CommitMultiPaymentResult> {
  const validation = validateFullSettlement(deps.draftLines, deps.balanceDue);
  if (!validation.ok) {
    throw new Error(
      validation.reason === "mismatch"
        ? "Draft payments must equal the balance due."
        : validation.reason === "empty"
          ? "Add at least one payment line."
          : "Nothing to pay.",
    );
  }

  const partition = partitionDraftByCapability(deps.draftLines, deps.checkoutMethods);
  const paymentOptions = deps.idempotencyKey
    ? { idempotencyKey: deps.idempotencyKey }
    : undefined;

  let orderAfterImmediate: Order | undefined;

  if (partition.immediate.length > 0) {
    const immediateBatch = toPayload(partition.immediate, deps.buildPaymentPayload);
    orderAfterImmediate = await deps.addOrderPaymentsRemote(
      deps.orderId,
      immediateBatch,
      paymentOptions,
    );
  }

  if (partition.manualQris.length > 0) {
    return {
      outcome: "manual_qris_pending",
      manualQrisPayments: toPayload(partition.manualQris, deps.buildPaymentPayload),
      pendingGatewayLines: partition.gateway.length > 0 ? partition.gateway : undefined,
      orderAfterImmediate,
    };
  }

  if (partition.gateway.length > 0) {
    const gatewayPayments = toPayload(partition.gateway, deps.buildPaymentPayload);
    const gatewayTotal = gatewayPayments.reduce((sum, row) => sum + row.amount, 0);
    const tx = await deps.paymentCreateTransaction({
      orderId: deps.orderId,
      outletId: deps.outletId,
      method: resolveGatewayTransactionMethod(partition.gateway),
      amount: gatewayTotal,
      splitPayments: splitPaymentsForGatewayCreate(gatewayPayments),
      giftCardSettlementIds:
        deps.giftCardSettlementIds && deps.giftCardSettlementIds.length > 0
          ? deps.giftCardSettlementIds
          : undefined,
    });
    return {
      outcome: "gateway_pending",
      transaction: tx,
      gatewayPayments,
      orderAfterImmediate,
    };
  }

  if (!orderAfterImmediate) {
    throw new Error("Payment commit completed without order update.");
  }

  return {
    outcome: "completed",
    order: orderAfterImmediate,
  };
}
