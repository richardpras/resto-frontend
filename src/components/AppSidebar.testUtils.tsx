import type { ReactNode } from "react";
import { vi } from "vitest";
import type { AuthUser } from "@/stores/authStore";

export const ALL_PERMISSIONS = [
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

export const testNavConfig = {
  permissions: [...ALL_PERMISSIONS] as string[],
  pinSet: true,
};

export function makeUser(permissions: string[]): AuthUser {
  return {
    id: "1",
    name: "Test User",
    email: "test@test.local",
    role: "Admin",
    outletIds: [1],
    pinSet: testNavConfig.pinSet,
    permissions,
  };
}

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
    const user = makeUser(testNavConfig.permissions);
    const state = {
      user,
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

vi.mock("@/domain/featureFlags", () => ({
  isPromotionsModuleEnabled: () => false,
}));

vi.mock("@/components/ui/sidebar", () => ({
  Sidebar: ({ children }: { children: ReactNode }) => <div data-testid="sidebar">{children}</div>,
  SidebarContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarGroupContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarGroupLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarMenu: ({ children }: { children: ReactNode }) => <ul>{children}</ul>,
  SidebarMenuButton: ({ children, asChild }: { children: ReactNode; asChild?: boolean }) =>
    asChild ? <>{children}</> : <button type="button">{children}</button>,
  SidebarMenuItem: ({ children }: { children: ReactNode }) => <li>{children}</li>,
  SidebarMenuSub: ({ children }: { children: ReactNode }) => <ul data-testid="submenu">{children}</ul>,
  SidebarMenuSubItem: ({ children }: { children: ReactNode }) => <li>{children}</li>,
  SidebarMenuSubButton: ({
    children,
    asChild,
    isActive,
  }: {
    children: ReactNode;
    asChild?: boolean;
    isActive?: boolean;
  }) =>
    asChild ? (
      <span data-active={isActive ? "true" : "false"}>{children}</span>
    ) : (
      <button type="button" data-active={isActive ? "true" : "false"}>
        {children}
      </button>
    ),
  SidebarFooter: ({ children }: { children: ReactNode }) => <div data-testid="footer">{children}</div>,
  SidebarHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarLogoRail: () => null,
  useSidebar: () => ({ state: "expanded" }),
}));

vi.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children, open }: { children: ReactNode; open?: boolean }) => (
    <div data-testid="collapsible" data-open={open}>{children}</div>
  ),
  CollapsibleTrigger: ({ children, asChild }: { children: ReactNode; asChild?: boolean }) =>
    asChild ? <>{children}</> : <button type="button">{children}</button>,
  CollapsibleContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
