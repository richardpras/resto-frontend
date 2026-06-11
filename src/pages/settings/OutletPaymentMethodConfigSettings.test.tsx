// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { OutletPaymentMethodConfigApi } from "@/lib/api-integration/outletPaymentMethodEndpoints";
import OutletPaymentMethodConfigSettings from "./OutletPaymentMethodConfigSettings";

const cashConfig: OutletPaymentMethodConfigApi = {
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
};

const manualQrisEnabled: OutletPaymentMethodConfigApi = {
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
  settings: { instructions: "Scan QRIS" },
};

const manualQrisDisabled: OutletPaymentMethodConfigApi = {
  ...manualQrisEnabled,
  enabled: false,
};

let mockConfigs: OutletPaymentMethodConfigApi[] = [cashConfig, manualQrisEnabled];

vi.mock("@/stores/settingsStore", () => ({
  useSettingsStore: (selector: (s: unknown) => unknown) =>
    selector({
      outlets: [{ id: 1, name: "Mountain Cafe", code: "DEMO-MOUNTAIN", status: "active" }],
    }),
}));

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: (selector: (s: unknown) => unknown) =>
    selector({ activeOutletId: 1 }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: mockConfigs, isLoading: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

describe("OutletPaymentMethodConfigSettings static QRIS visibility", () => {
  it("shows static QRIS inside QRIS card when manual_qris is enabled", () => {
    mockConfigs = [cashConfig, manualQrisEnabled];
    render(<OutletPaymentMethodConfigSettings />);

    expect(screen.getByLabelText(/Upload QR image/i)).toBeTruthy();
    expect(screen.getByLabelText(/Payment instructions/i)).toBeTruthy();
    expect(screen.getByText("Static QRIS")).toBeTruthy();
  });

  it("hides static QRIS when manual_qris is disabled", () => {
    mockConfigs = [cashConfig, manualQrisDisabled];
    render(<OutletPaymentMethodConfigSettings />);

    expect(screen.queryByLabelText(/Upload QR image/i)).toBeNull();
    expect(screen.queryByLabelText(/Payment instructions/i)).toBeNull();
    expect(screen.queryByText("Static QRIS")).toBeNull();
  });
});
