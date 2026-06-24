import { describe, expect, it } from "vitest";
import { makeUser } from "@/components/AppSidebar.testUtils";
import { buildSidebarSections } from "./sidebarNavConfig";
import { filterNavItems } from "./sidebarNavUtils";

const ALL_PERMISSIONS = [
  "pos.use",
  "menu.manage",
  "inventory.manage",
  "members.manage",
  "purchase.manage",
  "users.manage",
  "accounting.manage",
  "reports.view",
  "settings.manage",
  "dashboard.view",
  "kitchen.use",
  "qr_orders.manage",
  "tables.manage",
  "gift_cards.manage",
  "suppliers.manage",
  "foodcost.view",
  "finance.shift_close",
  "payroll.manage",
  "employees.view",
  "employees.manage",
  "attendance.view",
  "schedule.view",
  "overtime.view",
  "shift.view",
  "leave.manage",
] as const;

function hasPermission(perm: string) {
  return ALL_PERMISSIONS.includes(perm as (typeof ALL_PERMISSIONS)[number]);
}

function collectHrefs(items: { href?: string; children?: typeof items }[]): string[] {
  return items.flatMap((item) => [
    ...(item.href ? [item.href] : []),
    ...(item.children ? collectHrefs(item.children) : []),
  ]);
}

describe("buildSidebarSections", () => {
  it("returns seven labeled sections in workflow order", () => {
    const user = makeUser([...ALL_PERMISSIONS]);
    const sections = buildSidebarSections(user);

    expect(sections.map((section) => section.labelKey)).toEqual([
      "sidebar.overview",
      "sidebar.sales",
      "sidebar.floor",
      "sidebar.menuStock",
      "sidebar.customers",
      "sidebar.hr",
      "sidebar.finance",
    ]);
  });

  it("places reservations and qr orders under sales", () => {
    const user = makeUser([...ALL_PERMISSIONS]);
    const sections = buildSidebarSections(user);
    const sales = sections.find((section) => section.labelKey === "sidebar.sales");
    const floor = sections.find((section) => section.labelKey === "sidebar.floor");
    const salesHrefs = collectHrefs(sales?.items ?? []);

    expect(sales?.items.some((item) => item.titleKey === "nav.reservationsMenu")).toBe(true);
    expect(salesHrefs).toContain("/qr-orders");
    expect(floor?.items.some((item) => item.titleKey === "nav.reservationsMenu")).toBe(false);
    expect(floor?.items.some((item) => item.titleKey === "nav.qrOrders")).toBe(false);
  });

  it("orders menu stock as suppliers, inventory, menu, purchases", () => {
    const user = makeUser([...ALL_PERMISSIONS]);
    const sections = buildSidebarSections(user);
    const menuStock = sections.find((section) => section.labelKey === "sidebar.menuStock");
    const keys = menuStock?.items.map((item) => item.titleKey);

    expect(keys).toEqual(["nav.suppliers", "nav.inventory", "nav.menu", "nav.purchasesMenu"]);
  });

  it("moves menu intelligence under the menu parent", () => {
    const user = makeUser([...ALL_PERMISSIONS]);
    const sections = buildSidebarSections(user);
    const menuStock = sections.find((section) => section.labelKey === "sidebar.menuStock");
    const menuParent = menuStock?.items.find((item) => item.titleKey === "nav.menu");

    expect(menuParent?.children?.some((child) => child.href === "/dashboard/menu")).toBe(true);
  });

  it("groups HR payroll under sidebar groups with explicit setup order", () => {
    const user = makeUser([...ALL_PERMISSIONS]);
    const sections = buildSidebarSections(user);
    const hr = sections.find((section) => section.labelKey === "sidebar.hr");
    const filtered = filterNavItems(hr?.items ?? [], user, hasPermission);

    const setup = filtered.find((item) => item.titleKey === "nav.hrGroupSetup");
    const setupHrefs = setup?.children?.map((item) => item.href);
    expect(setupHrefs).toEqual([
      "/hr/departments",
      "/hr/positions",
      "/hr/shifts",
      "/hr/employees",
      "/hr/shift-assignments",
      "/hr/scheduling",
    ]);

    const daily = filtered.find((item) => item.titleKey === "nav.hrGroupDaily");
    expect(daily?.children?.map((item) => item.href)).toEqual([
      "/hr/overtime",
      "/hr/leave",
      "/hr/attendance",
      "/hr/attendance-review",
    ]);

    const payroll = filtered.find((item) => item.titleKey === "nav.hrGroupPayroll");
    expect(payroll?.children?.[0]?.href).toBe("/hr/payroll/bpjs");
    expect(payroll?.children?.some((item) => item.href === "/hr/payroll/engine")).toBe(true);

    const close = filtered.find((item) => item.titleKey === "nav.hrGroupClose");
    expect(close?.children?.some((item) => item.href === "/hr/payroll/posting")).toBe(true);
  });

  it("orders accounting with health last and cash flow after ledger", () => {
    const user = makeUser([...ALL_PERMISSIONS]);
    const sections = buildSidebarSections(user);
    const finance = sections.find((section) => section.labelKey === "sidebar.finance");
    const accounting = finance?.items.find((item) => item.titleKey === "nav.accountingMenu");
    const hrefs = accounting?.children?.map((item) => item.href) ?? [];

    expect(hrefs[hrefs.length - 1]).toBe("/accounting?tab=posting");
    expect(hrefs[hrefs.length - 2]).toBe("/accounting?tab=health");
    expect(hrefs.indexOf("/accounting?tab=ledger")).toBeLessThan(hrefs.indexOf("/accounting?tab=cf"));
    expect(hrefs.indexOf("/accounting?tab=cf")).toBeLessThan(hrefs.indexOf("/accounting?tab=recon"));
    expect(hrefs.indexOf("/accounting?tab=recon")).toBeLessThan(hrefs.indexOf("/accounting?tab=tb"));
  });

  it("groups loyalty under parent menus", () => {
    const user = makeUser([...ALL_PERMISSIONS]);
    const sections = buildSidebarSections(user);
    const customers = sections.find((section) => section.labelKey === "sidebar.customers");

    expect(customers?.items.some((item) => item.titleKey === "nav.loyaltyMenu")).toBe(true);
  });

  it("does not include deprecated promotions nav link", () => {
    const user = makeUser([...ALL_PERMISSIONS, "promotions.manage"]);
    const sections = buildSidebarSections(user);
    const hrefs = sections.flatMap((section) => collectHrefs(section.items));

    expect(hrefs).not.toContain("/promotions");
    expect(sections.flatMap((s) => s.items).some((i) => i.titleKey === "nav.promotions")).toBe(false);
  });
});
