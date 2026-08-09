import type { OutletPaymentMethodConfigApi } from "@/lib/api-integration/outletPaymentMethodEndpoints";
import {
  FALLBACK_CHECKOUT_METHODS,
  isCashCheckoutMethod,
  isGatewayCheckoutMethod,
  isManualQrisCheckoutMethod,
  settlementMethodForCheckout,
} from "@/features/pos/paymentMethodCapabilities";

/** Labels shown on POS / Cashier payment tiles — maps to API `method` strings. */
export const PAYMENT_LABEL_TO_API: Record<string, string> = {
  Cash: "cash",
  QRIS: "qris",
  "E-Wallet": "ewallet",
  Card: "card",
};

export function toApiPaymentMethod(label: string): string {
  return PAYMENT_LABEL_TO_API[label] ?? label.toLowerCase().replace(/\s+/g, "-");
}

export function apiMethodFromCheckoutMethod(method: OutletPaymentMethodConfigApi): string {
  return settlementMethodForCheckout(method);
}

export function checkoutMethodMatchesLabel(
  method: OutletPaymentMethodConfigApi,
  labelOrCode: string,
): boolean {
  return (
    method.label === labelOrCode ||
    method.paymentMethodCode === labelOrCode ||
    method.settlementMethod === labelOrCode ||
    method.type === labelOrCode
  );
}

/** Resolve tile label / paymentMethodCode / settlement method → API settlement method. */
export function resolveSettlementMethod(
  methodOrLabelOrCode: string,
  checkoutMethods?: OutletPaymentMethodConfigApi[],
): string {
  const methods = checkoutMethods?.length ? checkoutMethods : FALLBACK_CHECKOUT_METHODS;
  const matched = methods.find((m) => checkoutMethodMatchesLabel(m, methodOrLabelOrCode));
  if (matched) return settlementMethodForCheckout(matched);
  return toApiPaymentMethod(methodOrLabelOrCode);
}

export function findCheckoutMethodBySelection(
  methodOrLabelOrCode: string,
  checkoutMethods?: OutletPaymentMethodConfigApi[],
): OutletPaymentMethodConfigApi | undefined {
  const methods = checkoutMethods?.length ? checkoutMethods : FALLBACK_CHECKOUT_METHODS;
  return methods.find((m) => checkoutMethodMatchesLabel(m, methodOrLabelOrCode));
}

/** Whether settlement should go through payment gateway API (not direct order payments). */
export function isGatewayPaymentMethod(
  method: string,
  checkoutMethods?: OutletPaymentMethodConfigApi[],
): boolean {
  const methods = checkoutMethods?.length ? checkoutMethods : undefined;
  const matched = methods?.find((m) => checkoutMethodMatchesLabel(m, method));
  if (matched) {
    if (isCashCheckoutMethod(matched) || isManualQrisCheckoutMethod(matched)) return false;
    return isGatewayCheckoutMethod(matched);
  }

  const settlement = resolveSettlementMethod(method, methods);
  if (settlement === "cash") return false;

  if (methods?.length) {
    const matching = methods.filter((m) => m.settlementMethod === settlement);
    if (matching.some(isManualQrisCheckoutMethod)) return false;
    if (matching.some(isCashCheckoutMethod)) return false;
    if (matching.some(isGatewayCheckoutMethod)) return true;

    if (settlement === "qris") {
      return methods.some((m) => m.type === "gateway_qris" && m.enabled);
    }

    const legacyGateway = new Set(["ewallet", "card", "va", "bank_transfer"]);
    if (legacyGateway.has(settlement)) {
      return methods.some(isGatewayCheckoutMethod);
    }

    return false;
  }

  return settlement !== "cash";
}

/**
 * Offline POS may settle cash + manual/static QRIS without internet.
 * Real payment-gateway methods stay blocked until online.
 */
export function isPaymentMethodBlockedWhenOffline(
  method: string,
  checkoutMethods?: OutletPaymentMethodConfigApi[],
): boolean {
  const methods = checkoutMethods?.length ? checkoutMethods : FALLBACK_CHECKOUT_METHODS;
  const matched = findCheckoutMethodBySelection(method, methods);
  if (matched) {
    if (isCashCheckoutMethod(matched) || isManualQrisCheckoutMethod(matched)) return false;
    return isGatewayCheckoutMethod(matched);
  }

  const settlement = resolveSettlementMethod(method, methods);
  if (settlement === "cash" || settlement === "static_qris" || settlement === "manual_qris") {
    return false;
  }

  return isGatewayPaymentMethod(settlement, methods);
}
