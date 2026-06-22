import { describe, expect, it } from "vitest";
import { isNavBranchActive, isNavItemActive } from "./sidebarNavUtils";
import type { SidebarNavItem } from "./sidebarNavTypes";

function location(pathname: string, search = "") {
  return { pathname, search, hash: "", state: null, key: "default" };
}

describe("sidebarNavUtils nested hr routes", () => {
  const payrollGroup: SidebarNavItem = {
    title: "Payroll",
    titleKey: "nav.hrGroupPayroll",
    kind: "link",
    children: [
      { title: "Run", titleKey: "nav.payroll.overview", kind: "link", href: "/hr/payroll" },
      { title: "Engine", titleKey: "nav.payroll.engine", kind: "link", href: "/hr/payroll/engine" },
    ],
  };

  it("activates nested leaf for /hr/payroll/engine", () => {
    const loc = location("/hr/payroll/engine");
    expect(isNavBranchActive(loc, payrollGroup)).toBe(true);
    expect(isNavItemActive(loc, payrollGroup.children![1])).toBe(true);
    expect(isNavItemActive(loc, payrollGroup.children![0])).toBe(false);
  });

  it("activates payroll run without matching engine path", () => {
    const loc = location("/hr/payroll");
    expect(isNavItemActive(loc, payrollGroup.children![0])).toBe(true);
    expect(isNavItemActive(loc, payrollGroup.children![1])).toBe(false);
  });
});
