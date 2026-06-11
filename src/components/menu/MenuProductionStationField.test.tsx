// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MenuProductionStationField } from "./MenuProductionStationField";

const listProductionStationsMock = vi.fn();

vi.mock("@/lib/api-integration/productionStationEndpoints", () => ({
  listProductionStations: (...args: unknown[]) => listProductionStationsMock(...args),
}));

describe("MenuProductionStationField", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    listProductionStationsMock.mockReset().mockResolvedValue([
      { id: 1, outletId: 1, code: "kitchen", name: "Kitchen", type: "kitchen", displayOrder: 10, isActive: true, kdsEnabled: true, printEnabled: true },
      { id: 2, outletId: 1, code: "bar", name: "Bar", type: "bar", displayOrder: 20, isActive: true, kdsEnabled: true, printEnabled: true },
    ]);
  });

  it("loads stations for outlet and renders selector", async () => {
    const onChange = vi.fn();
    render(<MenuProductionStationField outletId={1} value={1} onChange={onChange} />);

    await waitFor(() => {
      expect(listProductionStationsMock).toHaveBeenCalledWith(1, { activeOnly: true });
    });

    expect(screen.getByTestId("menu-production-station-field")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
