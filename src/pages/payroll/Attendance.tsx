import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { usePayrollStore } from "@/stores/payrollStore";
import { syncAttendance as syncAttendanceApi } from "@/lib/api";
import { buildCheckInOutIso } from "@/lib/payrollMappers";
import { toast } from "sonner";

function workHours(ci?: string, co?: string): string {
  if (!ci || !co) return "-";
  const [h1, m1] = ci.split(":").map(Number);
  const [h2, m2] = co.split(":").map(Number);
  const mins = h2 * 60 + m2 - (h1 * 60 + m1);
  if (mins <= 0) return "-";
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function Attendance() {
  const { employees, attendance, refreshAttendanceFromApi } = usePayrollStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    date: new Date().toISOString().slice(0, 10),
    checkIn: "09:00",
    checkOut: "17:00",
    notes: "",
  });

  const submit = async () => {
    if (!form.employeeId) {
      toast.error("Select an employee");
      return;
    }
    const employeeId = Number(form.employeeId);
    if (!Number.isFinite(employeeId)) {
      toast.error("Invalid employee");
      return;
    }
    const externalRef =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    try {
      const { duplicate, data } = await syncAttendanceApi({
        source: "web",
        externalRef,
        employeeId,
        attendanceDate: form.date,
        checkIn: buildCheckInOutIso(form.date, form.checkIn),
        checkOut: buildCheckInOutIso(form.date, form.checkOut),
        notes: form.notes.trim() || undefined,
        syncKey: externalRef,
      });
      if (duplicate) {
        toast.message("Duplicate sync", { description: "This punch was already recorded." });
      } else {
        toast.success("Attendance synced");
      }
      if (data) {
        await refreshAttendanceFromApi();
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    }
  };

  const empName = (id: string) => employees.find((e) => e.id === id)?.name || "Unknown";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Attendance</h2>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="h-4 w-4" />Log Attendance</Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendance.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{empName(a.employeeId)}</TableCell>
                <TableCell>{a.date}</TableCell>
                <TableCell>{a.checkIn || "-"}</TableCell>
                <TableCell>{a.checkOut || "-"}</TableCell>
                <TableCell>{workHours(a.checkIn, a.checkOut)}</TableCell>
                <TableCell>
                  <Badge variant={a.status === "present" ? "default" : a.status === "late" ? "secondary" : "destructive"}>
                    {a.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {attendance.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No attendance records</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
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
            <Button onClick={() => void submit()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
