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

export function isGatewayPaymentMethod(method: string): boolean {
  return method !== "cash";
}
