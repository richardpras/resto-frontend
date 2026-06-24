import { describe, expect, it } from "vitest";
import {
  PAYROLL_GROUP_LABEL_KEYS,
  PAYROLL_TAB_GROUPS,
  findPayrollTabGroupForTab,
  getVisiblePayrollTabGroups,
} from "./payrollTabGroups";

describe("payrollTabGroups", () => {
  it("filters groups to visible tabs only", () => {
    const groups = getVisiblePayrollTabGroups(["overtime", "attendance", "engine"]);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.tabs).toEqual(["overtime", "attendance"]);
    expect(groups[1]?.tabs).toEqual(["engine"]);
  });

  it("omits empty setup group from visible groups", () => {
    const groups = getVisiblePayrollTabGroups(["shifts", "attendance"]);
    expect(groups.every((g) => g.labelKey !== PAYROLL_GROUP_LABEL_KEYS.setup)).toBe(true);
  });

  it("finds group containing the active tab", () => {
    const groups = getVisiblePayrollTabGroups(["overtime", "attendance", "engine"]);
    expect(findPayrollTabGroupForTab("overtime", groups)?.labelKey).toBe(PAYROLL_GROUP_LABEL_KEYS.daily);
    expect(findPayrollTabGroupForTab("engine", groups)?.labelKey).toBe(PAYROLL_GROUP_LABEL_KEYS.payroll);
  });

  it("falls back to first group when tab is not in any group", () => {
    const groups = getVisiblePayrollTabGroups(["overtime", "attendance"]);
    expect(findPayrollTabGroupForTab("closing", groups)?.labelKey).toBe(PAYROLL_GROUP_LABEL_KEYS.daily);
  });

  it("returns undefined when no groups are visible", () => {
    expect(findPayrollTabGroupForTab("engine", [])).toBeUndefined();
  });

  it("defines operational tab order", () => {
    expect(PAYROLL_TAB_GROUPS[1]?.tabs).toEqual(["overtime", "leave", "attendance", "attendance-review"]);
  });

  it("defines payroll tab order", () => {
    expect(PAYROLL_TAB_GROUPS[2]?.tabs).toEqual([
      "bpjs",
      "tax",
      "reimbursements",
      "loans",
      "cash-advances",
      "preparation",
      "adjustments",
      "engine",
      "payslips",
    ]);
  });
});
