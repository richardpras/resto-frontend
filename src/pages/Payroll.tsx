import { useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Clock, Timer, Wallet, CalendarDays, Banknote, Calculator, CalendarRange, CalendarClock, ClipboardCheck, Palmtree, FileStack, Cog, HandCoins, FileText, Shield, Receipt, ReceiptText, LockKeyhole, BookOpen } from "lucide-react";
import Preparation from "./payroll/Preparation";
import Engine from "./payroll/Engine";
import Leave from "./payroll/Leave";
import AttendanceReview from "./payroll/AttendanceReview";
import { toast } from "sonner";
import { usePayrollStore } from "@/stores/payrollStore";
import Employees from "./payroll/Employees";
import Attendance from "./payroll/Attendance";
import Overtime from "./payroll/Overtime";
import Adjustments from "./payroll/Adjustments";
import Shifts from "./payroll/Shifts";
import Loans from "./payroll/Loans";
import CashAdvances from "./payroll/CashAdvances";
import Payslips from "./payroll/Payslips";
import Bpjs from "./payroll/Bpjs";
import Tax from "./payroll/Tax";
import Reimbursements from "./payroll/Reimbursements";
import Closing from "./payroll/Closing";
import Posting from "./payroll/Posting";
import ShiftAssignments from "./payroll/ShiftAssignments";
import Scheduling from "./payroll/Scheduling";
import PayrollRunPage from "./payroll/PayrollRun";
import { useAuthStore } from "@/stores/authStore";
import { getVisiblePayrollTabs, hasPayrollFullAccess, type PayrollTabKey } from "@/domain/permissionGates";

const TAB_META: Record<PayrollTabKey, { label: string; icon: typeof Calculator }> = {
  payroll: { label: "Payroll", icon: Calculator },
  employees: { label: "Employees", icon: Users },
  "shift-assignments": { label: "Assignments", icon: CalendarRange },
  scheduling: { label: "Scheduling", icon: CalendarClock },
  attendance: { label: "Attendance", icon: Clock },
  "attendance-review": { label: "Review", icon: ClipboardCheck },
  leave: { label: "Leave", icon: Palmtree },
  overtime: { label: "Overtime", icon: Timer },
  preparation: { label: "Preparation", icon: FileStack },
  engine: { label: "Engine", icon: Cog },
  adjustments: { label: "Adjustments", icon: Wallet },
  shifts: { label: "Shifts", icon: CalendarDays },
  loans: { label: "Loans", icon: Banknote },
  "cash-advances": { label: "Cash Advances", icon: HandCoins },
  payslips: { label: "Payslips", icon: FileText },
  bpjs: { label: "BPJS", icon: Shield },
  tax: { label: "Tax", icon: Receipt },
  reimbursements: { label: "Reimbursements", icon: ReceiptText },
  closing: { label: "Closing", icon: LockKeyhole },
  posting: { label: "Posting", icon: BookOpen },
};

const TAB_REFRESH_KEYS: Partial<Record<PayrollTabKey, "employees" | "attendance" | "payrolls" | "overtime" | "adjustments" | "shifts" | "loans">> = {
  payroll: "payrolls",
  employees: "employees",
  attendance: "attendance",
  "attendance-review": "attendance",
  overtime: "overtime",
  adjustments: "adjustments",
  shifts: "shifts",
  loans: "loans",
};

export default function Payroll() {
  const user = useAuthStore((s) => s.user);
  const visibleTabs = useMemo(() => getVisiblePayrollTabs(user), [user]);
  const payrollFull = useMemo(() => hasPayrollFullAccess(user), [user]);
  const defaultTab = visibleTabs[0] ?? "attendance";
  const refreshEmployeesFromApi = usePayrollStore((s) => s.refreshEmployeesFromApi);
  const refreshAttendanceFromApi = usePayrollStore((s) => s.refreshAttendanceFromApi);
  const refreshPayrollsFromApi = usePayrollStore((s) => s.refreshPayrollsFromApi);
  const refreshOvertimeFromApi = usePayrollStore((s) => s.refreshOvertimeFromApi);
  const refreshAdjustmentsFromApi = usePayrollStore((s) => s.refreshAdjustmentsFromApi);
  const refreshShiftsFromApi = usePayrollStore((s) => s.refreshShiftsFromApi);
  const refreshLoansFromApi = usePayrollStore((s) => s.refreshLoansFromApi);

  const refreshByKey = useMemo(
    () => ({
      employees: refreshEmployeesFromApi,
      attendance: refreshAttendanceFromApi,
      payrolls: refreshPayrollsFromApi,
      overtime: refreshOvertimeFromApi,
      adjustments: refreshAdjustmentsFromApi,
      shifts: refreshShiftsFromApi,
      loans: refreshLoansFromApi,
    }),
    [
      refreshEmployeesFromApi,
      refreshAttendanceFromApi,
      refreshPayrollsFromApi,
      refreshOvertimeFromApi,
      refreshAdjustmentsFromApi,
      refreshShiftsFromApi,
      refreshLoansFromApi,
    ],
  );

  useEffect(() => {
    const seen = new Set<string>();
    const tasks: Promise<void>[] = [];
    for (const tab of visibleTabs) {
      const key = TAB_REFRESH_KEYS[tab];
      if (!key || seen.has(key)) continue;
      seen.add(key);
      tasks.push(refreshByKey[key]());
    }
    if (tasks.length === 0) return;
    void Promise.all(tasks).catch((e) => {
      toast.error(e instanceof Error ? e.message : "Failed to refresh payroll data from API");
    });
  }, [visibleTabs, refreshByKey]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payroll Management</h1>
        <p className="text-sm text-muted-foreground">
          {payrollFull
            ? "Employees, attendance, overtime, allowances, payroll processing & payslips"
            : "HR modules available for your role — payroll processing requires payroll.manage"}
        </p>
      </div>

      {visibleTabs.length === 0 ? (
        <p className="text-sm text-muted-foreground">You do not have permission to view any payroll modules.</p>
      ) : (
      <Tabs defaultValue={defaultTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 w-full">
          {visibleTabs.map((key) => {
            const meta = TAB_META[key];
            const Icon = meta.icon;
            return (
              <TabsTrigger key={key} value={key} className="gap-1.5 text-xs">
                <Icon className="h-3.5 w-3.5" />{meta.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {visibleTabs.includes("payroll") && <TabsContent value="payroll" className="mt-6"><PayrollRunPage /></TabsContent>}
        {visibleTabs.includes("employees") && <TabsContent value="employees" className="mt-6"><Employees /></TabsContent>}
        {visibleTabs.includes("shift-assignments") && <TabsContent value="shift-assignments" className="mt-6"><ShiftAssignments /></TabsContent>}
        {visibleTabs.includes("scheduling") && <TabsContent value="scheduling" className="mt-6"><Scheduling /></TabsContent>}
        {visibleTabs.includes("attendance") && <TabsContent value="attendance" className="mt-6"><Attendance /></TabsContent>}
        {visibleTabs.includes("attendance-review") && <TabsContent value="attendance-review" className="mt-6"><AttendanceReview /></TabsContent>}
        {visibleTabs.includes("leave") && <TabsContent value="leave" className="mt-6"><Leave /></TabsContent>}
        {visibleTabs.includes("overtime") && <TabsContent value="overtime" className="mt-6"><Overtime /></TabsContent>}
        {visibleTabs.includes("preparation") && <TabsContent value="preparation" className="mt-6"><Preparation /></TabsContent>}
        {visibleTabs.includes("engine") && <TabsContent value="engine" className="mt-6"><Engine /></TabsContent>}
        {visibleTabs.includes("adjustments") && <TabsContent value="adjustments" className="mt-6"><Adjustments /></TabsContent>}
        {visibleTabs.includes("shifts") && <TabsContent value="shifts" className="mt-6"><Shifts /></TabsContent>}
        {visibleTabs.includes("loans") && <TabsContent value="loans" className="mt-6"><Loans /></TabsContent>}
        {visibleTabs.includes("cash-advances") && <TabsContent value="cash-advances" className="mt-6"><CashAdvances /></TabsContent>}
        {visibleTabs.includes("payslips") && <TabsContent value="payslips" className="mt-6"><Payslips /></TabsContent>}
        {visibleTabs.includes("bpjs") && <TabsContent value="bpjs" className="mt-6"><Bpjs /></TabsContent>}
        {visibleTabs.includes("tax") && <TabsContent value="tax" className="mt-6"><Tax /></TabsContent>}
        {visibleTabs.includes("reimbursements") && <TabsContent value="reimbursements" className="mt-6"><Reimbursements /></TabsContent>}
        {visibleTabs.includes("closing") && <TabsContent value="closing" className="mt-6"><Closing /></TabsContent>}
        {visibleTabs.includes("posting") && <TabsContent value="posting" className="mt-6"><Posting /></TabsContent>}
      </Tabs>
      )}
    </div>
  );
}
