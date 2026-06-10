// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import type { AuthUser } from "@/stores/authStore";

vi.mock("@/stores/authStore", () => ({
  PERMISSIONS: {
    POS: "pos.use",
    MENU: "menu.manage",
    INVENTORY: "inventory.manage",
    MEMBERS: "members.manage",
    PURCHASE: "purchase.manage",
    PROMOTIONS: "promotions.manage",
    USERS: "users.manage",
    ACCOUNTING: "accounting.manage",
    REPORTS: "reports.view",
    SETTINGS: "settings.manage",
    MENU_DASHBOARD: "dashboard.view",
    KITCHEN: "kitchen.use",
    QR_ORDERS: "qr_orders.manage",
    TABLES: "tables.manage",
    CUSTOMERS: "customers.manage",
    LOYALTY_DASHBOARD: "members.manage",
    GIFT_CARDS: "gift_cards.manage",
    SUPPLIERS: "suppliers.manage",
    COST_VIEW: "foodcost.view",
    FINANCE_SHIFT_CLOSE: "finance.shift_close",
  },
  useAuthStore: vi.fn(),
}));

vi.mock("@/stores/notificationStore", () => ({
  useNotificationStore: vi.fn((selector) =>
    selector({
      unreadCount: 7,
      fetchUnreadCount: vi.fn(),
    }),
  ),
}));

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: vi.fn((selector) => selector({ activeOutletId: 1 })),
}));

vi.mock("@/domain/featureFlags", () => ({
  isPromotionsModuleEnabled: () => false,
}));

vi.mock("@/domain/permissionGates", () => ({
  canAccessPayrollModule: () => false,
  canViewEmployees: () => false,
}));

vi.mock("@/components/ui/sidebar", () => ({
  Sidebar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroupLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenuButton: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSidebar: () => ({ state: "expanded" }),
}));

import { useAuthStore } from "@/stores/authStore";

describe("Notification unread badge in sidebar", () => {
  it("shows unread count next to Notification Center nav item", () => {
    const user: AuthUser = {
      id: "1",
      name: "Ops User",
      email: "ops@test.local",
      role: "Manager",
      outletIds: [1],
      pinSet: false,
      permissions: [],
    };

    const authState = {
      user,
      hasPermission: () => true,
      logout: vi.fn(),
      lock: vi.fn(),
    };
    vi.mocked(useAuthStore).mockImplementation(((selector?: (state: typeof authState) => unknown) =>
      typeof selector === "function" ? selector(authState) : authState) as typeof useAuthStore);

    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );

    expect(screen.getByText("Notification Center")).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
  });
});
