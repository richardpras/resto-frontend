import { describe, expect, it } from "vitest";
import { resolveLegacyPayrollTabRedirect, HR_PAYROLL_TAB_ROUTES } from "./hrRouteMap";

describe("hrRouteMap", () => {
  it("maps legacy payroll tabs to dedicated /hr routes", () => {
    expect(resolveLegacyPayrollTabRedirect("attendance")).toBe("/hr/attendance");
    expect(resolveLegacyPayrollTabRedirect("employees")).toBe("/hr/employees");
    expect(resolveLegacyPayrollTabRedirect("engine")).toBe("/hr/payroll/engine");
    expect(resolveLegacyPayrollTabRedirect("posting")).toBe("/hr/payroll/posting");
  });

  it("defaults unknown tab and legacy overview tab to payroll engine", () => {
    expect(resolveLegacyPayrollTabRedirect(null)).toBe("/hr/payroll/engine");
    expect(resolveLegacyPayrollTabRedirect("unknown")).toBe("/hr/payroll/engine");
    expect(resolveLegacyPayrollTabRedirect("payroll")).toBe("/hr/payroll/engine");
  });

  it("covers every payroll tab key", () => {
    expect(Object.keys(HR_PAYROLL_TAB_ROUTES).length).toBeGreaterThan(10);
    expect(HR_PAYROLL_TAB_ROUTES.engine).toBe("/hr/payroll/engine");
  });
});
