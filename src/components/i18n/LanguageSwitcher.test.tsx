// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

const updateMerchant = vi.fn();
const patchMerchantSettings = vi.fn().mockResolvedValue({ language: "id" });

vi.mock("@/stores/settingsStore", () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      merchant: {
        name: "Demo",
        businessType: "Restaurant",
        address: "",
        phone: "",
        email: "demo@resto.local",
        currency: "IDR",
        timezone: "Asia/Jakarta",
        language: "en",
      },
      updateMerchant,
    }),
}));

vi.mock("@/lib/api-integration/client", () => ({
  getApiAccessToken: () => null,
  ApiHttpError: class ApiHttpError extends Error {},
}));

vi.mock("@/lib/api-integration/settingsDomainEndpoints", () => ({
  patchMerchantSettings: (...args: unknown[]) => patchMerchantSettings(...args),
}));

describe("LanguageSwitcher", () => {
  beforeEach(async () => {
    updateMerchant.mockClear();
    patchMerchantSettings.mockClear();
    Element.prototype.scrollIntoView = vi.fn();
    await i18n.changeLanguage("en");
  });

  it("switches UI locale when user selects Bahasa Indonesia", async () => {
    render(<LanguageSwitcher variant="login" />);

    fireEvent.click(screen.getByRole("combobox", { name: /language/i }));
    fireEvent.click(await screen.findByText("Bahasa Indonesia"));

    await waitFor(() => {
      expect(i18n.language).toBe("id");
    });

    expect(updateMerchant).toHaveBeenCalledWith(expect.objectContaining({ language: "id" }));
    expect(patchMerchantSettings).not.toHaveBeenCalled();
  });
});
