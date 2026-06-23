import type { PayrollTabKey } from "@/domain/permissionGates";

/** Dedicated `/hr/*` path for each former payroll tab key (legacy `?tab=` redirects). */
export const HR_PAYROLL_TAB_ROUTES: Record<PayrollTabKey, string> = {
  employees: "/hr/employees",
  "shift-assignments": "/hr/shift-assignments",
  scheduling: "/hr/scheduling",
  attendance: "/hr/attendance",
  "attendance-review": "/hr/attendance-review",
  leave: "/hr/leave",
  overtime: "/hr/overtime",
  preparation: "/hr/payroll/preparation",
  engine: "/hr/payroll/engine",
  adjustments: "/hr/payroll/adjustments",
  shifts: "/hr/shifts",
  loans: "/hr/payroll/loans",
  "cash-advances": "/hr/payroll/cash-advances",
  payslips: "/hr/payroll/payslips",
  bpjs: "/hr/payroll/bpjs",
  tax: "/hr/payroll/tax",
  reimbursements: "/hr/payroll/reimbursements",
  closing: "/hr/payroll/closing",
  posting: "/hr/payroll/posting",
};

export function resolveLegacyPayrollTabRedirect(tab: string | null): string {
  if (tab === "payroll") {
    return HR_PAYROLL_TAB_ROUTES.engine;
  }
  if (tab && tab in HR_PAYROLL_TAB_ROUTES) {
    return HR_PAYROLL_TAB_ROUTES[tab as PayrollTabKey];
  }
  return HR_PAYROLL_TAB_ROUTES.engine;
}

export function isPayrollTabKey(value: string): value is PayrollTabKey {
  return value in HR_PAYROLL_TAB_ROUTES;
}
