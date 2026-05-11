// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OutletsSettings from "./OutletsSettings";

const saveOutletMock = vi.fn();
const deleteOutletByIdMock = vi.fn();
const canManageOutletSettingsMock = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/stores/settingsStore", () => ({
  useSettingsStore: (selector: (s: unknown) => unknown) =>
    selector({
      outlets: [
        {
          id: 1,
          code: "OUT-001",
          name: "Main Outlet",
          address: "",
          phone: "",
          manager: "",
          status: "active",
        },
      ],
      outletsLoading: false,
      outletsError: null,
      outletsSubmitting: false,
      saveOutlet: saveOutletMock,
      deleteOutletById: deleteOutletByIdMock,
    }),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({
      canManageOutletSettings: canManageOutletSettingsMock,
    }),
}));

vi.mock("@/lib/api-integration/client", () => ({
  getApiAccessToken: () => "mock-token",
}));

describe("OutletsSettings store boundary", () => {
  beforeEach(() => {
    saveOutletMock.mockReset().mockResolvedValue(undefined);
    deleteOutletByIdMock.mockReset().mockResolvedValue(undefined);
    canManageOutletSettingsMock.mockReset().mockImplementation((outletId?: number) =>
      typeof outletId === "number" ? outletId === 1 : true,
    );
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  it("uses store saveOutlet action for save flow", async () => {
    render(<OutletsSettings />);

    fireEvent.click(screen.getByRole("button", { name: /add outlet/i }));
    const textboxes = screen.getAllByRole("textbox");
    fireEvent.change(textboxes[1], { target: { value: "Updated Outlet" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(saveOutletMock).toHaveBeenCalledTimes(1);
    });
  });

  it("uses store deleteOutletById action for delete flow", async () => {
    render(<OutletsSettings />);

    const deleteButtons = screen.getAllByRole("button");
    fireEvent.click(deleteButtons[2]);

    await waitFor(() => {
      expect(deleteOutletByIdMock).toHaveBeenCalledWith(1);
    });
  });

  it("hides manage actions when auth capability is false", () => {
    canManageOutletSettingsMock.mockReturnValue(false);
    render(<OutletsSettings />);

    expect(screen.queryByRole("button", { name: /add outlet/i })).toBeNull();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("renders unchanged outlet settings table layout with store-backed data", () => {
    render(<OutletsSettings />);

    expect(screen.getByRole("heading", { name: /outlets/i })).toBeTruthy();
    expect(screen.getByText("ID")).toBeTruthy();
    expect(screen.getByText("Code")).toBeTruthy();
    expect(screen.getByText("Name")).toBeTruthy();
    expect(screen.getByText("Address")).toBeTruthy();
    expect(screen.getByText("Phone")).toBeTruthy();
    expect(screen.getByText("Manager")).toBeTruthy();
    expect(screen.getByText("Status")).toBeTruthy();
    expect(screen.getByText("Main Outlet")).toBeTruthy();
  });
});
