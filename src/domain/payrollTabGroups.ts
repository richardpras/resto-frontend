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

/** Sidebar setup group is built manually in sidebarNavConfig; index 0 is label-only. */
export const PAYROLL_TAB_GROUPS: PayrollTabGroup[] = [
  {
    labelKey: PAYROLL_GROUP_LABEL_KEYS.setup,
    tabs: [],
  },
  {
    labelKey: PAYROLL_GROUP_LABEL_KEYS.daily,
    tabs: ["overtime", "leave", "attendance", "attendance-review"],
  },
  {
    labelKey: PAYROLL_GROUP_LABEL_KEYS.payroll,
    tabs: [
      "bpjs",
      "tax",
      "reimbursements",
      "loans",
      "cash-advances",
      "preparation",
      "adjustments",
      "engine",
      "payslips",
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
