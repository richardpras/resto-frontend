import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { usePayrollStore, formatIDR, type AdjustmentType } from "@/stores/payrollStore";
import { DataTable, type Column } from "@/components/DataTable";
import { toast } from "sonner";

const allowanceCategories = ["Bonus", "Transport", "Meal", "Performance"];
const deductionCategories = ["Lateness", "Penalty", "Loan", "Other"];

export default function Adjustments() {
  const { employees, adjustments, addAdjustment, removeAdjustment } = usePayrollStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    type: "allowance" as AdjustmentType,
    category: "Bonus",
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const empName = (id: string) => employees.find((e) => e.id === id)?.name || "Unknown";

  const submit = async () => {
    if (!form.employeeId || form.amount <= 0) {
      toast.error("Fill all fields");
      return;
    }
    try {
      await addAdjustment(form);
      toast.success("Adjustment added");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save adjustment");
    }
  };

  const columns: Column<(typeof adjustments)[number]>[] = [
    { key: "employee", header: "Employee", sortable: true, render: (a) => empName(a.employeeId) },
    {
      key: "type",
      header: "Type",
      sortable: true,
      render: (a) => <Badge variant={a.type === "allowance" ? "default" : "destructive"}>{a.type}</Badge>,
    },
    { key: "category", header: "Category", sortable: true },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      render: (a) => <span className={a.type === "allowance" ? "text-green-600" : "text-destructive"}>{a.type === "allowance" ? "+" : "-"}{formatIDR(a.amount)}</span>,
    },
    { key: "date", header: "Date", sortable: true },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (a) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="icon" onClick={() => void removeAdjustment(a.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Allowances & Deductions</h2>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="h-4 w-4" />Add Entry</Button>
      </div>

      <DataTable
        data={adjustments}
        columns={columns}
        rowKey={(a) => a.id}
        searchKeys={["category", "type", "date", "notes"]}
        emptyMessage="No adjustments"
        defaultPageSize={10}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Adjustment</DialogTitle></DialogHeader>
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
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as AdjustmentType, category: v === "allowance" ? "Bonus" : "Lateness" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="allowance">Allowance</SelectItem>
                    <SelectItem value="deduction">Deduction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(form.type === "allowance" ? allowanceCategories : deductionCategories).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => void submit()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
