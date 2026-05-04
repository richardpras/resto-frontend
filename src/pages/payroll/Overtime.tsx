import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Check, X, Trash2 } from "lucide-react";
import { usePayrollStore } from "@/stores/payrollStore";
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

  const submit = () => {
    if (!form.employeeId || form.hours <= 0) {
      toast.error("Fill all fields");
      return;
    }
    addOvertime({ ...form, status: "pending" });
    toast.success("Overtime requested");
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Overtime</h2>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="h-4 w-4" />Add Overtime</Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {overtimes.map((o) => (
              <TableRow key={o.id}>
                <TableCell>{empName(o.employeeId)}</TableCell>
                <TableCell>{o.date}</TableCell>
                <TableCell>{o.hours}h</TableCell>
                <TableCell className="text-muted-foreground">{o.notes || "-"}</TableCell>
                <TableCell>
                  <Badge variant={o.status === "approved" ? "default" : o.status === "rejected" ? "destructive" : "secondary"}>
                    {o.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {o.status === "pending" && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => updateOvertime(o.id, { status: "approved" })}>
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => updateOvertime(o.id, { status: "rejected" })}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => removeOvertime(o.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {overtimes.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No overtime records</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

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
            <Button onClick={submit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
