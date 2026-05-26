import type { LucideIcon } from "lucide-react";
import { Banknote, CreditCard, QrCode, Smartphone } from "lucide-react";
import type { OutletPaymentMethodConfigApi } from "@/lib/api-integration/outletPaymentMethodEndpoints";

/** Fallback when API unavailable — Cash + static QRIS only (owner default). */
export const FALLBACK_CHECKOUT_METHODS: OutletPaymentMethodConfigApi[] = [
  {
    id: 0,
    outletId: 0,
    paymentMethodCode: "cash",
    type: "cash",
    enabled: true,
    displayOrder: 10,
    isDefault: true,
    label: "Cash",
    settlementMethod: "cash",
    isCash: true,
    isGateway: false,
    isManualQris: false,
  },
  {
    id: 0,
    outletId: 0,
    paymentMethodCode: "manual_qris",
    type: "manual_qris",
    provider: "manual",
    enabled: true,
    displayOrder: 20,
    isDefault: false,
    label: "QRIS",
    settlementMethod: "qris",
    isCash: false,
    isGateway: false,
    isManualQris: true,
    settings: { instructions: "Scan the outlet QRIS, then confirm after verification." },
  },
];

export function iconForCheckoutMethod(method: OutletPaymentMethodConfigApi): LucideIcon {
  if (method.isCash || method.type === "cash") return Banknote;
  if (method.isManualQris || method.type === "manual_qris") return QrCode;
  if (method.type === "gateway_qris") return QrCode;
  if (method.paymentMethodCode === "gateway_ewallet" || method.type === "future_gateway") return Smartphone;
  return CreditCard;
}

export function isGatewayCheckoutMethod(method: OutletPaymentMethodConfigApi): boolean {
  return Boolean(
    method.isGateway ||
      method.type === "gateway_qris" ||
      method.type === "future_gateway" ||
      method.type === "future_terminal",
  );
}

export function isManualQrisCheckoutMethod(method: OutletPaymentMethodConfigApi): boolean {
  return Boolean(method.isManualQris || method.type === "manual_qris");
}

export function isCashCheckoutMethod(method: OutletPaymentMethodConfigApi): boolean {
  return Boolean(method.isCash || method.type === "cash");
}

export function settlementMethodForCheckout(method: OutletPaymentMethodConfigApi): string {
  return method.settlementMethod || (method.type === "cash" ? "cash" : "qris");
}
