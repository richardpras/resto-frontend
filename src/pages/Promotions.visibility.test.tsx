// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PromotionsRouteElement } from "@/components/promotions/PromotionsRouteElement";
import { AppSidebar } from "@/components/AppSidebar";
vi.mock("@/domain/featureFlags", () => ({
  FEATURES: { PROMOTIONS_MODULE: true },
  isPromotionsModuleEnabled: vi.fn(),
}));

vi.mock("@/stores/authStore", () => ({
  PERMISSIONS: {
    PROMOTIONS: "promotions.manage",
    MEMBERS: "members.manage",
    POS: "pos.use",
    MENU: "menu.manage",
    INVENTORY: "inventory.manage",
    SUPPLIERS: "suppliers.manage",
    CUSTOMERS: "customers.manage",
    LOYALTY_DASHBOARD: "loyalty.dashboard",
    GIFT_CARDS: "gift_cards.manage",
    PURCHASE: "purchase.manage",
    USERS: "users.manage",
    ACCOUNTING: "accounting.manage",
    REPORTS: "reports.view",
    SETTINGS: "settings.manage",
    MENU_DASHBOARD: "menu.dashboard",
    COST_VIEW: "menu.cost.view",
    FINANCE_SHIFT_CLOSE: "finance.shift_close",
    KITCHEN: "kitchen.view",
    QR_ORDERS: "qr_orders.manage",
    TABLES: "tables.manage",
  },
  useAuthStore: () => ({
    user: {
      name: "Test Admin",
      role: "Owner",
      outletIds: [1],
      pinSet: false,
      permissions: ["promotions.manage", "members.manage"],
    },
    hasPermission: (perm: string) =>
      perm === "promotions.manage" || perm === "members.manage",
    logout: vi.fn(),
    lock: vi.fn(),
  }),
}));

import { isPromotionsModuleEnabled } from "@/domain/featureFlags";

describe("Promotions visibility", () => {
  beforeEach(() => {
    vi.mocked(isPromotionsModuleEnabled).mockReset();
  });

  it("shows promotions route content when feature enabled", () => {
    vi.mocked(isPromotionsModuleEnabled).mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={["/promotions"]}>
        <Routes>
          <Route
            path="/promotions"
            element={
              <PromotionsRouteElement>
                <div>Promotions Page</div>
              </PromotionsRouteElement>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Promotions Page")).toBeTruthy();
  });

  it("redirects to loyalty programs when feature disabled", () => {
    vi.mocked(isPromotionsModuleEnabled).mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={["/promotions"]}>
        <Routes>
          <Route
            path="/promotions"
            element={
              <PromotionsRouteElement>
                <div>Promotions Page</div>
              </PromotionsRouteElement>
            }
          />
          <Route path="/loyalty-programs" element={<div>Loyalty Programs Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText("Promotions Page")).toBeNull();
    expect(screen.getByText("Loyalty Programs Page")).toBeTruthy();
  });

  it("shows Promotions in sidebar when feature enabled", () => {
    vi.mocked(isPromotionsModuleEnabled).mockReturnValue(true);

    render(
      <MemoryRouter>
        <SidebarProvider>
          <AppSidebar />
        </SidebarProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Promotions")).toBeTruthy();
    expect(screen.getByText("Loyalty Programs")).toBeTruthy();
  });

  it("hides Promotions in sidebar when feature disabled", () => {
    vi.mocked(isPromotionsModuleEnabled).mockReturnValue(false);

    render(
      <MemoryRouter>
        <SidebarProvider>
          <AppSidebar />
        </SidebarProvider>
      </MemoryRouter>,
    );

    expect(screen.queryByText("Promotions")).toBeNull();
    expect(screen.getByText("Loyalty Programs")).toBeTruthy();
  });
});
