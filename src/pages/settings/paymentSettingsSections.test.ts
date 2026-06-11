import { describe, expect, it } from "vitest";
import {
  normalizeSettingsTabKey,
  resolvePaymentSettingsSection,
  settingsTabToUrlParam,
} from "./paymentSettingsSections";

describe("paymentSettingsSections", () => {
  it("maps payment-methods tab alias to internal payments key", () => {
    expect(normalizeSettingsTabKey("payment-methods")).toBe("payments");
    expect(normalizeSettingsTabKey("payments")).toBe("payments");
  });

  it("defaults section to outlet", () => {
    expect(resolvePaymentSettingsSection(null)).toBe("outlet");
    expect(resolvePaymentSettingsSection("outlet")).toBe("outlet");
    expect(resolvePaymentSettingsSection("master")).toBe("master");
  });

  it("maps payments tab to payment-methods URL param", () => {
    expect(settingsTabToUrlParam("payments")).toBe("payment-methods");
    expect(settingsTabToUrlParam("merchant")).toBe("merchant");
  });
});
