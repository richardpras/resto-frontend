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
  "attendance.view",
  "schedule.view",
  "overtime.view",
  "shift.view",
  "leave.manage",
] as const;

function hasPermission(perm: string) {
  return ALL_PERMISSIONS.includes(perm as (typeof ALL_PERMISSIONS)[number]);
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

  it("groups reservations and loyalty under parent menus", () => {
    const user = makeUser([...ALL_PERMISSIONS]);
    const sections = buildSidebarSections(user);
    const floor = sections.find((section) => section.labelKey === "sidebar.floor");
    const customers = sections.find((section) => section.labelKey === "sidebar.customers");

    expect(floor?.items.some((item) => item.titleKey === "nav.reservationsMenu")).toBe(true);
    expect(customers?.items.some((item) => item.titleKey === "nav.loyaltyMenu")).toBe(true);
  });

  it("moves menu intelligence under the menu parent", () => {
    const user = makeUser([...ALL_PERMISSIONS]);
    const sections = buildSidebarSections(user);
    const menuStock = sections.find((section) => section.labelKey === "sidebar.menuStock");
    const menuParent = menuStock?.items.find((item) => item.titleKey === "nav.menu");

    expect(menuParent?.children?.some((child) => child.href === "/dashboard/menu")).toBe(true);
  });

  it("orders payroll children with workflow separators", () => {
    const user = makeUser([...ALL_PERMISSIONS]);
    const sections = buildSidebarSections(user);
    const hr = sections.find((section) => section.labelKey === "sidebar.hr");
    const payroll = hr?.items.find((item) => item.titleKey === "nav.payrollMenu");
    const filtered = filterNavItems(payroll?.children ?? [], user, hasPermission);

    expect(filtered[0]?.kind).toBe("separator");
    expect(filtered[0]?.titleKey).toBe("nav.payrollGroupSetup");
    expect(filtered.some((item) => item.href === "/payroll?tab=shifts")).toBe(true);
    expect(filtered.some((item) => item.titleKey === "nav.payrollGroupPayroll")).toBe(true);
    expect(filtered.some((item) => item.href === "/payroll?tab=posting")).toBe(true);
  });

  it("does not include deprecated promotions nav link", () => {
    const user = makeUser([...ALL_PERMISSIONS, "promotions.manage"]);
    const sections = buildSidebarSections(user);

    function collectHrefs(items: ReturnType<typeof buildSidebarSections>[number]["items"]): string[] {
      return items.flatMap((item) => [
        ...(item.href ? [item.href] : []),
        ...(item.children ? collectHrefs(item.children) : []),
      ]);
    }

    const hrefs = sections.flatMap((section) => collectHrefs(section.items));
    expect(hrefs).not.toContain("/promotions");
    expect(sections.flatMap((s) => s.items).some((i) => i.titleKey === "nav.promotions")).toBe(false);
  });
});
