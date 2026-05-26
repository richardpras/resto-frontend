import type { OutletPaymentMethodConfigApi } from "@/lib/api-integration/outletPaymentMethodEndpoints";
import {
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

/** Whether settlement should go through payment gateway API (not direct order payments). */
export function isGatewayPaymentMethod(
  method: string,
  checkoutMethods?: OutletPaymentMethodConfigApi[],
): boolean {
  if (method === "cash") return false;

  if (checkoutMethods?.length) {
    const matching = checkoutMethods.filter((m) => m.settlementMethod === method);
    if (matching.some(isManualQrisCheckoutMethod)) return false;
    if (matching.some(isCashCheckoutMethod)) return false;
    if (matching.some(isGatewayCheckoutMethod)) return true;

    if (method === "qris") {
      return checkoutMethods.some((m) => m.type === "gateway_qris" && m.enabled);
    }

    const legacyGateway = new Set(["ewallet", "card", "va", "bank_transfer"]);
    if (legacyGateway.has(method)) {
      return checkoutMethods.some(isGatewayCheckoutMethod);
    }

    return false;
  }

  return method !== "cash";
}

export function checkoutMethodMatchesLabel(
  method: OutletPaymentMethodConfigApi,
  labelOrCode: string,
): boolean {
  return method.label === labelOrCode || method.paymentMethodCode === labelOrCode;
}
