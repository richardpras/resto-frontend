import { describe, expect, it } from "vitest";
import { expandPermissionCodes, type AuthUser, type RoleName } from "@/stores/authStore";
import { buildSidebarSections } from "./sidebarNavConfig";
import { filterNavItems } from "./sidebarNavUtils";

const WR_WB_OWNER_CODES = [
  "dashboard.view_all_outlets",
  "dashboard.view_own_outlet",
  "dashboard.view",
  "dashboard.manage",
  "reports.view",
  "accounting.manage",
  "finance.reconcile",
  "finance.shift_close",
  "payroll.view",
  "payroll.manage",
  "inventory.manage",
  "menu.manage",
  "foodcost.view",
  "recipe.view",
  "analytics.view",
  "purchase.manage",
  "purchase.approve",
  "promotions.manage",
  "suppliers.manage",
  "members.manage",
  "employees.view",
  "attendance.view",
  "tables.view",
  "tables.manage",
  "qr_orders.view",
  "settings.view",
  "settings.update",
  "users.view",
  "users.create",
  "users.assign_roles",
] as const;

const WR_WB_MANAGER_CODES = [
  "dashboard.view_own_outlet",
  "pos.use",
  "kitchen.use",
  "menu.manage",
  "inventory.manage",
  "purchase.manage",
  "purchase.approve",
  "tables.view",
  "tables.manage",
  "qr_orders.view",
  "reports.view",
  "members.manage",
  "suppliers.manage",
  "accounting.manage",
  "payroll.manage",
  "employees.view",
  "attendance.view",
  "settings.view",
  "settings.update",
  "users.view",
  "users.create",
  "users.assign_roles",
] as const;

const WR_WB_KASIR_CODES = [
  "pos.use",
  "members.manage",
  "tables.view",
  "qr_orders.view",
  "finance.shift_close",
] as const;

function wrWbUser(role: RoleName, permissionCodes: readonly string[]): AuthUser {
  const codes = [...permissionCodes];
  return {
    id: "1",
    name: role,
    email: `${role.toLowerCase()}@wrwb.demo`,
    role,
    outletIds: [1],
    pinSet: true,
    permissionCodes: codes,
    permissions: expandPermissionCodes(codes),
  };
}

function hasPermission(user: AuthUser) {
  return (perm: string) => user.permissions.includes(perm);
}

function collectHrefs(user: AuthUser): string[] {
  const sections = buildSidebarSections(user);
  return sections.flatMap((section) =>
    collectFromItems(filterNavItems(section.items, user, hasPermission(user))),
  );
}

function collectFromItems(items: { href?: string; children?: typeof items }[]): string[] {
  return items.flatMap((item) => [
    ...(item.href ? [item.href] : []),
    ...(item.children ? collectFromItems(item.children) : []),
  ]);
}

describe("WR WB sidebar matrix", () => {
  it("admin sees users and system health links", () => {
    const admin = wrWbUser("Owner", ["settings.manage", "users.manage", "reports.view", "pos.use"]);
    const hrefs = collectHrefs(admin);
    expect(hrefs).toContain("/users");
    expect(hrefs).toContain("/system/health");
    expect(hrefs).toContain("/settings");
  });

  it("owner sees business menus and scoped user management but not system tools", () => {
    const owner = wrWbUser("Owner", WR_WB_OWNER_CODES);
    const hrefs = collectHrefs(owner);
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/reports");
    expect(hrefs.some((href) => href.startsWith("/accounting"))).toBe(true);
    expect(hrefs).toContain("/settings");
    expect(hrefs).toContain("/users");
    expect(hrefs).not.toContain("/system/health");
    expect(hrefs).not.toContain("/system/audit");
    expect(hrefs).not.toContain("/hr/departments");
  });

  it("manager sees dashboard, settings, and scoped user management without system admin", () => {
    const manager = wrWbUser("Manager", WR_WB_MANAGER_CODES);
    const hrefs = collectHrefs(manager);
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/settings");
    expect(hrefs).toContain("/users");
    expect(hrefs).not.toContain("/system/health");
    expect(hrefs).not.toContain("/hr/departments");
  });

  it("kasir sees POS and shift close but not dashboard or settings", () => {
    const kasir = wrWbUser("Cashier", WR_WB_KASIR_CODES);
    const hrefs = collectHrefs(kasir);
    expect(hrefs).toContain("/pos");
    expect(hrefs).toContain("/shift-close");
    expect(hrefs).toContain("/gift-cards");
    expect(hrefs).not.toContain("/");
    expect(hrefs).not.toContain("/settings");
    expect(hrefs).not.toContain("/accounting");
    expect(hrefs).not.toContain("/menu/costing");
  });

  it("kitchen sees kitchen only in overview and sales", () => {
    const kitchen = wrWbUser("Kitchen", ["kitchen.use"]);
    const hrefs = collectHrefs(kitchen);
    expect(hrefs).toContain("/kitchen");
    expect(hrefs).not.toContain("/pos");
    expect(hrefs).not.toContain("/");
    expect(hrefs).not.toContain("/settings");
  });
});
