import { useEffect } from "react";
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

export default function Payroll() {
  const refreshEmployeesFromApi = usePayrollStore((s) => s.refreshEmployeesFromApi);
  const refreshAttendanceFromApi = usePayrollStore((s) => s.refreshAttendanceFromApi);
  const refreshPayrollsFromApi = usePayrollStore((s) => s.refreshPayrollsFromApi);
  const refreshOvertimeFromApi = usePayrollStore((s) => s.refreshOvertimeFromApi);
  const refreshAdjustmentsFromApi = usePayrollStore((s) => s.refreshAdjustmentsFromApi);
  const refreshShiftsFromApi = usePayrollStore((s) => s.refreshShiftsFromApi);
  const refreshLoansFromApi = usePayrollStore((s) => s.refreshLoansFromApi);

  useEffect(() => {
    void Promise.all([
      refreshEmployeesFromApi(),
      refreshAttendanceFromApi(),
      refreshPayrollsFromApi(),
      refreshOvertimeFromApi(),
      refreshAdjustmentsFromApi(),
      refreshShiftsFromApi(),
      refreshLoansFromApi(),
    ]).catch((e) => {
      toast.error(e instanceof Error ? e.message : "Failed to refresh payroll data from API");
    });
  }, [
    refreshEmployeesFromApi,
    refreshAttendanceFromApi,
    refreshPayrollsFromApi,
    refreshOvertimeFromApi,
    refreshAdjustmentsFromApi,
    refreshShiftsFromApi,
    refreshLoansFromApi,
  ]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payroll Management</h1>
        <p className="text-sm text-muted-foreground">Employees, attendance, overtime, allowances, payroll processing & payslips</p>
      </div>

      <Tabs defaultValue="payroll">
        <TabsList className="flex flex-wrap h-auto gap-1 w-full">
          <TabsTrigger value="payroll" className="gap-1.5 text-xs"><Calculator className="h-3.5 w-3.5" />Payroll</TabsTrigger>
          <TabsTrigger value="employees" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" />Employees</TabsTrigger>
          <TabsTrigger value="shift-assignments" className="gap-1.5 text-xs"><CalendarRange className="h-3.5 w-3.5" />Assignments</TabsTrigger>
          <TabsTrigger value="scheduling" className="gap-1.5 text-xs"><CalendarClock className="h-3.5 w-3.5" />Scheduling</TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1.5 text-xs"><Clock className="h-3.5 w-3.5" />Attendance</TabsTrigger>
          <TabsTrigger value="attendance-review" className="gap-1.5 text-xs"><ClipboardCheck className="h-3.5 w-3.5" />Review</TabsTrigger>
          <TabsTrigger value="leave" className="gap-1.5 text-xs"><Palmtree className="h-3.5 w-3.5" />Leave</TabsTrigger>
          <TabsTrigger value="overtime" className="gap-1.5 text-xs"><Timer className="h-3.5 w-3.5" />Overtime</TabsTrigger>
          <TabsTrigger value="preparation" className="gap-1.5 text-xs"><FileStack className="h-3.5 w-3.5" />Preparation</TabsTrigger>
          <TabsTrigger value="engine" className="gap-1.5 text-xs"><Cog className="h-3.5 w-3.5" />Engine</TabsTrigger>
          <TabsTrigger value="adjustments" className="gap-1.5 text-xs"><Wallet className="h-3.5 w-3.5" />Adjustments</TabsTrigger>
          <TabsTrigger value="shifts" className="gap-1.5 text-xs"><CalendarDays className="h-3.5 w-3.5" />Shifts</TabsTrigger>
          <TabsTrigger value="loans" className="gap-1.5 text-xs"><Banknote className="h-3.5 w-3.5" />Loans</TabsTrigger>
          <TabsTrigger value="cash-advances" className="gap-1.5 text-xs"><HandCoins className="h-3.5 w-3.5" />Cash Advances</TabsTrigger>
          <TabsTrigger value="payslips" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" />Payslips</TabsTrigger>
          <TabsTrigger value="bpjs" className="gap-1.5 text-xs"><Shield className="h-3.5 w-3.5" />BPJS</TabsTrigger>
          <TabsTrigger value="tax" className="gap-1.5 text-xs"><Receipt className="h-3.5 w-3.5" />Tax</TabsTrigger>
          <TabsTrigger value="reimbursements" className="gap-1.5 text-xs"><ReceiptText className="h-3.5 w-3.5" />Reimbursements</TabsTrigger>
          <TabsTrigger value="closing" className="gap-1.5 text-xs"><LockKeyhole className="h-3.5 w-3.5" />Closing</TabsTrigger>
          <TabsTrigger value="posting" className="gap-1.5 text-xs"><BookOpen className="h-3.5 w-3.5" />Posting</TabsTrigger>
        </TabsList>
        <TabsContent value="payroll" className="mt-6"><PayrollRunPage /></TabsContent>
        <TabsContent value="employees" className="mt-6"><Employees /></TabsContent>
        <TabsContent value="shift-assignments" className="mt-6"><ShiftAssignments /></TabsContent>
        <TabsContent value="scheduling" className="mt-6"><Scheduling /></TabsContent>
        <TabsContent value="attendance" className="mt-6"><Attendance /></TabsContent>
        <TabsContent value="attendance-review" className="mt-6"><AttendanceReview /></TabsContent>
        <TabsContent value="leave" className="mt-6"><Leave /></TabsContent>
        <TabsContent value="overtime" className="mt-6"><Overtime /></TabsContent>
        <TabsContent value="preparation" className="mt-6"><Preparation /></TabsContent>
        <TabsContent value="engine" className="mt-6"><Engine /></TabsContent>
        <TabsContent value="adjustments" className="mt-6"><Adjustments /></TabsContent>
        <TabsContent value="shifts" className="mt-6"><Shifts /></TabsContent>
        <TabsContent value="loans" className="mt-6"><Loans /></TabsContent>
        <TabsContent value="cash-advances" className="mt-6"><CashAdvances /></TabsContent>
        <TabsContent value="payslips" className="mt-6"><Payslips /></TabsContent>
        <TabsContent value="bpjs" className="mt-6"><Bpjs /></TabsContent>
        <TabsContent value="tax" className="mt-6"><Tax /></TabsContent>
        <TabsContent value="reimbursements" className="mt-6"><Reimbursements /></TabsContent>
        <TabsContent value="closing" className="mt-6"><Closing /></TabsContent>
        <TabsContent value="posting" className="mt-6"><Posting /></TabsContent>
      </Tabs>
    </div>
  );
}
