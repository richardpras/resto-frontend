// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProductionStationsSettings from "./ProductionStationsSettings";

const listProductionStationsMock = vi.fn();
const createProductionStationMock = vi.fn();
const updateProductionStationStatusMock = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: (selector: (s: unknown) => unknown) =>
    selector({
      activeOutletId: 1,
    }),
}));

vi.mock("@/stores/settingsStore", () => ({
  useSettingsStore: (selector: (s: unknown) => unknown) =>
    selector({
      outlets: [{ id: 1, code: "OUT-1", name: "Sunset Cafe", address: "", phone: "", manager: "", status: "active" }],
      ensureSectionsLoaded: vi.fn().mockResolvedValue(undefined),
    }),
}));

vi.mock("@/lib/api-integration/productionStationEndpoints", () => ({
  listProductionStations: (...args: unknown[]) => listProductionStationsMock(...args),
  createProductionStation: (...args: unknown[]) => createProductionStationMock(...args),
  updateProductionStation: vi.fn(),
  updateProductionStationStatus: (...args: unknown[]) => updateProductionStationStatusMock(...args),
}));

describe("ProductionStationsSettings", () => {
  beforeEach(() => {
    listProductionStationsMock.mockReset().mockResolvedValue([
      {
        id: 10,
        outletId: 1,
        code: "kitchen",
        name: "Kitchen",
        type: "kitchen",
        displayOrder: 10,
        isActive: true,
        kdsEnabled: true,
        printEnabled: true,
      },
    ]);
    createProductionStationMock.mockReset().mockResolvedValue({
      id: 11,
      outletId: 1,
      code: "bar",
      name: "Bar",
      type: "bar",
      displayOrder: 20,
      isActive: true,
      kdsEnabled: true,
      printEnabled: true,
    });
    updateProductionStationStatusMock.mockReset().mockResolvedValue({
      id: 10,
      outletId: 1,
      code: "kitchen",
      name: "Kitchen",
      type: "kitchen",
      displayOrder: 10,
      isActive: false,
      kdsEnabled: true,
      printEnabled: true,
    });
  });

  it("renders stations and supports deactivate flow", async () => {
    render(<ProductionStationsSettings />);

    await waitFor(() => {
      expect(screen.getByText("Kitchen")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /deactivate/i }));

    await waitFor(() => {
      expect(updateProductionStationStatusMock).toHaveBeenCalledWith(10, false);
    });
  });

  it("opens create dialog and submits new station", async () => {
    render(<ProductionStationsSettings />);

    await waitFor(() => {
      expect(screen.getByText("Kitchen")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /add station/i }));
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Bar" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(createProductionStationMock).toHaveBeenCalledWith(
        expect.objectContaining({
          outletId: 1,
          name: "Bar",
        }),
      );
    });
  });
});
