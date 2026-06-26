// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ensureEnglishLocale } from "@/test/i18nTestSetup";
const ALL_PERMISSIONS = [
  "pos.use",
  "menu.manage",
  "inventory.manage",
  "members.manage",
  "purchase.manage",
  "promotions.manage",
  "users.manage",
  "accounting.manage",
  "reports.view",
  "settings.manage",
  "dashboard.view",
  "kitchen.use",
  "qr_orders.manage",
  "tables.manage",
  "customers.manage",
  "gift_cards.manage",
  "suppliers.manage",
  "foodcost.view",
  "finance.shift_close",
  "payroll.manage",
  "employees.view",
  "attendance.view",
  "schedule.view",
  "overtime.view",
  "shift.view",
  "leave.manage",
] as const;

const testNavConfig = {
  permissions: [...ALL_PERMISSIONS] as string[],
  pinSet: true,
};

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
    PAYROLL: "payroll.manage",
    EMPLOYEES: "employees.view",
    ATTENDANCE: "attendance.view",
    SCHEDULING: "schedule.view",
    OVERTIME: "overtime.view",
    SHIFTS: "shift.view",
    LEAVE: "leave.manage",
  },
  useAuthStore: vi.fn((selector?: (state: unknown) => unknown) => {
    const state = {
      user: {
        id: "1",
        name: "Test User",
        email: "test@test.local",
        role: "Admin",
        outletIds: [1],
        pinSet: testNavConfig.pinSet,
        permissions: testNavConfig.permissions,
      },
      hasPermission: (perm: string) => testNavConfig.permissions.includes(perm),
      logout: vi.fn(),
      lock: vi.fn(),
    };
    return typeof selector === "function" ? selector(state) : state;
  }),
}));

vi.mock("@/stores/notificationStore", () => ({
  useNotificationStore: vi.fn((selector) =>
    selector({
      unreadCount: 0,
      fetchUnreadCount: vi.fn(),
    }),
  ),
}));

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: vi.fn((selector) => selector({ activeOutletId: 1 })),
}));

const useIsSidebarDrawerMock = vi.fn(() => false);
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => useIsSidebarDrawerMock(),
  useIsSidebarDrawer: () => useIsSidebarDrawerMock(),
}));

describe("AppSidebar hidden mode", () => {
  beforeEach(async () => {
    await ensureEnglishLocale();
    testNavConfig.permissions = [...ALL_PERMISSIONS];
    testNavConfig.pinSet = true;
    useIsSidebarDrawerMock.mockReturnValue(false);
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1280 });
  });

  function renderShell(initialOpen = true) {
    return render(
      <SidebarProvider defaultOpen={initialOpen}>
        <MemoryRouter initialEntries={["/pos"]}>
          <AppSidebar />
          <SidebarTrigger aria-label="Toggle sidebar" />
        </MemoryRouter>
      </SidebarProvider>,
    );
  }

  it("shows nav labels when sidebar is expanded", () => {
    renderShell(true);
    expect(screen.getByText("Sales & Cashier")).toBeInTheDocument();
    expect(screen.getByText("RestoHub")).toBeInTheDocument();
  });

  it("hides nav menu and footer when collapsed, keeping logo rail only", () => {
    renderShell(true);
    fireEvent.click(screen.getByRole("button", { name: "Toggle sidebar" }));

    const hiddenSidebar = document.querySelector('[data-sidebar="sidebar"]');
    expect(hiddenSidebar?.getAttribute("aria-hidden")).toBe("true");
    expect(hiddenSidebar?.hasAttribute("inert")).toBe(true);
    expect(screen.getByRole("button", { name: "Open sidebar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Toggle sidebar" })).toBeInTheDocument();
  });

  it("does not expose hidden nav links in the tab order", () => {
    renderShell(true);
    fireEvent.click(screen.getByRole("button", { name: "Toggle sidebar" }));

    const hiddenSidebar = document.querySelector('[data-sidebar="sidebar"]');
    expect(hiddenSidebar?.getAttribute("aria-hidden")).toBe("true");
    expect(hiddenSidebar?.hasAttribute("inert")).toBe(true);
  });

  it("reopens sidebar from logo rail and restores nav", () => {
    renderShell(false);
    expect(screen.getByRole("button", { name: "Open sidebar" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open sidebar" }));
    expect(screen.getByText("Sales & Cashier")).toBeInTheDocument();

    const sidebar = document.querySelector('[data-sidebar="sidebar"]');
    expect(sidebar?.getAttribute("aria-hidden")).not.toBe("true");
  });

  it("preserves active route state after reopening", () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <MemoryRouter initialEntries={["/hr/payroll/posting"]}>
          <AppSidebar />
          <SidebarTrigger aria-label="Toggle sidebar" />
        </MemoryRouter>
      </SidebarProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open sidebar" }));
    const postingLink = document.querySelector('a[href="/hr/payroll/posting"]');
    expect(postingLink).not.toBeNull();
    expect(postingLink?.getAttribute("data-active")).toBe("true");
  });

  it("uses drawer on mobile and tablet without desktop logo rail", () => {
    useIsSidebarDrawerMock.mockReturnValue(true);

    renderShell(true);
    expect(screen.queryByRole("button", { name: "Open sidebar" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Toggle sidebar" })).toBeInTheDocument();
  });
});
