import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { usePayrollStore, type AttendanceStatus } from "@/stores/payrollStore";
import { DataTable, type Column } from "@/components/DataTable";
import { toast } from "sonner";

function calcStatus(checkIn?: string): AttendanceStatus {
  if (!checkIn) return "absent";
  const [h, m] = checkIn.split(":").map(Number);
  if (h > 9 || (h === 9 && m > 0)) return "late";
  return "present";
}

function workHours(ci?: string, co?: string): string {
  if (!ci || !co) return "-";
  const [h1, m1] = ci.split(":").map(Number);
  const [h2, m2] = co.split(":").map(Number);
  const mins = h2 * 60 + m2 - (h1 * 60 + m1);
  if (mins <= 0) return "-";
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function Attendance() {
  const { employees, attendance, addAttendance, removeAttendance } = usePayrollStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    date: new Date().toISOString().slice(0, 10),
    checkIn: "09:00",
    checkOut: "17:00",
    notes: "",
  });

  const submit = () => {
    if (!form.employeeId) {
      toast.error("Select an employee");
      return;
    }
    void addAttendance({ ...form, status: calcStatus(form.checkIn) })
      .then(() => {
        toast.success("Attendance logged");
        setOpen(false);
      })
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : "Failed to log attendance");
      });
  };

  const empName = (id: string) => employees.find((e) => e.id === id)?.name || "Unknown";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Attendance</h2>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="h-4 w-4" />Log Attendance</Button>
      </div>

      <Card className="p-0 border-0 shadow-none">
        <DataTable
          data={attendance}
          rowKey={(a) => a.id}
          searchPlaceholder="Search attendance..."
          searchKeys={["date", "status", "notes"]}
          emptyMessage="No attendance records"
          defaultPageSize={10}
          pageSizeOptions={[10, 25, 50]}
          columns={[
            { key: "employee", header: "Employee", sortable: true, render: (a) => empName(a.employeeId) },
            { key: "date", header: "Date", sortable: true },
            { key: "checkIn", header: "Check In", render: (a) => a.checkIn || "-" },
            { key: "checkOut", header: "Check Out", render: (a) => a.checkOut || "-" },
            { key: "hours", header: "Hours", render: (a) => workHours(a.checkIn, a.checkOut) },
            {
              key: "status",
              header: "Status",
              sortable: true,
              render: (a) => (
                <Badge variant={a.status === "present" ? "default" : a.status === "late" ? "secondary" : "destructive"}>
                  {a.status}
                </Badge>
              ),
            },
            {
              key: "actions",
              header: "Actions",
              className: "text-right",
              render: (a) => (
                <div className="flex justify-end">
                  <Button variant="ghost" size="icon" onClick={() => void removeAttendance(a.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ),
            },
          ] as Column<(typeof attendance)[number]>[]}
        />
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Attendance</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Check In</Label>
                <Input type="time" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Check Out</Label>
                <Input type="time" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} />
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
