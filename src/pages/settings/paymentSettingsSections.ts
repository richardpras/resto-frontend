export type PaymentSettingsSection = "outlet" | "master";

export const PAYMENT_SETTINGS_SECTIONS: PaymentSettingsSection[] = ["outlet", "master"];

export const DEFAULT_PAYMENT_SETTINGS_SECTION: PaymentSettingsSection = "outlet";

export function resolvePaymentSettingsSection(value: string | null): PaymentSettingsSection {
  return value === "master" ? "master" : DEFAULT_PAYMENT_SETTINGS_SECTION;
}

/** Maps public URL tab aliases to internal Settings tab keys. */
export function normalizeSettingsTabKey(tab: string | null): string | null {
  if (tab === "payment-methods") return "payments";
  return tab;
}

/** Maps internal Settings tab key to canonical URL query value. */
export function settingsTabToUrlParam(tab: string): string {
  if (tab === "payments") return "payment-methods";
  return tab;
}
