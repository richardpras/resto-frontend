// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Settings from "../Settings";

vi.mock("@/domain/environment", () => ({
  isDevelopmentEnvironment: vi.fn(() => false),
}));

vi.mock("@/lib/api-integration/client", () => ({
  getApiAccessToken: vi.fn(() => null),
  setApiAccessToken: vi.fn(),
  ApiHttpError: class ApiHttpError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

const ensureSectionsLoaded = vi.fn().mockResolvedValue(undefined);

vi.mock("@/stores/settingsStore", () => ({
  useSettingsStore: Object.assign(
    (selector: (s: unknown) => unknown) =>
      selector({
        ensureSectionsLoaded,
        outlets: [{ id: 1, name: "Sunset Cafe", code: "DEMO-SUNSET", status: "active" }],
        paymentMethods: [{ id: "cash-a", name: "Cash A", type: "cash", status: "active" }],
      }),
    {
      getState: () => ({
        ensureSectionsLoaded,
        outlets: [{ id: 1, name: "Sunset Cafe", code: "DEMO-SUNSET", status: "active" }],
        paymentMethods: [{ id: "cash-a", name: "Cash A", type: "cash", status: "active" }],
      }),
    },
  ),
}));

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: (selector: (s: unknown) => unknown) =>
    selector({ activeOutletId: 1 }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: [
      {
        id: 1,
        outletId: 1,
        paymentMethodCode: "cash",
        type: "cash",
        enabled: true,
        displayOrder: 10,
        isDefault: true,
        label: "Cash",
        settlementMethod: "cash",
        isCash: true,
      },
      {
        id: 2,
        outletId: 1,
        paymentMethodCode: "manual_qris",
        type: "manual_qris",
        provider: "manual",
        enabled: true,
        displayOrder: 20,
        isDefault: false,
        label: "QRIS",
        settlementMethod: "qris",
        isManualQris: true,
        settings: {},
      },
    ],
    isLoading: false,
  }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("./MerchantSettings", () => ({ default: () => <div>MerchantSettings</div> }));
vi.mock("./OutletsSettings", () => ({ default: () => <div>OutletsSettings</div> }));
vi.mock("./TaxSettings", () => ({ default: () => <div>TaxSettings</div> }));
vi.mock("./PrinterSettings", () => ({ default: () => <div>PrinterSettings</div> }));
vi.mock("./SystemsSettings", () => ({ default: () => <div>SystemSettings</div> }));
vi.mock("./IntegrationSettings", () => ({ default: () => <div>IntegrationSettings</div> }));
vi.mock("./NumberingSettings", () => ({ default: () => <div>NumberingSettings</div> }));
vi.mock("./BankSettings", () => ({ default: () => <div>BankSettings</div> }));
vi.mock("./ReceiptsSettings", () => ({ default: () => <div>ReceiptSettings</div> }));

function renderSettings(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SettingsPaymentRefactor", () => {
  beforeEach(() => {
    ensureSectionsLoaded.mockClear();
  });

  it("default payment-methods tab shows Outlet Payment Settings only", async () => {
    renderSettings("/settings?tab=payment-methods");

    expect(await screen.findByRole("heading", { name: "Outlet Payment Settings" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Master Payment Methods" })).toBeNull();
    expect(screen.queryByText("Cash A")).toBeNull();
  });

  it("hides master CRUD table by default", async () => {
    renderSettings("/settings?tab=payment-methods&section=outlet");
    expect(await screen.findByText("Static QRIS")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Add Method/i })).toBeNull();
  });

  it("shows master section when section=master", async () => {
    renderSettings("/settings?tab=payment-methods&section=master");

    expect(await screen.findByRole("heading", { name: "Master Payment Methods" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Add Method/i })).toBeTruthy();
    expect(screen.getByText("Cash A")).toBeTruthy();
    expect(screen.queryByText("Static QRIS")).toBeNull();
  });

  it("switches to master section via segmented control", async () => {
    renderSettings("/settings?tab=payment-methods&section=outlet");

    const sectionTabs = await screen.findByRole("tablist", { name: "Payment settings sections" });
    fireEvent.mouseDown(within(sectionTabs).getByRole("tab", { name: /Master Payment Methods/i }), { button: 0 });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Master Payment Methods" })).toBeTruthy();
    });
    expect(screen.queryByText("Static QRIS")).toBeNull();
  });

  it("returns to outlet section from master", async () => {
    renderSettings("/settings?tab=payment-methods&section=master");

    const sectionTabs = await screen.findByRole("tablist", { name: "Payment settings sections" });
    fireEvent.mouseDown(within(sectionTabs).getByRole("tab", { name: /Outlet Payment Settings/i }), { button: 0 });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Outlet Payment Settings" })).toBeTruthy();
    });
    expect(screen.queryByRole("button", { name: /Add Method/i })).toBeNull();
  });

  it("still accepts legacy tab=payments URL", async () => {
    renderSettings("/settings?tab=payments");

    expect(await screen.findByRole("heading", { name: "Outlet Payment Settings" })).toBeTruthy();
  });

  it("static QRIS upload remains in outlet section", async () => {
    renderSettings("/settings?tab=payment-methods&section=outlet");
    expect(await screen.findByLabelText(/Upload QR image/i)).toBeTruthy();
    expect(screen.getByLabelText(/Payment instructions/i)).toBeTruthy();
  });
});
