import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, UserRound, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/DataTable";
import { ApiHttpError } from "@/lib/api-integration/client";
import {
  assignEmployeeUser,
  createOrganizationEmployee,
  listDepartments,
  listOrganizationEmployees,
  listPositions,
  removeEmployeeUser,
  updateOrganizationEmployee,
  type DepartmentRow,
  type OrganizationEmployeeRow,
  type PositionRow,
} from "@/lib/api-integration/organizationEndpoints";
import { listUsers, type UserApiRow } from "@/lib/api-integration/userManagementEndpoints";
import { useAuthStore } from "@/stores/authStore";
import { useOutletStore } from "@/stores/outletStore";
import { toast } from "sonner";
import { EmployeeAttendanceHistory } from "@/components/hr/EmployeeAttendanceHistory";
import { EmployeePayslipHistory } from "@/components/hr/EmployeePayslipHistory";
import { EmployeeCurrentShiftCard } from "@/components/hr/EmployeeCurrentShiftCard";
import { EmployeeCurrentWeekSchedule } from "@/components/hr/EmployeeCurrentWeekSchedule";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getEmployeeShiftHistory,
  type ShiftAssignmentApiRow,
} from "@/lib/api-integration/hrEndpoints";

const STATUSES = ["active", "inactive", "resigned", "terminated"] as const;

export default function Employees() {
  const { user } = useAuthStore();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const outlets = user?.assignedOutlets ?? [];
  const [outletId, setOutletId] = useState<number | null>(activeOutletId);
  const [rows, setRows] = useState<OrganizationEmployeeRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [users, setUsers] = useState<UserApiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OrganizationEmployeeRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState<ShiftAssignmentApiRow[]>([]);
  const [historyCurrent, setHistoryCurrent] = useState<ShiftAssignmentApiRow | null>(null);
  const [historyLabel, setHistoryLabel] = useState("");
  const [form, setForm] = useState({
    employeeNo: "",
    fullName: "",
    email: "",
    phone: "",
    gender: "",
    birthDate: "",
    hireDate: "",
    status: "active" as (typeof STATUSES)[number],
    positionId: "",
    departmentId: "",
    notes: "",
    userId: "",
  });

  const load = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const [emps, deps, pos, us] = await Promise.all([
        listOrganizationEmployees(outletId),
        listDepartments(outletId),
        listPositions(outletId),
        listUsers(),
      ]);
      setRows(emps);
      setDepartments(deps.filter((d) => d.isActive));
      setPositions(pos.filter((p) => p.isActive));
      setUsers(us);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [outletId]);

  useEffect(() => {
    if (outletId === null && activeOutletId) setOutletId(activeOutletId);
    else if (outletId === null && outlets[0]) setOutletId(outlets[0].id);
  }, [activeOutletId, outletId, outlets]);

  useEffect(() => {
    void load();
  }, [load]);

  const outletLabel = (id: number) => outlets.find((o) => o.id === id)?.name ?? String(id);

  const openNew = () => {
    setEditing(null);
    setForm({
      employeeNo: "",
      fullName: "",
      email: "",
      phone: "",
      gender: "",
      birthDate: "",
      hireDate: "",
      status: "active",
      positionId: "",
      departmentId: "",
      notes: "",
      userId: "",
    });
    setOpen(true);
  };

  const openShiftHistory = async (row: OrganizationEmployeeRow) => {
    try {
      const data = await getEmployeeShiftHistory(row.id);
      setHistoryLabel(row.fullName);
      setHistoryCurrent(data.current);
      setHistoryRows(data.history);
      setHistoryOpen(true);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load shift history");
    }
  };

  const openEdit = (row: OrganizationEmployeeRow) => {
    setEditing(row);
    setForm({
      employeeNo: row.employeeNo,
      fullName: row.fullName,
      email: row.email ?? "",
      phone: row.phone ?? "",
      gender: row.gender ?? "",
      birthDate: row.birthDate ?? "",
      hireDate: row.hireDate ?? "",
      status: (row.status as (typeof STATUSES)[number]) || "active",
      positionId: row.positionId ? String(row.positionId) : "",
      departmentId: row.departmentId ? String(row.departmentId) : "",
      notes: row.notes ?? "",
      userId: row.userId ? String(row.userId) : "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!outletId || !form.fullName.trim()) {
      return toast.error("Full name is required");
    }
    setSaving(true);
    try {
      const payload = {
        employeeNo: form.employeeNo || undefined,
        fullName: form.fullName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        gender: form.gender || undefined,
        birthDate: form.birthDate || undefined,
        hireDate: form.hireDate || undefined,
        status: form.status,
        positionId: form.positionId ? Number(form.positionId) : null,
        departmentId: form.departmentId ? Number(form.departmentId) : null,
        notes: form.notes || undefined,
      };
      let saved: OrganizationEmployeeRow;
      if (editing) {
        saved = await updateOrganizationEmployee(editing.id, payload);
        if (form.userId && Number(form.userId) !== (editing.userId ?? 0)) {
          saved = await assignEmployeeUser(editing.id, Number(form.userId));
        } else if (!form.userId && editing.userId) {
          saved = await removeEmployeeUser(editing.id);
        }
        toast.success("Employee updated");
      } else {
        saved = await createOrganizationEmployee({ outletId, ...payload });
        if (form.userId) {
          saved = await assignEmployeeUser(saved.id, Number(form.userId));
        }
        toast.success("Employee created");
      }
      void saved;
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<OrganizationEmployeeRow>[] = [
    { key: "employeeNo", header: "Employee No", sortable: true },
    { key: "fullName", header: "Name", sortable: true },
    { key: "positionName", header: "Position", render: (r) => r.positionName ?? "—" },
    {
      key: "departmentId",
      header: "Department",
      render: (r) => r.department?.name ?? departments.find((d) => d.id === r.departmentId)?.name ?? "—",
    },
    { key: "outletId", header: "Outlet", render: (r) => r.outlet?.name ?? outletLabel(r.outletId) },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-muted capitalize">{r.status}</span>
      ),
    },
    {
      key: "linkedUser",
      header: "Linked User",
      render: (r) => (r.linkedUser ? `${r.linkedUser.name} (${r.linkedUser.email})` : "—"),
    },
    {
      key: "actions",
      header: "",
      className: "w-16 text-right",
      render: (r) => (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UserRound className="h-7 w-7 text-primary" /> Employees
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Internal staff records and system account links.</p>
        </div>
        {outlets.length > 0 && (
          <Select value={outletId ? String(outletId) : ""} onValueChange={(v) => setOutletId(Number(v))}>
            <SelectTrigger className="w-48 rounded-xl">
              <SelectValue placeholder="Outlet" />
            </SelectTrigger>
            <SelectContent>
              {outlets.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.id}
        loading={loading}
        searchPlaceholder="Search name, no, email, phone..."
        searchKeys={["fullName", "employeeNo", "email", "phone"]}
        emptyMessage="No employees yet"
        emptyAction={{ label: "Add employee", onClick: openNew }}
        rightToolbar={
          <Button onClick={openNew} className="rounded-xl" disabled={!outletId}>
            <Plus className="h-4 w-4 mr-1" /> Add employee
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit employee" : "New employee"}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="general">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="employment">Employment</TabsTrigger>
              <TabsTrigger value="shift">Shift</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="payslips">Payslips</TabsTrigger>
              <TabsTrigger value="account">System account</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="grid gap-3 pt-3">
              <div>
                <Label>Employee no</Label>
                <Input
                  value={form.employeeNo}
                  onChange={(e) => setForm({ ...form, employeeNo: e.target.value })}
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div>
                <Label>Full name *</Label>
                <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Gender</Label>
                  <Input value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} />
                </div>
                <div>
                  <Label>Birth date</Label>
                  <Input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="employment" className="grid gap-3 pt-3">
              <div>
                <Label>Department</Label>
                <Select value={form.departmentId || "none"} onValueChange={(v) => setForm({ ...form, departmentId: v === "none" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Position</Label>
                <Select value={form.positionId || "none"} onValueChange={(v) => setForm({ ...form, positionId: v === "none" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {positions.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Hire date</Label>
                  <Input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as (typeof STATUSES)[number] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </TabsContent>
            <TabsContent value="shift" className="grid gap-3 pt-3">
              {editing ? (
                <>
                  <EmployeeCurrentShiftCard employeeId={editing.id} />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => void openShiftHistory(editing)}
                  >
                    <History className="h-4 w-4 mr-2" />
                    View assignment history
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Manage assignments under Payroll → Assignments.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Save the employee first to view shift assignment.</p>
              )}
            </TabsContent>
            <TabsContent value="schedule" className="grid gap-3 pt-3">
              {editing ? (
                <>
                  <EmployeeCurrentWeekSchedule employeeId={editing.id} />
                  <p className="text-xs text-muted-foreground">Read-only. Edit schedules under Payroll → Scheduling.</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Save the employee first to view the weekly schedule.</p>
              )}
            </TabsContent>
            <TabsContent value="attendance" className="grid gap-3 pt-3">
              {editing ? (
                <>
                  <EmployeeAttendanceHistory employeeId={editing.id} limit={30} />
                  <p className="text-xs text-muted-foreground">
                    Read-only (last 30 days). Import and corrections under Payroll → Attendance.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Save the employee first to view attendance history.</p>
              )}
            </TabsContent>
            <TabsContent value="payslips" className="grid gap-3 pt-3">
              {editing ? (
                <>
                  <EmployeePayslipHistory employeeId={editing.id} />
                  <p className="text-xs text-muted-foreground">Read-only payslip history with PDF download.</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Save the employee first to view payslip history.</p>
              )}
            </TabsContent>
            <TabsContent value="account" className="grid gap-3 pt-3">
              <p className="text-sm text-muted-foreground">
                Link a login user to this employee. The user must belong to the same outlet.
              </p>
              <div>
                <Label>User account</Label>
                <Select value={form.userId || "none"} onValueChange={(v) => setForm({ ...form, userId: v === "none" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="No link" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— No link —</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Shift history — {historyLabel}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {historyCurrent?.shift ? (
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1">Current</p>
                <p className="font-medium">{historyCurrent.shift.name}</p>
                <p className="text-sm text-muted-foreground">
                  {historyCurrent.shift.startTime} – {historyCurrent.shift.endTime}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No current assignment.</p>
            )}
            <ul className="space-y-2">
              {historyRows.map((h) => (
                <li key={h.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{h.shift?.name ?? "Shift"}</p>
                  <p className="text-muted-foreground text-xs">
                    {h.effectiveFrom} → {h.effectiveUntil ?? (h.isActive ? "Present" : "—")}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
