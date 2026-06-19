import type { PayrollTabKey } from "@/domain/permissionGates";

export const PAYROLL_GROUP_LABEL_KEYS = {
  setup: "nav.payrollGroupSetup",
  daily: "nav.payrollGroupDaily",
  payroll: "nav.payrollGroupPayroll",
  close: "nav.payrollGroupClose",
} as const;

export type PayrollTabGroup = {
  labelKey: string;
  tabs: PayrollTabKey[];
};

export const PAYROLL_TAB_GROUPS: PayrollTabGroup[] = [
  {
    labelKey: PAYROLL_GROUP_LABEL_KEYS.setup,
    tabs: ["employees", "shifts", "scheduling", "shift-assignments"],
  },
  {
    labelKey: PAYROLL_GROUP_LABEL_KEYS.daily,
    tabs: ["attendance", "attendance-review", "leave", "overtime"],
  },
  {
    labelKey: PAYROLL_GROUP_LABEL_KEYS.payroll,
    tabs: [
      "payroll",
      "preparation",
      "engine",
      "adjustments",
      "payslips",
      "bpjs",
      "tax",
      "reimbursements",
      "loans",
      "cash-advances",
    ],
  },
  {
    labelKey: PAYROLL_GROUP_LABEL_KEYS.close,
    tabs: ["closing", "posting"],
  },
];

export function getVisiblePayrollTabGroups(visibleTabs: PayrollTabKey[]): PayrollTabGroup[] {
  const visible = new Set(visibleTabs);
  return PAYROLL_TAB_GROUPS.map((group) => ({
    ...group,
    tabs: group.tabs.filter((tab) => visible.has(tab)),
  })).filter((group) => group.tabs.length > 0);
}

export function findPayrollTabGroupForTab(
  tab: PayrollTabKey,
  groups: PayrollTabGroup[],
): PayrollTabGroup | undefined {
  if (groups.length === 0) return undefined;
  return groups.find((group) => group.tabs.includes(tab)) ?? groups[0];
}
