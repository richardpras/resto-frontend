import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { usePayrollStore, formatIDR, type Employee, type SalaryType } from "@/stores/payrollStore";
import {
  createEmployee as createEmployeeApi,
  updateEmployee as updateEmployeeApi,
  deleteEmployee as deleteEmployeeApi,
} from "@/lib/api";
import { employeeToCreatePayload, employeeToUpdatePayload, type EmployeeFormForApi } from "@/lib/payrollMappers";
import { toast } from "sonner";

const empty: EmployeeFormForApi = {
  name: "",
  position: "",
  outlet: "Main",
  joinDate: new Date().toISOString().slice(0, 10),
  salaryType: "monthly",
  baseSalary: 0,
  overtimeRate: 0,
  status: "active",
  employeeNo: "",
  email: "",
  phone: "",
};

export default function Employees() {
  const { employees, refreshEmployeesFromApi } = usePayrollStore();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeFormForApi>(empty);

  const openCreate = () => {
    setEditId(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (e: Employee) => {
    setEditId(e.id);
    const { id, ...rest } = e;
    setForm({
      ...rest,
      employeeNo: e.employeeNo ?? "",
      email: e.email ?? "",
      phone: e.phone ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.name || !form.position) {
      toast.error("Name and position required");
      return;
    }
    try {
      if (editId) {
        if (!form.employeeNo.trim()) {
          toast.error("Employee number is required for updates");
          return;
        }
        await updateEmployeeApi(editId, employeeToUpdatePayload(form));
        toast.success("Employee updated");
      } else {
        await createEmployeeApi(employeeToCreatePayload(form));
        toast.success("Employee added");
      }
      await refreshEmployeesFromApi();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteEmployeeApi(id);
      await refreshEmployeesFromApi();
      toast.success("Employee removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Employees</h2>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4" />Add Employee</Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Outlet</TableHead>
              <TableHead>Salary Type</TableHead>
              <TableHead>Base Salary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{e.employeeNo || "—"}</TableCell>
                <TableCell className="font-medium">{e.name}</TableCell>
                <TableCell>{e.position}</TableCell>
                <TableCell>{e.outlet}</TableCell>
                <TableCell className="capitalize">{e.salaryType}</TableCell>
                <TableCell>{formatIDR(e.baseSalary)}</TableCell>
                <TableCell>
                  <Badge variant={e.status === "active" ? "default" : "secondary"}>{e.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => void remove(e.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {employees.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No employees (check API token and backend).</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit" : "Add"} Employee</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Employee No. {!editId && <span className="text-muted-foreground text-xs">(optional — auto if empty)</span>}</Label>
              <Input value={form.employeeNo} onChange={(e) => setForm({ ...form, employeeNo: e.target.value })} placeholder="EMP-001" />
            </div>
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Outlet (UI only)</Label>
              <Input value={form.outlet} onChange={(e) => setForm({ ...form, outlet: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Hire date</Label>
              <Input type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Salary Type (UI only)</Label>
              <Select value={form.salaryType} onValueChange={(v) => setForm({ ...form, salaryType: v as SalaryType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "active" | "inactive" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Base salary (IDR)</Label>
              <Input type="number" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Overtime rate (UI only)</Label>
              <Input type="number" value={form.overtimeRate} onChange={(e) => setForm({ ...form, overtimeRate: Number(e.target.value) })} />
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
