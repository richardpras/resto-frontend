import type { GiftCardIssuanceApi } from "@/lib/api-integration/giftCardEndpoints";

export type AppliedGiftCardCheckout = {
  code: string;
  availableBalance: number;
  appliedAmount: number;
  instrumentType?: string;
  status?: string;
  expiresAt?: string | null;
};

export function buildGiftCardRedeemIdempotencyKey(orderId: string | number, code: string): string {
  return `pos-gift-redeem-${orderId}-${code.trim().toUpperCase()}`;
}

export function buildGiftCardDirectSettleIdempotencyKey(orderId: string | number): string {
  return `pos-gift-settle-${orderId}`;
}

export function resolveGiftCardApplyAmount(
  requestedAmount: number,
  availableBalance: number,
  orderTotalBeforeGiftCard: number,
): number {
  const requested = Math.max(0, requestedAmount);
  const available = Math.max(0, availableBalance);
  const orderCap = Math.max(0, orderTotalBeforeGiftCard);
  if (requested > 0) {
    return Math.min(requested, available, orderCap);
  }
  return Math.min(available, orderCap);
}

export function giftCardCheckErrorMessage(issuance: GiftCardIssuanceApi): string | null {
  const status = String(issuance.status ?? "").toLowerCase();
  if (status === "expired") {
    return "Gift card or store credit has expired.";
  }
  if (status !== "active") {
    return "Gift card or store credit is not active.";
  }
  const balance = Number(issuance.balanceAmount ?? issuance.remainingAmount ?? 0);
  if (!Number.isFinite(balance) || balance <= 0) {
    return "Insufficient gift card or store credit balance.";
  }
  return null;
}

export function mapGiftCardApiError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("insufficient")) {
    return "Insufficient gift card or store credit balance.";
  }
  if (normalized.includes("expired")) {
    return "Gift card or store credit has expired.";
  }
  if (normalized.includes("not found") || normalized.includes("not active")) {
    return "Invalid gift card or store credit code.";
  }
  if (normalized.includes("idempotent") || normalized.includes("duplicate")) {
    return "Duplicate redemption attempt detected. Retry checkout safely.";
  }
  return message;
}

export function appliedGiftCardAmount(state: AppliedGiftCardCheckout | null): number {
  return state?.appliedAmount ?? 0;
}

export function remainingGiftCardBalance(state: AppliedGiftCardCheckout | null): number {
  if (!state) return 0;
  return Math.max(0, state.availableBalance - state.appliedAmount);
}
