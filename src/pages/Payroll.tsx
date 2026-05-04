import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Clock, Timer, Wallet, CalendarDays, Banknote, Calculator } from "lucide-react";
import { toast } from "sonner";
import { usePayrollStore } from "@/stores/payrollStore";
import Employees from "./payroll/Employees";
import Attendance from "./payroll/Attendance";
import Overtime from "./payroll/Overtime";
import Adjustments from "./payroll/Adjustments";
import Shifts from "./payroll/Shifts";
import Loans from "./payroll/Loans";
import PayrollRunPage from "./payroll/PayrollRun";

export default function Payroll() {
  const refreshEmployeesFromApi = usePayrollStore((s) => s.refreshEmployeesFromApi);
  const refreshAttendanceFromApi = usePayrollStore((s) => s.refreshAttendanceFromApi);
  const refreshPayrollsFromApi = usePayrollStore((s) => s.refreshPayrollsFromApi);

  useEffect(() => {
    void Promise.all([
      refreshEmployeesFromApi(),
      refreshAttendanceFromApi(),
      refreshPayrollsFromApi(),
    ]).catch((e) => {
      toast.error(e instanceof Error ? e.message : "Failed to refresh payroll data from API");
    });
  }, [refreshEmployeesFromApi, refreshAttendanceFromApi, refreshPayrollsFromApi]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payroll Management</h1>
        <p className="text-sm text-muted-foreground">Employees, attendance, overtime, allowances, payroll processing & payslips</p>
      </div>

      <Tabs defaultValue="payroll">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 h-auto">
          <TabsTrigger value="payroll" className="gap-1.5 text-xs"><Calculator className="h-3.5 w-3.5" />Payroll</TabsTrigger>
          <TabsTrigger value="employees" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" />Employees</TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1.5 text-xs"><Clock className="h-3.5 w-3.5" />Attendance</TabsTrigger>
          <TabsTrigger value="overtime" className="gap-1.5 text-xs"><Timer className="h-3.5 w-3.5" />Overtime</TabsTrigger>
          <TabsTrigger value="adjustments" className="gap-1.5 text-xs"><Wallet className="h-3.5 w-3.5" />Adjustments</TabsTrigger>
          <TabsTrigger value="shifts" className="gap-1.5 text-xs"><CalendarDays className="h-3.5 w-3.5" />Shifts</TabsTrigger>
          <TabsTrigger value="loans" className="gap-1.5 text-xs"><Banknote className="h-3.5 w-3.5" />Loans</TabsTrigger>
        </TabsList>
        <TabsContent value="payroll" className="mt-6"><PayrollRunPage /></TabsContent>
        <TabsContent value="employees" className="mt-6"><Employees /></TabsContent>
        <TabsContent value="attendance" className="mt-6"><Attendance /></TabsContent>
        <TabsContent value="overtime" className="mt-6"><Overtime /></TabsContent>
        <TabsContent value="adjustments" className="mt-6"><Adjustments /></TabsContent>
        <TabsContent value="shifts" className="mt-6"><Shifts /></TabsContent>
        <TabsContent value="loans" className="mt-6"><Loans /></TabsContent>
      </Tabs>
    </div>
  );
}
