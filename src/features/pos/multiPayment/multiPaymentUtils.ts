import type { OutletPaymentMethodConfigApi } from "@/lib/api-integration/outletPaymentMethodEndpoints";
import {
  isCashCheckoutMethod,
  isGatewayCheckoutMethod,
  isManualQrisCheckoutMethod,
} from "@/features/pos/paymentMethodCapabilities";
import { isGatewayPaymentMethod } from "@/features/pos/paymentMethodUtils";
import type { PaymentDraftLine, PartitionedDraft } from "./multiPaymentTypes";

const SETTLEMENT_TOLERANCE = 0.02;

export function draftTotal(lines: PaymentDraftLine[]): number {
  return lines.reduce((sum, line) => sum + Math.max(0, line.amount), 0);
}

/** `balanceDue` is the current outstanding amount still owed on the order. */
export function remainingToAllocate(balanceDue: number, lines: PaymentDraftLine[]): number {
  return Math.max(0, balanceDue - draftTotal(lines));
}

export function validateFullSettlement(
  lines: PaymentDraftLine[],
  balanceDue: number,
): { ok: true } | { ok: false; reason: "empty" | "mismatch" | "zero_balance" } {
  if (balanceDue <= 0) return { ok: false, reason: "zero_balance" };
  if (lines.length === 0) return { ok: false, reason: "empty" };
  const total = draftTotal(lines);
  if (Math.abs(total - balanceDue) > SETTLEMENT_TOLERANCE) {
    return { ok: false, reason: "mismatch" };
  }
  return { ok: true };
}

export function clampDraftAmount(amount: number, maxAmount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (!Number.isFinite(maxAmount) || maxAmount <= 0) return 0;
  return Math.min(Math.floor(amount), Math.floor(maxAmount));
}

export function findCheckoutMethodByCode(
  checkoutMethods: OutletPaymentMethodConfigApi[],
  code: string,
): OutletPaymentMethodConfigApi | undefined {
  return checkoutMethods.find((m) => m.paymentMethodCode === code);
}

export function partitionDraftByCapability(
  lines: PaymentDraftLine[],
  checkoutMethods: OutletPaymentMethodConfigApi[],
): PartitionedDraft {
  const immediate: PaymentDraftLine[] = [];
  const gateway: PaymentDraftLine[] = [];
  const manualQris: PaymentDraftLine[] = [];

  for (const line of lines) {
    const config = checkoutMethods.find((m) => m.label === line.methodLabel);
    if (config && isManualQrisCheckoutMethod(config)) {
      manualQris.push(line);
    } else if (config && isGatewayCheckoutMethod(config)) {
      gateway.push(line);
    } else if (config && isCashCheckoutMethod(config)) {
      immediate.push(line);
    } else if (isGatewayPaymentMethod(line.method, checkoutMethods)) {
      gateway.push(line);
    } else {
      immediate.push(line);
    }
  }

  return { immediate, gateway, manualQris };
}

export function draftLinesToPaymentPayload(
  lines: PaymentDraftLine[],
  paidAt: string = new Date().toISOString(),
): Array<{ method: string; amount: number; paidAt: string }> {
  return lines.map((line) => ({
    method: line.method,
    amount: line.amount,
    paidAt,
  }));
}

export function resolveGatewayTransactionMethod(
  gatewayLines: PaymentDraftLine[],
): string {
  if (gatewayLines.length === 0) return "qris";
  if (gatewayLines.length === 1) return gatewayLines[0].method;
  const methods = new Set(gatewayLines.map((line) => line.method));
  if (methods.size === 1) return gatewayLines[0].method;
  return "mixed";
}

export function hasManualQrisOnly(partition: PartitionedDraft): boolean {
  return (
    partition.manualQris.length > 0 &&
    partition.immediate.length === 0 &&
    partition.gateway.length === 0
  );
}

export function hasGatewayOnly(partition: PartitionedDraft): boolean {
  return (
    partition.gateway.length > 0 &&
    partition.immediate.length === 0 &&
    partition.manualQris.length === 0
  );
}

export function isGatewayCheckoutMethodForApiMethod(
  apiMethod: string,
  checkoutMethods: OutletPaymentMethodConfigApi[],
): boolean {
  const matching = checkoutMethods.filter((m) => m.settlementMethod === apiMethod);
  return matching.some(isGatewayCheckoutMethod);
}
