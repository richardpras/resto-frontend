import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { usePayrollStore, formatIDR } from "@/stores/payrollStore";
import { toast } from "sonner";

export default function Loans() {
  const { employees, loans, addLoan, removeLoan } = usePayrollStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    amount: 0,
    installments: 3,
    startDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const empName = (id: string) => employees.find((e) => e.id === id)?.name || "Unknown";

  const submit = () => {
    if (!form.employeeId || form.amount <= 0 || form.installments <= 0) {
      toast.error("Fill all fields");
      return;
    }
    addLoan(form);
    toast.success("Loan recorded");
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Employee Loans / Cash Advances</h2>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="h-4 w-4" />New Loan</Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Per Installment</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.map((l) => {
              const perInstall = Math.round(l.amount / l.installments);
              const pct = (l.paidInstallments / l.installments) * 100;
              return (
                <TableRow key={l.id}>
                  <TableCell>{empName(l.employeeId)}</TableCell>
                  <TableCell>{formatIDR(l.amount)}</TableCell>
                  <TableCell>{formatIDR(perInstall)}</TableCell>
                  <TableCell>
                    <div className="space-y-1 min-w-[140px]">
                      <Progress value={pct} className="h-2" />
                      <div className="text-xs text-muted-foreground">{l.paidInstallments}/{l.installments} paid</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={l.status === "active" ? "secondary" : "default"}>{l.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeLoan(l.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {loans.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No loans</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Loan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Installments (months)</Label>
                <Input type="number" min="1" value={form.installments} onChange={(e) => setForm({ ...form, installments: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
