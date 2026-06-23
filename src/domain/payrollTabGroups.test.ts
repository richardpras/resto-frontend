import { describe, expect, it } from "vitest";
import {
  PAYROLL_GROUP_LABEL_KEYS,
  findPayrollTabGroupForTab,
  getVisiblePayrollTabGroups,
} from "./payrollTabGroups";

describe("payrollTabGroups", () => {
  it("filters groups to visible tabs only", () => {
    const groups = getVisiblePayrollTabGroups(["shifts", "attendance", "engine"]);
    expect(groups).toHaveLength(3);
    expect(groups[0]?.tabs).toEqual(["shifts"]);
    expect(groups[1]?.tabs).toEqual(["attendance"]);
    expect(groups[2]?.tabs).toEqual(["engine"]);
  });

  it("finds group containing the active tab", () => {
    const groups = getVisiblePayrollTabGroups(["shifts", "attendance", "overtime", "engine"]);
    expect(findPayrollTabGroupForTab("overtime", groups)?.labelKey).toBe(PAYROLL_GROUP_LABEL_KEYS.daily);
    expect(findPayrollTabGroupForTab("engine", groups)?.labelKey).toBe(PAYROLL_GROUP_LABEL_KEYS.payroll);
  });

  it("falls back to first group when tab is not in any group", () => {
    const groups = getVisiblePayrollTabGroups(["shifts", "attendance"]);
    expect(findPayrollTabGroupForTab("closing", groups)?.labelKey).toBe(PAYROLL_GROUP_LABEL_KEYS.setup);
  });

  it("returns undefined when no groups are visible", () => {
    expect(findPayrollTabGroupForTab("engine", [])).toBeUndefined();
  });
});
