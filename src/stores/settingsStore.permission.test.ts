import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetMerchantSettings = vi.fn();
const mockListOutlets = vi.fn();

vi.mock("@/lib/api-integration/client", () => ({
  getApiAccessToken: () => "token",
}));

vi.mock("@/domain/accessControl", () => ({
  selectUserCapabilities: () => ({
    settings: false,
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

import { useSettingsStore } from "./settingsStore";

describe("settingsStore permission guard", () => {
  beforeEach(() => {
    mockGetMerchantSettings.mockReset();
    mockListOutlets.mockReset();
  });

  it("does not call settings endpoints when access is denied", async () => {
    await useSettingsStore.getState().refreshFromApi();
    await useSettingsStore.getState().fetchOutlets({ page: 1, perPage: 10 });
    expect(mockGetMerchantSettings).not.toHaveBeenCalled();
    expect(mockListOutlets).not.toHaveBeenCalled();
  });
});

