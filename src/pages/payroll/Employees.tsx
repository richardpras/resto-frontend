import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { usePayrollStore, formatIDR, type Employee, type SalaryType } from "@/stores/payrollStore";
import { DataTable, type Column } from "@/components/DataTable";
import {
  createEmployee as createEmployeeApi,
  updateEmployee as updateEmployeeApi,
  deleteEmployee as deleteEmployeeApi,
} from "@/lib/api";
import { employeeToCreatePayload, employeeToUpdatePayload, type EmployeeFormForApi } from "@/lib/payrollMappers";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
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
  const { t } = useErpTranslation();
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
      toast.error(t("payroll.employees.namePositionRequired"));
      return;
    }
    try {
      if (editId) {
        if (!form.employeeNo.trim()) {
          toast.error(t("payroll.employees.employeeNoRequired"));
          return;
        }
        await updateEmployeeApi(editId, employeeToUpdatePayload(form));
        toast.success(t("payroll.employees.updated"));
      } else {
        await createEmployeeApi(employeeToCreatePayload(form));
        toast.success(t("payroll.employees.added"));
      }
      await refreshEmployeesFromApi();
      setOpen(false);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.saveFailed"));
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteEmployeeApi(id);
      await refreshEmployeesFromApi();
      toast.success(t("payroll.employees.removed"));
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.deleteFailed"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{t("payroll.employees.title")}</h2>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4" />{t("payroll.employees.add")}</Button>
      </div>

      <Card className="p-0 border-0 shadow-none">
        <DataTable
          data={employees}
          rowKey={(e) => e.id}
          searchPlaceholder={t("payroll.employees.searchPlaceholder")}
          searchKeys={["employeeNo", "name", "position", "outlet", "status"]}
          emptyMessage={t("payroll.employees.empty")}
          defaultPageSize={10}
          pageSizeOptions={[10, 25, 50]}
          columns={[
            { key: "employeeNo", header: t("payroll.employees.no"), sortable: true, render: (e) => <span className="font-mono text-xs text-muted-foreground">{e.employeeNo || "—"}</span> },
            { key: "name", header: t("payroll.shared.name"), sortable: true, render: (e) => <span className="font-medium">{e.name}</span> },
            { key: "position", header: t("payroll.employees.position"), sortable: true },
            { key: "outlet", header: t("payroll.employees.outlet"), sortable: true },
            { key: "salaryType", header: t("payroll.employees.salaryType"), sortable: true, render: (e) => <span className="capitalize">{t(`payroll.shared.salaryTypes.${e.salaryType}`, { defaultValue: e.salaryType })}</span> },
            { key: "baseSalary", header: t("payroll.employees.baseSalary"), sortable: true, render: (e) => formatIDR(e.baseSalary) },
            { key: "status", header: t("payroll.shared.status"), sortable: true, render: (e) => <Badge variant={e.status === "active" ? "default" : "secondary"}>{e.status === "active" ? t("payroll.shared.active") : t("payroll.shared.inactive")}</Badge> },
            {
              key: "actions",
              header: t("payroll.shared.actions"),
              className: "text-right",
              render: (e) => (
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => void remove(e.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ),
            },
          ] as Column<Employee>[]}
        />
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editId ? t("payroll.employees.edit") : t("payroll.employees.add")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("payroll.employees.employeeNo")} {!editId && <span className="text-muted-foreground text-xs">{t("payroll.employees.employeeNoHint")}</span>}</Label>
              <Input value={form.employeeNo} onChange={(e) => setForm({ ...form, employeeNo: e.target.value })} placeholder="EMP-001" />
            </div>
            <div className="space-y-2">
              <Label>{t("payroll.employees.fullName")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("payroll.employees.position")}</Label>
              <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("payroll.employees.outlet")}</Label>
              <Input value={form.outlet} onChange={(e) => setForm({ ...form, outlet: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("payroll.employees.hireDate")}</Label>
              <Input type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("payroll.employees.salaryType")}</Label>
              <Select value={form.salaryType} onValueChange={(v) => setForm({ ...form, salaryType: v as SalaryType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{t("payroll.shared.salaryTypes.monthly")}</SelectItem>
                  <SelectItem value="daily">{t("payroll.shared.salaryTypes.daily")}</SelectItem>
                  <SelectItem value="hourly">{t("payroll.shared.salaryTypes.hourly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("payroll.shared.status")}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "active" | "inactive" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("payroll.shared.active")}</SelectItem>
                  <SelectItem value="inactive">{t("payroll.shared.inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("payroll.employees.baseSalaryIdr")}</Label>
              <Input type="number" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>{t("payroll.employees.email")}</Label>
              <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("payroll.employees.phone")}</Label>
              <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("payroll.employees.overtimeRate")}</Label>
              <Input type="number" value={form.overtimeRate} onChange={(e) => setForm({ ...form, overtimeRate: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("payroll.shared.cancel")}</Button>
            <Button onClick={() => void submit()}>{t("payroll.shared.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
