import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetMerchantSettings = vi.fn();
const mockListOutlets = vi.fn();

vi.mock("@/lib/api-integration/client", () => ({
  getApiAccessToken: () => "token",
}));

vi.mock("@/domain/accessControl", () => ({
  selectUserCapabilities: () => ({
    settings: true,
    crm: false,
    monitoring: true,
    hardwareBridge: false,
    printerAdmin: false,
  }),
}));

vi.mock("@/lib/api-integration/settingsDomainEndpoints", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-integration/settingsDomainEndpoints")>(
    "@/lib/api-integration/settingsDomainEndpoints",
  );
  return {
    ...actual,
    getMerchantSettings: (...args: unknown[]) => mockGetMerchantSettings(...args),
    listOutlets: (...args: unknown[]) => mockListOutlets(...args),
    listTaxes: vi.fn(),
    listPrinters: vi.fn(),
    listPaymentMethods: vi.fn(),
    listBankAccounts: vi.fn(),
    getSystemSettings: vi.fn(),
    getIntegrationSettings: vi.fn(),
    getNumberingSettings: vi.fn(),
    listOutletReceiptSettings: vi.fn(),
  };
});

import { resetSettingsSectionRequestState, useSettingsStore } from "./settingsStore";

describe("settingsStore orchestration optimization", () => {
  beforeEach(() => {
    resetSettingsSectionRequestState();
    mockGetMerchantSettings.mockReset();
    mockListOutlets.mockReset();
    mockGetMerchantSettings.mockResolvedValue({
      name: "Demo Merchant",
      businessType: "Restaurant",
      address: "",
      phone: "",
      email: "demo@resto.local",
      currency: "IDR",
      timezone: "Asia/Jakarta",
      language: "en",
    });
    mockListOutlets.mockResolvedValue([]);
  });

  it("dedupes concurrent section fetches", async () => {
    const store = useSettingsStore.getState();
    await Promise.all([
      store.ensureSectionsLoaded(["merchant"], { staleMs: 60_000 }),
      store.ensureSectionsLoaded(["merchant"], { staleMs: 60_000 }),
    ]);
    expect(mockGetMerchantSettings).toHaveBeenCalledTimes(1);
  });

  it("reuses cached section data within stale window", async () => {
    const store = useSettingsStore.getState();
    await store.ensureSectionsLoaded(["merchant"], { staleMs: 60_000 });
    await store.ensureSectionsLoaded(["merchant"], { staleMs: 60_000 });
    expect(mockGetMerchantSettings).toHaveBeenCalledTimes(1);
  });

  it("forces reload when force option is enabled", async () => {
    const store = useSettingsStore.getState();
    await store.ensureSectionsLoaded(["merchant"], { staleMs: 60_000 });
    await store.ensureSectionsLoaded(["merchant"], { force: true, staleMs: 0 });
    expect(mockGetMerchantSettings).toHaveBeenCalledTimes(2);
  });
});
