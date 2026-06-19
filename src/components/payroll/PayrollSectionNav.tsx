import { useMemo } from "react";
import {
  Users,
  Clock,
  Timer,
  Wallet,
  CalendarDays,
  Banknote,
  Calculator,
  CalendarRange,
  CalendarClock,
  ClipboardCheck,
  Palmtree,
  FileStack,
  Cog,
  HandCoins,
  FileText,
  Shield,
  Receipt,
  ReceiptText,
  LockKeyhole,
  BookOpen,
} from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import type { PayrollTabKey } from "@/domain/permissionGates";
import { findPayrollTabGroupForTab, type PayrollTabGroup } from "@/domain/payrollTabGroups";

const TAB_ICONS: Record<PayrollTabKey, typeof Calculator> = {
  payroll: Calculator,
  employees: Users,
  "shift-assignments": CalendarRange,
  scheduling: CalendarClock,
  attendance: Clock,
  "attendance-review": ClipboardCheck,
  leave: Palmtree,
  overtime: Timer,
  preparation: FileStack,
  engine: Cog,
  adjustments: Wallet,
  shifts: CalendarDays,
  loans: Banknote,
  "cash-advances": HandCoins,
  payslips: FileText,
  bpjs: Shield,
  tax: Receipt,
  reimbursements: ReceiptText,
  closing: LockKeyhole,
  posting: BookOpen,
};

type PayrollSectionNavProps = {
  activeTab: PayrollTabKey;
  visibleTabGroups: PayrollTabGroup[];
  onTabChange: (tab: PayrollTabKey) => void;
};

export function PayrollSectionNav({ activeTab, visibleTabGroups, onTabChange }: PayrollSectionNavProps) {
  const { t } = useErpTranslation();

  const activeGroup = useMemo(
    () => findPayrollTabGroupForTab(activeTab, visibleTabGroups),
    [activeTab, visibleTabGroups],
  );

  const handleGroupChange = (labelKey: string) => {
    const group = visibleTabGroups.find((item) => item.labelKey === labelKey);
    if (!group) return;
    if (!group.tabs.includes(activeTab)) {
      onTabChange(group.tabs[0]!);
    }
  };

  if (!activeGroup) return null;

  return (
    <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
      <ToggleGroup
        type="single"
        value={activeGroup.labelKey}
        onValueChange={(value) => {
          if (value) handleGroupChange(value);
        }}
        aria-label={t("payroll.nav.groupsAria")}
        className="flex flex-wrap justify-start gap-1"
      >
        {visibleTabGroups.map((group) => (
          <ToggleGroupItem key={group.labelKey} value={group.labelKey} className="text-xs px-3">
            {t(group.labelKey, { ns: "common" })}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <TabsList
        aria-label={t("payroll.nav.tabsAria")}
        className="flex h-auto flex-wrap justify-start gap-1 bg-transparent p-0"
      >
        {activeGroup.tabs.map((key) => {
          const Icon = TAB_ICONS[key];
          return (
            <TabsTrigger key={key} value={key} className="gap-1.5 text-xs">
              <Icon className="h-3.5 w-3.5" />
              {t(`payroll.tabs.${key}`)}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </div>
  );
}
