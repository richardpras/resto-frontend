// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { useLocaleSync } from "./useLocaleSync";

const ensureSectionsLoaded = vi.fn().mockResolvedValue(undefined);

vi.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: (state: { user: { id: number } | null }) => unknown) =>
    selector({ user: { id: 1 } }),
}));

vi.mock("@/stores/settingsStore", () => ({
  useSettingsStore: Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        merchant: { language: "id" },
        ensureSectionsLoaded,
      }),
    {
      getState: () => ({
        merchant: { language: "id" },
        ensureSectionsLoaded,
      }),
    },
  ),
}));

function LocaleSyncProbe() {
  useLocaleSync();
  return null;
}

describe("useLocaleSync", () => {
  beforeEach(async () => {
    ensureSectionsLoaded.mockClear();
    await i18n.changeLanguage("en");
  });

  it("loads merchant settings and applies merchant language after login", async () => {
    render(<LocaleSyncProbe />);

    await waitFor(() => {
      expect(ensureSectionsLoaded).toHaveBeenCalledWith(["merchant"]);
    });

    await waitFor(() => {
      expect(i18n.language).toBe("id");
    });
  });
});
