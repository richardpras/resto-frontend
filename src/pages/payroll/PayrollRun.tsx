import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, Save, CheckCircle2, DollarSign, FileText, Trash2, Eye, Printer } from "lucide-react";
import { usePayrollStore, formatIDR, type PayrollRun, type PayrollLine } from "@/stores/payrollStore";
import { toast } from "sonner";

export default function PayrollRunPage() {
  const { employees, runs, apiPayrolls, calculateRun, saveRun, finalizeRun, markRunPaid, deleteRun } = usePayrollStore();
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [outlet, setOutlet] = useState("");
  const [draft, setDraft] = useState<PayrollRun | null>(null);
  const [viewRun, setViewRun] = useState<PayrollRun | null>(null);
  const [payslipLine, setPayslipLine] = useState<{ run: PayrollRun; line: PayrollLine } | null>(null);

  const empName = (id: string) => employees.find((e) => e.id === id)?.name || "Unknown";
  const empPosition = (id: string) => employees.find((e) => e.id === id)?.position || "";

  const handleCalculate = () => {
    const run = calculateRun(period, outlet || undefined);
    setDraft(run);
    toast.success(`Calculated for ${run.lines.length} employees`);
  };

  const handleSave = () => {
    if (!draft) return;
    saveRun(draft);
    setDraft(null);
    toast.success("Payroll saved as draft");
  };

  const handleFinalize = (id: string) => {
    finalizeRun(id);
    toast.success("Payroll finalized — data locked");
  };

  const handlePay = (id: string) => {
    markRunPaid(id);
    toast.success("Marked as paid");
  };

  const printPayslip = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Process Payroll */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Process Payroll</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Period</Label>
            <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Outlet (optional)</Label>
            <Input placeholder="All outlets" value={outlet} onChange={(e) => setOutlet(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={handleCalculate} className="w-full"><Calculator className="h-4 w-4" />Calculate Payroll</Button>
          </div>
        </div>

        {draft && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Draft for <span className="font-medium text-foreground">{draft.period}</span> · {draft.lines.length} employees
              </div>
              <Button onClick={handleSave} size="sm"><Save className="h-4 w-4" />Save Draft</Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Att. Adj</TableHead>
                    <TableHead className="text-right">OT</TableHead>
                    <TableHead className="text-right">Allow.</TableHead>
                    <TableHead className="text-right">Deduct.</TableHead>
                    <TableHead className="text-right">Loan</TableHead>
                    <TableHead className="text-right">PPH21</TableHead>
                    <TableHead className="text-right font-semibold">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draft.lines.map((l) => (
                    <TableRow key={l.employeeId}>
                      <TableCell>{empName(l.employeeId)}</TableCell>
                      <TableCell className="text-right">{formatIDR(l.baseSalary)}</TableCell>
                      <TableCell className="text-right text-destructive">{l.attendanceAdjustment ? formatIDR(l.attendanceAdjustment) : "-"}</TableCell>
                      <TableCell className="text-right text-green-600">{l.overtimePay ? formatIDR(l.overtimePay) : "-"}</TableCell>
                      <TableCell className="text-right text-green-600">{l.allowances ? formatIDR(l.allowances) : "-"}</TableCell>
                      <TableCell className="text-right text-destructive">{l.deductions ? formatIDR(l.deductions) : "-"}</TableCell>
                      <TableCell className="text-right text-destructive">{l.loanDeduction ? formatIDR(l.loanDeduction) : "-"}</TableCell>
                      <TableCell className="text-right text-destructive">{formatIDR(l.pph21)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatIDR(l.netSalary)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </Card>

      {/* Server-posted payrolls (HR API) */}
      {apiPayrolls.length > 0 && (
        <Card>
          <div className="p-6 flex items-center gap-2 border-b">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Posted payrolls (server)</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Base</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiPayrolls.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{empName(String(p.employeeId))}</TableCell>
                  <TableCell className="text-sm">
                    {p.periodStart} → {p.periodEnd}
                  </TableCell>
                  <TableCell className="text-right">{formatIDR(p.baseAmount)}</TableCell>
                  <TableCell className="text-right font-medium">{formatIDR(p.netAmount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Payroll Runs */}
      <Card>
        <div className="p-6 flex items-center gap-2 border-b">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Payroll Runs</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Outlet</TableHead>
              <TableHead>Employees</TableHead>
              <TableHead>Total Net</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((r) => {
              const total = r.lines.reduce((s, l) => s + l.netSalary, 0);
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.period}</TableCell>
                  <TableCell>{r.outlet || "All"}</TableCell>
                  <TableCell>{r.lines.length}</TableCell>
                  <TableCell>{formatIDR(total)}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "paid" ? "default" : r.status === "processed" ? "secondary" : "outline"}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => setViewRun(r)}><Eye className="h-4 w-4" /></Button>
                    {r.status === "draft" && (
                      <Button variant="outline" size="sm" onClick={() => handleFinalize(r.id)}>
                        <CheckCircle2 className="h-4 w-4" />Finalize
                      </Button>
                    )}
                    {r.status === "processed" && (
                      <Button size="sm" onClick={() => handlePay(r.id)}>
                        <DollarSign className="h-4 w-4" />Mark Paid
                      </Button>
                    )}
                    {r.status === "draft" && (
                      <Button variant="ghost" size="icon" onClick={() => deleteRun(r.id)}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {runs.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No payroll runs yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* View run dialog */}
      <Dialog open={!!viewRun} onOpenChange={(o) => !o && setViewRun(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Payroll {viewRun?.period} · {viewRun?.status}</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">OT</TableHead>
                  <TableHead className="text-right">Allow.</TableHead>
                  <TableHead className="text-right">Deduct.</TableHead>
                  <TableHead className="text-right">PPH21</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewRun?.lines.map((l) => (
                  <TableRow key={l.employeeId}>
                    <TableCell>{empName(l.employeeId)}</TableCell>
                    <TableCell className="text-right">{formatIDR(l.baseSalary)}</TableCell>
                    <TableCell className="text-right">{formatIDR(l.overtimePay)}</TableCell>
                    <TableCell className="text-right">{formatIDR(l.allowances)}</TableCell>
                    <TableCell className="text-right">{formatIDR(l.deductions + l.loanDeduction)}</TableCell>
                    <TableCell className="text-right">{formatIDR(l.pph21)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatIDR(l.netSalary)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => { if (viewRun) setPayslipLine({ run: viewRun, line: l }); }}>
                        <FileText className="h-4 w-4" />Payslip
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payslip dialog */}
      <Dialog open={!!payslipLine} onOpenChange={(o) => !o && setPayslipLine(null)}>
        <DialogContent className="max-w-md print:shadow-none">
          <DialogHeader>
            <DialogTitle>Payslip</DialogTitle>
          </DialogHeader>
          {payslipLine && (
            <div className="space-y-4 print:p-4">
              <div className="border-b pb-3">
                <div className="font-bold text-lg">{empName(payslipLine.line.employeeId)}</div>
                <div className="text-sm text-muted-foreground">{empPosition(payslipLine.line.employeeId)}</div>
                <div className="text-sm text-muted-foreground">Period: {payslipLine.run.period}</div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Base Salary</span><span>{formatIDR(payslipLine.line.baseSalary)}</span></div>
                <div className="flex justify-between"><span>Attendance Adjustment</span><span>{formatIDR(payslipLine.line.attendanceAdjustment)}</span></div>
                <div className="flex justify-between"><span>Overtime ({payslipLine.line.overtimeHours}h)</span><span className="text-green-600">+{formatIDR(payslipLine.line.overtimePay)}</span></div>
                <div className="flex justify-between"><span>Allowances</span><span className="text-green-600">+{formatIDR(payslipLine.line.allowances)}</span></div>
                <div className="border-t pt-2 flex justify-between font-medium"><span>Gross</span><span>{formatIDR(payslipLine.line.taxableIncome)}</span></div>
                <div className="flex justify-between text-destructive"><span>Deductions</span><span>-{formatIDR(payslipLine.line.deductions)}</span></div>
                <div className="flex justify-between text-destructive"><span>Loan Repayment</span><span>-{formatIDR(payslipLine.line.loanDeduction)}</span></div>
                <div className="flex justify-between text-destructive"><span>PPH21 Tax</span><span>-{formatIDR(payslipLine.line.pph21)}</span></div>
                <div className="border-t pt-2 flex justify-between font-bold text-base"><span>Net Salary</span><span>{formatIDR(payslipLine.line.netSalary)}</span></div>
              </div>

              <div className="text-xs text-muted-foreground pt-2 border-t">
                Attendance: {payslipLine.line.presentDays}/{payslipLine.line.workingDays} working days
              </div>
            </div>
          )}
          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setPayslipLine(null)}>Close</Button>
            <Button onClick={printPayslip}><Printer className="h-4 w-4" />Print / PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
