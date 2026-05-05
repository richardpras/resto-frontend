import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { usePayrollStore } from "@/stores/payrollStore";
import { DataTable, type Column } from "@/components/DataTable";
import { toast } from "sonner";

export default function Shifts() {
  const { shifts, addShift, removeShift } = usePayrollStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    startTime: "09:00",
    endTime: "17:00",
    notes: "General shift",
  });

  const submit = async () => {
    if (!form.startTime || !form.endTime) return toast.error("Start and end time are required");
    try {
      await addShift({
        employeeId: "",
        date: "",
        startTime: form.startTime,
        endTime: form.endTime,
        notes: form.notes,
      });
      toast.success("Shift template saved");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save shift");
    }
  };

  const columns: Column<(typeof shifts)[number]>[] = [
    { key: "notes", header: "Shift", sortable: true, render: (s) => s.notes || "Unnamed shift" },
    { key: "startTime", header: "Start", sortable: true },
    { key: "endTime", header: "End", sortable: true },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (s) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="icon" onClick={() => void removeShift(s.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Shift Scheduling</h2>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="h-4 w-4" />Schedule Shift</Button>
      </div>

      <DataTable
        data={shifts}
        columns={columns}
        rowKey={(s) => s.id}
        searchKeys={["notes", "startTime", "endTime"]}
        emptyMessage="No shift templates"
        defaultPageSize={10}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Shift</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start</Label>
                <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End</Label>
                <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
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
