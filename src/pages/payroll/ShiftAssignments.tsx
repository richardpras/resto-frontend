import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/DataTable";
import { ApiHttpError } from "@/lib/api-integration/client";
import {
  createShiftAssignment,
  deactivateShiftAssignment,
  getEmployeeShiftHistory,
  listShiftAssignments,
  updateShiftAssignment,
  type ShiftAssignmentApiRow,
} from "@/lib/api-integration/hrEndpoints";
import { usePayrollStore } from "@/stores/payrollStore";
import { History, Plus } from "lucide-react";
import { toast } from "sonner";

const emptyForm = {
  employeeId: "",
  shiftId: "",
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveUntil: "",
  notes: "",
};

function formatRange(from: string, until: string | null, isActive: boolean): string {
  const end = until ?? (isActive ? "Present" : "—");
  return `${from} → ${end}`;
}

export default function ShiftAssignments() {
  const { employees, shifts, refreshEmployeesFromApi, refreshShiftsFromApi } = usePayrollStore();
  const [rows, setRows] = useState<ShiftAssignmentApiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEmployeeId, setHistoryEmployeeId] = useState<number | null>(null);
  const [historyTitle, setHistoryTitle] = useState("");
  const [historyCurrent, setHistoryCurrent] = useState<ShiftAssignmentApiRow | null>(null);
  const [historyRows, setHistoryRows] = useState<ShiftAssignmentApiRow[]>([]);
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const employeeId = filterEmployeeId !== "all" ? Number(filterEmployeeId) : undefined;
      const data = await listShiftAssignments(
        employeeId ? { employeeId } : undefined,
      );
      setRows(data);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load shift assignments");
    } finally {
      setLoading(false);
    }
  }, [filterEmployeeId]);

  useEffect(() => {
    void Promise.all([refreshEmployeesFromApi(), refreshShiftsFromApi()]).catch(() => undefined);
  }, [refreshEmployeesFromApi, refreshShiftsFromApi]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (row: ShiftAssignmentApiRow) => {
    setEditId(row.id);
    setForm({
      employeeId: String(row.employeeId),
      shiftId: String(row.shiftId),
      effectiveFrom: row.effectiveFrom,
      effectiveUntil: row.effectiveUntil ?? "",
      notes: row.notes ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.employeeId || !form.shiftId || !form.effectiveFrom) {
      toast.error("Employee, shift, and start date are required");
      return;
    }
    try {
      const payload = {
        employeeId: Number(form.employeeId),
        shiftId: Number(form.shiftId),
        effectiveFrom: form.effectiveFrom,
        effectiveUntil: form.effectiveUntil.trim() ? form.effectiveUntil : null,
        notes: form.notes || null,
      };
      if (editId) {
        await updateShiftAssignment(editId, payload);
        toast.success("Assignment updated");
      } else {
        await createShiftAssignment(payload);
        toast.success("Assignment created");
      }
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Save failed");
    }
  };

  const deactivate = async (id: number) => {
    try {
      await deactivateShiftAssignment(id);
      toast.success("Assignment deactivated");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Deactivate failed");
    }
  };

  const openHistory = async (employeeId: number, label: string) => {
    try {
      const data = await getEmployeeShiftHistory(employeeId);
      setHistoryEmployeeId(employeeId);
      setHistoryTitle(label);
      setHistoryCurrent(data.current);
      setHistoryRows(data.history);
      setHistoryOpen(true);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load history");
    }
  };

  const empName = (row: ShiftAssignmentApiRow) =>
    row.employee?.fullName ?? employees.find((e) => e.id === String(row.employeeId))?.name ?? `#${row.employeeId}`;

  const columns: Column<ShiftAssignmentApiRow>[] = [
    {
      key: "employee",
      header: "Employee",
      sortable: true,
      render: (r) => <span className="font-medium">{empName(r)}</span>,
    },
    {
      key: "shift",
      header: "Shift",
      sortable: true,
      render: (r) =>
        r.shift ? (
          <span>
            {r.shift.name}{" "}
            <span className="text-muted-foreground text-xs">
              {r.shift.startTime}–{r.shift.endTime}
            </span>
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "effective",
      header: "Effective",
      render: (r) => formatRange(r.effectiveFrom, r.effectiveUntil, r.isActive),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Badge variant={r.isActive ? "default" : "secondary"}>{r.isActive ? "Active" : "Inactive"}</Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => void openHistory(r.employeeId, empName(r))}>
            <History className="h-4 w-4 mr-1" />
            History
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
            Edit
          </Button>
          {r.isActive && (
            <Button variant="outline" size="sm" onClick={() => void deactivate(r.id)}>
              Deactivate
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold">Shift Assignments</h2>
          <p className="text-sm text-muted-foreground">Assign shift templates to employees for a date range.</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New assignment
        </Button>
      </div>

      <div className="flex gap-3 max-w-xs">
        <Select value={filterEmployeeId} onValueChange={setFilterEmployeeId}>
          <SelectTrigger>
            <SelectValue placeholder="All employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All employees</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => String(r.id)}
        loading={loading}
        searchKeys={["notes"]}
        searchPlaceholder="Search notes..."
        emptyMessage="No shift assignments yet"
        defaultPageSize={10}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit assignment" : "New assignment"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select
                value={form.employeeId}
                onValueChange={(v) => setForm({ ...form, employeeId: v })}
                disabled={editId !== null}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Shift template</Label>
              <Select value={form.shiftId} onValueChange={(v) => setForm({ ...form, shiftId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.startTime}–{s.endTime})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Effective from</Label>
                <Input
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Effective until</Label>
                <Input
                  type="date"
                  value={form.effectiveUntil}
                  onChange={(e) => setForm({ ...form, effectiveUntil: e.target.value })}
                  placeholder="Open-ended"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submit()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Assignment history — {historyTitle}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-2">Current shift</h3>
              {historyCurrent?.shift ? (
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="font-medium">{historyCurrent.shift.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {historyCurrent.shift.startTime} – {historyCurrent.shift.endTime}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Effective: {formatRange(historyCurrent.effectiveFrom, historyCurrent.effectiveUntil, historyCurrent.isActive)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active assignment for today.</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">History</h3>
              <ul className="space-y-3">
                {historyRows.map((h) => (
                  <li key={h.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-medium">{h.shift?.name ?? "Shift"}</span>
                      <Badge variant={h.isActive ? "default" : "secondary"} className="shrink-0">
                        {h.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs mt-1">
                      {h.shift?.startTime}–{h.shift?.endTime}
                    </p>
                    <p className="text-xs mt-1">{formatRange(h.effectiveFrom, h.effectiveUntil, h.isActive)}</p>
                  </li>
                ))}
                {historyRows.length === 0 && (
                  <p className="text-sm text-muted-foreground">No assignments recorded.</p>
                )}
              </ul>
            </div>
            {historyEmployeeId && (
              <Button variant="outline" className="w-full" onClick={() => void openHistory(historyEmployeeId, historyTitle)}>
                Refresh
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
