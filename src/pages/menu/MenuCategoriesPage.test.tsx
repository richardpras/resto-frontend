// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MenuCategoriesPage from "./MenuCategoriesPage";

vi.mock("@/lib/api-integration/client", () => ({
  getApiAccessToken: vi.fn(() => "token"),
  ApiHttpError: class ApiHttpError extends Error {},
}));

vi.mock("@/lib/api-integration/settingsDomainEndpoints", () => ({
  listOutlets: vi.fn().mockResolvedValue([
    { id: 1, code: "OUT-1", name: "Outlet 1", address: "", phone: "", manager: "", status: "active" },
  ]),
}));

const { ensureSectionsLoaded, listMenuCategoryPrinterMappings } = vi.hoisted(() => ({
  ensureSectionsLoaded: vi.fn().mockResolvedValue(undefined),
  listMenuCategoryPrinterMappings: vi.fn().mockResolvedValue([
    { id: 99, outletId: 1, menuCategoryId: 1, printerProfileId: 10, priority: 10, isActive: true },
  ]),
}));

vi.mock("@/stores/settingsStore", () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      printers: [{ id: "10", name: "Kitchen Printer", printerType: "kitchen", connection: "lan", ip: "10.0.0.2", outletId: 1, printerProfileId: 10 }],
      ensureSectionsLoaded,
    }),
}));

vi.mock("@/lib/api-integration/endpoints", () => ({
  listMenuCategories: vi.fn().mockResolvedValue([
    { id: 1, name: "Food", nameEn: "Food", nameId: "Makanan", sortOrder: 10, isActive: true },
    { id: 2, name: "Beverage", nameEn: "Beverage", nameId: "Minuman", sortOrder: 20, isActive: true },
  ]),
  listMenuCategoryPrinterMappings,
  createMenuCategory: vi.fn(),
  updateMenuCategory: vi.fn(),
  saveMenuCategoryPrinterMapping: vi.fn(),
  deleteMenuCategoryPrinterMapping: vi.fn(),
}));

describe("MenuCategoriesPage", () => {
  it("does not load printers on page mount", async () => {
    render(<MenuCategoriesPage />);
    await waitFor(() => {
      expect(screen.getByText("Food")).toBeInTheDocument();
    });
    expect(ensureSectionsLoaded).not.toHaveBeenCalled();
  });

  it("renders category table before mappings finish loading", async () => {
    listMenuCategoryPrinterMappings.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve([
                { id: 99, outletId: 1, menuCategoryId: 1, printerProfileId: 10, priority: 10, isActive: true },
              ]),
            150,
          );
        }),
    );

    render(<MenuCategoriesPage />);
    await waitFor(() => {
      expect(screen.getByText("Food")).toBeInTheDocument();
      expect(screen.getByText("Makanan")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("menu-category-unmapped-banner")).not.toBeInTheDocument();
    expect(screen.getByTestId("menu-category-mappings-loading")).toBeInTheDocument();
  });

  it("shows unmapped banner after background mappings load", async () => {
    render(<MenuCategoriesPage />);
    await waitFor(() => {
      expect(screen.getByTestId("menu-category-unmapped-banner")).toBeInTheDocument();
    });
    expect(within(screen.getByTestId("menu-category-unmapped-banner")).getByText("Beverage")).toBeInTheDocument();
    expect(listMenuCategoryPrinterMappings).toHaveBeenCalled();
  });
});
