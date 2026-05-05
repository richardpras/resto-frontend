import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Check, X, Trash2 } from "lucide-react";
import { usePayrollStore } from "@/stores/payrollStore";
import { DataTable, type Column } from "@/components/DataTable";
import { toast } from "sonner";

export default function Overtime() {
  const { employees, overtimes, addOvertime, updateOvertime, removeOvertime } = usePayrollStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    date: new Date().toISOString().slice(0, 10),
    hours: 1,
    notes: "",
  });

  const empName = (id: string) => employees.find((e) => e.id === id)?.name || "Unknown";

  const submit = async () => {
    if (!form.employeeId || form.hours <= 0) {
      toast.error("Fill all fields");
      return;
    }
    try {
      await addOvertime({ ...form, status: "pending" });
      toast.success("Overtime requested");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save overtime");
    }
  };

  const columns: Column<(typeof overtimes)[number]>[] = [
    { key: "employee", header: "Employee", sortable: true, render: (o) => empName(o.employeeId) },
    { key: "date", header: "Date", sortable: true },
    { key: "hours", header: "Hours", sortable: true, render: (o) => `${o.hours}h` },
    { key: "notes", header: "Notes", render: (o) => <span className="text-muted-foreground">{o.notes || "-"}</span> },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (o) => (
        <Badge variant={o.status === "approved" ? "default" : o.status === "rejected" ? "destructive" : "secondary"}>
          {o.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (o) => (
        <div className="flex justify-end">
          {o.status === "pending" && (
            <>
              <Button variant="ghost" size="icon" onClick={() => void updateOvertime(o.id, { status: "approved" })}>
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => void updateOvertime(o.id, { status: "rejected" })}>
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={() => void removeOvertime(o.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Overtime</h2>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="h-4 w-4" />Add Overtime</Button>
      </div>

      <DataTable
        data={overtimes}
        columns={columns}
        rowKey={(o) => o.id}
        searchKeys={["date", "status", "notes"]}
        emptyMessage="No overtime records"
        defaultPageSize={10}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Overtime</DialogTitle></DialogHeader>
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
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Hours</Label>
                <Input type="number" min="0" step="0.5" value={form.hours} onChange={(e) => setForm({ ...form, hours: Number(e.target.value) })} />
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
