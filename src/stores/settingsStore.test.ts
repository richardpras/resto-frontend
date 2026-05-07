import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSettingsStore } from "./settingsStore";

const mockGetApiAccessToken = vi.fn();
const mockListOutlets = vi.fn();
const mockPostOutlet = vi.fn();
const mockPatchOutlet = vi.fn();
const mockDeleteOutletApi = vi.fn();

vi.mock("@/lib/api-integration/client", () => ({
  getApiAccessToken: () => mockGetApiAccessToken(),
}));

vi.mock("@/lib/api-integration/settingsDomainEndpoints", () => ({
  deleteBankAccountApi: vi.fn(),
  deleteOutletApi: (...args: unknown[]) => mockDeleteOutletApi(...args),
  deletePaymentMethodApi: vi.fn(),
  deletePrinterApi: vi.fn(),
  deleteTaxApi: vi.fn(),
  getIntegrationSettings: vi.fn().mockResolvedValue({
    paymentGatewayKey: "",
    webhookUrl: "",
    printAgentUrl: "http://localhost:9100",
    thirdPartyNotes: "",
  }),
  getMerchantSettings: vi.fn().mockResolvedValue({
    name: "",
    businessType: "Restaurant",
    address: "",
    phone: "",
    email: "",
    currency: "IDR",
    timezone: "Asia/Jakarta",
    language: "en",
  }),
  getNumberingSettings: vi.fn().mockResolvedValue({
    invoiceFormat: "",
    orderFormat: "",
  }),
  getSystemSettings: vi.fn().mockResolvedValue({
    enableSplitBill: true,
    enableMultiPayment: true,
    confirmBeforePayment: true,
    enableQROrdering: true,
  }),
  listBankAccounts: vi.fn().mockResolvedValue([]),
  listOutletReceiptSettings: vi.fn().mockResolvedValue([]),
  listOutlets: (...args: unknown[]) => mockListOutlets(...args),
  listPaymentMethods: vi.fn().mockResolvedValue([]),
  listPrinters: vi.fn().mockResolvedValue([]),
  listTaxes: vi.fn().mockResolvedValue([]),
  patchOutlet: (...args: unknown[]) => mockPatchOutlet(...args),
  postOutlet: (...args: unknown[]) => mockPostOutlet(...args),
}));

describe("settingsStore outlet async state", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      outlets: [],
      outletsLoading: false,
      outletsSubmitting: false,
      outletsError: null,
      outletsPagination: {
        page: 1,
        perPage: 10,
        total: 0,
        lastPage: 1,
      },
    });
    mockGetApiAccessToken.mockReset();
    mockListOutlets.mockReset();
    mockPostOutlet.mockReset();
    mockPatchOutlet.mockReset();
    mockDeleteOutletApi.mockReset();
  });

  it("exposes outlet async contract in store state", () => {
    const state = useSettingsStore.getState();

    expect(typeof state.fetchOutlets).toBe("function");
    expect(typeof state.saveOutlet).toBe("function");
    expect(typeof state.deleteOutletById).toBe("function");
    expect(state.outletsLoading).toBe(false);
    expect(state.outletsSubmitting).toBe(false);
    expect(state.outletsError).toBeNull();
    expect(state.outletsPagination).toEqual({
      page: 1,
      perPage: 10,
      total: 0,
      lastPage: 1,
    });
  });

  it("sets loading and outlet list when fetching outlets", async () => {
    mockGetApiAccessToken.mockReturnValue("token");
    mockListOutlets.mockResolvedValue([
      {
        id: 10,
        code: "OUT-10",
        name: "Main Outlet",
        address: "",
        phone: "",
        manager: "",
        status: "active",
      },
    ]);

    await useSettingsStore.getState().fetchOutlets();

    const state = useSettingsStore.getState();
    expect(mockListOutlets).toHaveBeenCalledTimes(1);
    expect(state.outletsLoading).toBe(false);
    expect(state.outlets).toHaveLength(1);
    expect(state.outletsPagination.total).toBe(1);
  });

  it("creates outlet through API when token exists", async () => {
    mockGetApiAccessToken.mockReturnValue("token");
    mockListOutlets.mockResolvedValue([
      {
        id: 20,
        code: "OUT-20",
        name: "New Outlet",
        address: "",
        phone: "",
        manager: "",
        status: "active",
      },
    ]);
    mockPostOutlet.mockResolvedValue({
      id: 20,
      code: "OUT-20",
      name: "New Outlet",
      address: "",
      phone: "",
      manager: "",
      status: "active",
    });

    useSettingsStore.setState({
      outletsPagination: { page: 2, perPage: 5, total: 0, lastPage: 1 },
    });

    await useSettingsStore.getState().saveOutlet({
      id: 0,
      code: "",
      name: "New Outlet",
      address: "",
      phone: "",
      manager: "",
      status: "active",
    });

    const state = useSettingsStore.getState();
    expect(mockPostOutlet).toHaveBeenCalledTimes(1);
    expect(mockListOutlets).toHaveBeenCalledWith({ page: 2, perPage: 5 });
    expect(state.outletsSubmitting).toBe(false);
    expect(state.outlets[0]?.id).toBe(20);
    expect(state.outletsPagination.page).toBe(2);
    expect(state.outletsPagination.perPage).toBe(5);
  });

  it("deletes outlet through API when token exists", async () => {
    mockGetApiAccessToken.mockReturnValue("token");
    mockListOutlets.mockResolvedValue([]);
    useSettingsStore.setState({
      outletsPagination: { page: 3, perPage: 7, total: 1, lastPage: 1 },
      outlets: [
        {
          id: 99,
          code: "OUT-99",
          name: "Delete Me",
          address: "",
          phone: "",
          manager: "",
          status: "active",
        },
      ],
    });
    mockDeleteOutletApi.mockResolvedValue(undefined);

    await useSettingsStore.getState().deleteOutletById(99);

    const state = useSettingsStore.getState();
    expect(mockDeleteOutletApi).toHaveBeenCalledWith(99);
    expect(mockListOutlets).toHaveBeenCalledWith({ page: 3, perPage: 7 });
    expect(state.outlets).toHaveLength(0);
    expect(state.outletsSubmitting).toBe(false);
    expect(state.outletsPagination.page).toBe(3);
    expect(state.outletsPagination.perPage).toBe(7);
  });
});
